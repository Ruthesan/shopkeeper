import csv, io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Product, User
from schemas import ProductCreate, ProductUpdate, ProductOut, RestockCreate
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Product).filter(Product.shop_id == current_user.shop_id).all()


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = Product(**payload.model_dump(), shop_id=current_user.shop_id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter_by(id=product_id, shop_id=current_user.shop_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter_by(id=product_id, shop_id=current_user.shop_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter_by(id=product_id, shop_id=current_user.shop_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.post("/{product_id}/restock")
def restock_product(
    product_id: int,
    payload: RestockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models import StockMovement, Alert
    product = db.query(Product).filter_by(id=product_id, shop_id=current_user.shop_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock_qty += payload.quantity
    movement = StockMovement(
        product_id=product_id,
        shop_id=current_user.shop_id,
        movement=payload.quantity,
        reason=payload.reason,
    )
    db.add(movement)
    db.query(Alert).filter_by(product_id=product_id, resolved=False).update({"resolved": True})
    db.commit()
    return {"message": "Restocked", "new_stock": product.stock_qty}


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bulk-import products from a CSV file.

    Expected columns (header row required):
      name, sku, category, unit_price, cost_price, stock_qty, reorder_threshold

    Only `name` and `unit_price` are required. All others are optional.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handles BOM from Excel exports
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    # Normalise headers — strip whitespace and lowercase
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file appears to be empty")

    required = {"name", "unit_price"}
    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = required - headers
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(missing)}. "
                   f"Found columns: {', '.join(reader.fieldnames)}"
        )

    created, skipped = 0, []

    for i, raw_row in enumerate(reader, start=2):  # row 1 is header
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items()}

        name = row.get("name", "")
        if not name:
            skipped.append({"row": i, "reason": "Empty name"})
            continue

        try:
            unit_price = float(row.get("unit_price", "0") or 0)
        except ValueError:
            skipped.append({"row": i, "reason": f"Invalid unit_price: {row.get('unit_price')}"})
            continue

        def safe_float(val):
            try:
                return float(val) if val else None
            except ValueError:
                return None

        def safe_int(val, default):
            try:
                return int(val) if val else default
            except ValueError:
                return default

        product = Product(
            shop_id=current_user.shop_id,
            name=name,
            sku=row.get("sku") or None,
            category=row.get("category") or None,
            unit_price=unit_price,
            cost_price=safe_float(row.get("cost_price", "")),
            stock_qty=safe_int(row.get("stock_qty", ""), 0),
            reorder_threshold=safe_int(row.get("reorder_threshold", ""), 10),
        )
        db.add(product)
        created += 1

    db.commit()

    return {
        "message": f"Import complete. {created} products added.",
        "created": created,
        "skipped": skipped,
    }

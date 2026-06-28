from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Product, Sale, StockMovement, Alert, User
from schemas import SaleCreate, SaleOut
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[SaleOut])
def list_sales(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Sale)
        .filter(Sale.shop_id == current_user.shop_id)
        .order_by(Sale.sold_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/", status_code=201)
def record_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter_by(
        id=payload.product_id, shop_id=current_user.shop_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.stock_qty < payload.qty_sold:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.stock_qty}"
        )

    sale = Sale(
        shop_id=current_user.shop_id,
        product_id=payload.product_id,
        qty_sold=payload.qty_sold,
        sale_price=payload.sale_price,
    )
    db.add(sale)

    product.stock_qty -= payload.qty_sold

    movement = StockMovement(
        product_id=product.id,
        shop_id=current_user.shop_id,
        movement=-payload.qty_sold,
        reason="sale",
    )
    db.add(movement)

    if product.stock_qty <= product.reorder_threshold:
        existing = db.query(Alert).filter_by(
            product_id=product.id, resolved=False
        ).first()
        if not existing:
            alert = Alert(
                shop_id=current_user.shop_id,
                product_id=product.id,
                alert_type="low_stock" if product.stock_qty > 0 else "out_of_stock",
            )
            db.add(alert)

    db.commit()
    db.refresh(sale)
    return {"message": "Sale recorded", "new_stock": product.stock_qty, "sale_id": sale.id}

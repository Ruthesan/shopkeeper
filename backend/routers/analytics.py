from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from database import get_db
from models import Product, Sale, User
from auth import get_current_user

router = APIRouter()


# ── Helper: profit calculation ────────────────────────────────────────────────
# Profit per sale row = (sale_price - cost_price) * qty_sold
# If cost_price is NULL for a product we treat it as 0 (unknown cost).
# SQLAlchemy's case() makes this a single SQL expression — no Python loops.

def _profit_expr():
    """SQLAlchemy expression for profit on one Sale row joined to its Product."""
    return (
        Sale.sale_price - func.coalesce(Product.cost_price, 0)
    ) * Sale.qty_sold


# ── /summary ──────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shop_id = current_user.shop_id
    now         = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_products = (
        db.query(func.count(Product.id))
        .filter(Product.shop_id == shop_id)
        .scalar()
    )

    # Revenue today
    revenue_today = (
        db.query(func.sum(Sale.sale_price * Sale.qty_sold))
        .filter(Sale.shop_id == shop_id, Sale.sold_at >= today_start)
        .scalar() or 0
    )

    # Revenue this month
    revenue_month = (
        db.query(func.sum(Sale.sale_price * Sale.qty_sold))
        .filter(Sale.shop_id == shop_id, Sale.sold_at >= month_start)
        .scalar() or 0
    )

    # Feature 2: Profit this month — join Sale → Product to access cost_price
    profit_month = (
        db.query(func.sum(_profit_expr()))
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.shop_id == shop_id, Sale.sold_at >= month_start)
        .scalar() or 0
    )

    # Feature 2: Profit today
    profit_today = (
        db.query(func.sum(_profit_expr()))
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.shop_id == shop_id, Sale.sold_at >= today_start)
        .scalar() or 0
    )

    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(
            Product.shop_id == shop_id,
            Product.stock_qty <= Product.reorder_threshold,
        )
        .scalar()
    )

    return {
        "total_products":  total_products,
        "revenue_today":   float(revenue_today),
        "revenue_month":   float(revenue_month),
        "profit_today":    float(profit_today),    # Feature 2 — new field
        "profit_month":    float(profit_month),    # Feature 2 — new field
        "low_stock_count": low_stock_count,
    }


# ── /revenue-chart ────────────────────────────────────────────────────────────

@router.get("/revenue-chart")
def revenue_chart(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(Sale.sold_at).label("day"),
            func.sum(Sale.sale_price * Sale.qty_sold).label("revenue"),
            func.sum(Sale.qty_sold).label("units"),
            # Feature 2: daily profit in the chart dataset
            func.sum(_profit_expr()).label("profit"),
        )
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.shop_id == current_user.shop_id, Sale.sold_at >= since)
        .group_by(func.date(Sale.sold_at))
        .order_by(func.date(Sale.sold_at))
        .all()
    )

    return [
        {
            "day":     str(r.day),
            "revenue": float(r.revenue),
            "units":   int(r.units),
            "profit":  float(r.profit),   # Feature 2 — new field
        }
        for r in rows
    ]


# ── /top-sellers ──────────────────────────────────────────────────────────────

@router.get("/top-sellers")
def top_sellers(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=30)

    rows = (
        db.query(
            Product.id,
            Product.name,
            func.sum(Sale.qty_sold).label("total_units"),
            func.sum(Sale.sale_price * Sale.qty_sold).label("total_revenue"),
            # Feature 2: total profit per product in top-sellers
            func.sum(_profit_expr()).label("total_profit"),
        )
        .join(Sale, Sale.product_id == Product.id)
        .filter(Sale.shop_id == current_user.shop_id, Sale.sold_at >= since)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(Sale.qty_sold).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "product_id":   r.id,
            "name":         r.name,
            "total_units":  int(r.total_units),
            "total_revenue": float(r.total_revenue),
            "total_profit": float(r.total_profit),  # Feature 2 — new field
        }
        for r in rows
    ]


# ── /stockout-forecast ────────────────────────────────────────────────────────

@router.get("/stockout-forecast")
def stockout_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since    = datetime.utcnow() - timedelta(days=30)
    products = db.query(Product).filter(Product.shop_id == current_user.shop_id).all()

    result = []
    for p in products:
        units_30d = (
            db.query(func.sum(Sale.qty_sold))
            .filter(Sale.product_id == p.id, Sale.sold_at >= since)
            .scalar() or 0
        )
        avg_daily = float(units_30d) / 30
        days_left = round(float(p.stock_qty) / avg_daily) if avg_daily > 0 else None
        result.append({
            "product_id":         p.id,
            "name":               p.name,
            "stock_qty":          p.stock_qty,
            "avg_daily_sales":    round(avg_daily, 2),
            "days_until_stockout": days_left,
        })

    result.sort(key=lambda x: (x["days_until_stockout"] is None, x["days_until_stockout"] or 9999))
    return result


# ── /payment-breakdown ────────────────────────────────────────────────────────
# Bonus endpoint: how much revenue came from each payment method.
# The frontend can use this whenever it wants a payment-method pie / bar.

@router.get("/payment-breakdown")
def payment_breakdown(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            Sale.payment_method,
            func.count(Sale.id).label("transaction_count"),
            func.sum(Sale.sale_price * Sale.qty_sold).label("total_revenue"),
        )
        .filter(Sale.shop_id == current_user.shop_id, Sale.sold_at >= since)
        .group_by(Sale.payment_method)
        .all()
    )

    return [
        {
            "payment_method":    r.payment_method,
            "transaction_count": int(r.transaction_count),
            "total_revenue":     float(r.total_revenue),
        }
        for r in rows
    ]

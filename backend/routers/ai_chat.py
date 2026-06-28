import os
import anthropic
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
from models import Product, Sale, User
from schemas import ChatQuestion
from auth import get_current_user

router = APIRouter()
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def build_data_context(db: Session, shop_id: int) -> str:
    since_30d = datetime.utcnow() - timedelta(days=30)
    products = db.query(Product).filter(Product.shop_id == shop_id).all()

    lines = []
    for p in products:
        units_sold = (
            db.query(func.sum(Sale.qty_sold))
            .filter(Sale.product_id == p.id, Sale.sold_at >= since_30d)
            .scalar() or 0
        )
        revenue = (
            db.query(func.sum(Sale.sale_price * Sale.qty_sold))
            .filter(Sale.product_id == p.id, Sale.sold_at >= since_30d)
            .scalar() or 0
        )
        avg_daily = float(units_sold) / 30
        days_left = round(float(p.stock_qty) / avg_daily) if avg_daily > 0 else "unknown"

        if p.stock_qty == 0:
            status = "OUT OF STOCK"
        elif p.stock_qty <= p.reorder_threshold:
            status = "LOW STOCK"
        else:
            status = "OK"

        lines.append(
            f"- {p.name} | Stock: {p.stock_qty} units | Price: ₦{p.unit_price} | "
            f"Cost: ₦{p.cost_price or 'N/A'} | Sold (30d): {units_sold} units | "
            f"Revenue (30d): ₦{float(revenue):,.0f} | Avg daily: {avg_daily:.1f} | "
            f"Days till stockout: {days_left} | Status: {status}"
        )

    return "\n".join(lines) if lines else "No products in inventory yet."


@router.post("/")
async def chat(
    payload: ChatQuestion,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = build_data_context(db, current_user.shop_id)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system="""You are a sharp, friendly business analyst for a small Nigerian shop owner.
You have access to their live inventory and sales data.
Answer questions in plain, friendly English. Be specific with numbers.
Use Naira (₦) for all currency. Keep answers under 5 sentences.
If you spot an opportunity or risk, mention it briefly.
Never make up data that is not provided.""",
        messages=[
            {
                "role": "user",
                "content": f"""Shop: {current_user.shop.name}

Current inventory and 30-day sales data:
{context}

Owner's question: {payload.question}"""
            }
        ]
    )

    return {"answer": response.content[0].text}

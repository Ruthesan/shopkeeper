from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ── Products ──────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    unit_price: Decimal
    cost_price: Optional[Decimal] = None
    stock_qty: int = 0
    reorder_threshold: int = 10
    category: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    unit_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    stock_qty: Optional[int] = None
    reorder_threshold: Optional[int] = None
    category: Optional[str] = None


class ProductOut(ProductBase):
    id: int
    shop_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sales ─────────────────────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    product_id: int
    qty_sold: int
    sale_price: Decimal


class SaleOut(BaseModel):
    id: int
    shop_id: int
    product_id: int
    qty_sold: int
    sale_price: Decimal
    sold_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ── Stock Movements ───────────────────────────────────────────────────────────

class RestockCreate(BaseModel):
    product_id: int
    quantity: int
    reason: str = "restock"


class StockMovementOut(BaseModel):
    id: int
    product_id: int
    movement: int
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    shop_id: int
    product_id: int
    alert_type: str
    resolved: bool
    created_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ── AI Chat ───────────────────────────────────────────────────────────────────

class ChatQuestion(BaseModel):
    question: str

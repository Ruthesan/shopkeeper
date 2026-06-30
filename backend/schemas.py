from pydantic import BaseModel, validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal


# ── Products ──────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name:              str
    sku:               Optional[str]     = None
    unit_price:        Decimal
    cost_price:        Optional[Decimal] = None
    stock_qty:         int               = 0
    reorder_threshold: int               = 10
    category:          Optional[str]     = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name:              Optional[str]     = None
    sku:               Optional[str]     = None
    unit_price:        Optional[Decimal] = None
    cost_price:        Optional[Decimal] = None
    stock_qty:         Optional[int]     = None
    reorder_threshold: Optional[int]     = None
    category:          Optional[str]     = None


class ProductOut(ProductBase):
    id:         int
    shop_id:    int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sales ─────────────────────────────────────────────────────────────────────

# Feature 1: accepted payment method values — validated on the way in so the
# database never receives an unexpected string.
PAYMENT_METHODS = Literal["Cash", "Bank Transfer", "POS Card"]


class SaleCreate(BaseModel):
    product_id:     int
    qty_sold:       int
    sale_price:     Decimal
    # Defaults to "Cash"; frontend sends the selected value explicitly.
    payment_method: PAYMENT_METHODS = "Cash"

    @validator("qty_sold")
    def qty_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("qty_sold must be greater than zero")
        return v

    @validator("sale_price")
    def price_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("sale_price must be greater than zero")
        return v


class SaleOut(BaseModel):
    id:             int
    shop_id:        int
    product_id:     int
    qty_sold:       int
    sale_price:     Decimal
    payment_method: str
    sold_at:        datetime
    product:        Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ── Stock Movements ───────────────────────────────────────────────────────────

class RestockCreate(BaseModel):
    product_id: int
    quantity:   int
    reason:     str = "restock"


class StockMovementOut(BaseModel):
    id:         int
    product_id: int
    movement:   int
    reason:     Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id:         int
    shop_id:    int
    product_id: int
    alert_type: str
    resolved:   bool
    created_at: datetime
    product:    Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ── AI Chat ───────────────────────────────────────────────────────────────────

class ChatQuestion(BaseModel):
    question: str

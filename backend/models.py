from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Shop(Base):
    __tablename__ = "shops"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    owner_name = Column(String(200), nullable=False)
    city       = Column(String(100), nullable=True)
    phone      = Column(String(30),  nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users    = relationship("User",    back_populates="shop")
    products = relationship("Product", back_populates="shop")
    sales    = relationship("Sale",    back_populates="shop")
    alerts   = relationship("Alert",   back_populates="shop")


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    shop_id         = Column(Integer, ForeignKey("shops.id"), nullable=False)
    email           = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    full_name       = Column(String(200), nullable=True)
    is_active       = Column(Boolean, default=True)

    # Login attempt tracking
    failed_login_attempts = Column(Integer, default=0)
    locked_until          = Column(DateTime(timezone=True), nullable=True)
    last_login_at         = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    shop = relationship("Shop", back_populates="users")


class RevokedToken(Base):
    """Stores JTIs of invalidated tokens (logout, password change, etc.)"""
    __tablename__ = "revoked_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    jti        = Column(String(64), unique=True, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id                = Column(Integer, primary_key=True, index=True)
    shop_id           = Column(Integer, ForeignKey("shops.id"), nullable=False)
    name              = Column(String(200), nullable=False)
    sku               = Column(String(50),  nullable=True)
    unit_price        = Column(Numeric(12, 2), nullable=False)
    cost_price        = Column(Numeric(12, 2), nullable=True)
    stock_qty         = Column(Integer, nullable=False, default=0)
    reorder_threshold = Column(Integer, default=10)
    category          = Column(String(100), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    shop      = relationship("Shop",          back_populates="products")
    sales     = relationship("Sale",          back_populates="product")
    movements = relationship("StockMovement", back_populates="product")
    alerts    = relationship("Alert",         back_populates="product")

    __table_args__ = (
        Index("ix_products_shop_id", "shop_id"),
    )


class Sale(Base):
    __tablename__ = "sales"

    id         = Column(Integer, primary_key=True, index=True)
    shop_id    = Column(Integer, ForeignKey("shops.id"),    nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty_sold   = Column(Integer, nullable=False)
    sale_price = Column(Numeric(12, 2), nullable=False)
    sold_at    = Column(DateTime(timezone=True), server_default=func.now())

    shop    = relationship("Shop",    back_populates="sales")
    product = relationship("Product", back_populates="sales")

    __table_args__ = (
        Index("ix_sales_shop_id_sold_at", "shop_id", "sold_at"),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id         = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    shop_id    = Column(Integer, ForeignKey("shops.id"),    nullable=False)
    movement   = Column(Integer, nullable=False)
    reason     = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="movements")


class Alert(Base):
    __tablename__ = "alerts"

    id         = Column(Integer, primary_key=True, index=True)
    shop_id    = Column(Integer, ForeignKey("shops.id"),    nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    alert_type = Column(String(50))
    resolved   = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    shop    = relationship("Shop",    back_populates="alerts")
    product = relationship("Product", back_populates="alerts")

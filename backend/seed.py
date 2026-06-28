"""
Run this ONCE after first launch to create a demo shop with sample Nigerian products.
Usage: python seed.py

It will print login credentials you can use immediately.
"""
import os
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Shop, User, Product
from auth import hash_password

Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

# Check if demo shop already exists
existing = db.query(User).filter(User.email == "demo@shopkeeper.ng").first()
if existing:
    print("Demo shop already exists. Email: demo@shopkeeper.ng | Password: demo1234")
    db.close()
    exit()

# Create shop
shop = Shop(
    name="Ade's Provisions Store",
    owner_name="Adebayo Okafor",
    city="Lagos",
    phone="08012345678",
)
db.add(shop)
db.flush()

# Create user
user = User(
    shop_id=shop.id,
    email="demo@shopkeeper.ng",
    hashed_password=hash_password("demo1234"),
    full_name="Adebayo Okafor",
)
db.add(user)
db.flush()

# Seed products
products = [
    dict(name="Indomie Chicken 70g",       sku="IND-CHK-70",  category="Noodles",    unit_price=150,   cost_price=90,   stock_qty=200, reorder_threshold=30),
    dict(name="Indomie Onion Chicken 70g",  sku="IND-ONC-70",  category="Noodles",    unit_price=150,   cost_price=90,   stock_qty=180, reorder_threshold=30),
    dict(name="Peak Milk Powder 400g",      sku="PKM-400",     category="Dairy",      unit_price=2800,  cost_price=2000, stock_qty=50,  reorder_threshold=10),
    dict(name="Milo 200g Tin",              sku="MIL-200",     category="Beverages",  unit_price=1200,  cost_price=900,  stock_qty=8,   reorder_threshold=15),
    dict(name="Sprite 60cl",               sku="SPR-60",      category="Drinks",     unit_price=400,   cost_price=280,  stock_qty=0,   reorder_threshold=20),
    dict(name="Coca-Cola 60cl",             sku="COK-60",      category="Drinks",     unit_price=400,   cost_price=280,  stock_qty=96,  reorder_threshold=24),
    dict(name="Dangote Sugar 1kg",          sku="DNG-SUG-1K",  category="Groceries",  unit_price=1400,  cost_price=1100, stock_qty=40,  reorder_threshold=10),
    dict(name="Golden Penny Semovita 1kg",  sku="GPS-1K",      category="Groceries",  unit_price=1600,  cost_price=1200, stock_qty=25,  reorder_threshold=8),
    dict(name="Omo Detergent 500g",         sku="OMO-500",     category="Household",  unit_price=1100,  cost_price=800,  stock_qty=60,  reorder_threshold=12),
    dict(name="Close-Up Toothpaste 100ml",  sku="CLU-100",     category="Toiletries", unit_price=700,   cost_price=500,  stock_qty=35,  reorder_threshold=10),
    dict(name="Titus Sardines 125g",        sku="TIT-125",     category="Canned",     unit_price=900,   cost_price=650,  stock_qty=5,   reorder_threshold=12),
    dict(name="Maggi Chicken Cubes 8g×8",   sku="MAG-CK-8",    category="Seasoning",  unit_price=200,   cost_price=140,  stock_qty=150, reorder_threshold=30),
    dict(name="Knorr Chicken 8g×4",         sku="KNR-CK-4",    category="Seasoning",  unit_price=200,   cost_price=140,  stock_qty=120, reorder_threshold=30),
    dict(name="Bigi Cola 60cl",             sku="BIG-COL-60",  category="Drinks",     unit_price=300,   cost_price=200,  stock_qty=72,  reorder_threshold=20),
    dict(name="Hollandia Yoghurt 1L",       sku="HOL-YOG-1L",  category="Dairy",      unit_price=2200,  cost_price=1700, stock_qty=18,  reorder_threshold=6),
]

for p in products:
    db.add(Product(shop_id=shop.id, **p))

db.commit()
print("=" * 50)
print("✅  Demo shop seeded successfully!")
print("=" * 50)
print(f"  Shop:     {shop.name}")
print(f"  City:     {shop.city}")
print(f"  Email:    demo@shopkeeper.ng")
print(f"  Password: demo1234")
print(f"  Products: {len(products)} added")
print("=" * 50)
db.close()

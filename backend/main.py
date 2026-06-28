from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import products, sales, alerts, analytics, ai_chat, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShopKeeper API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
app.include_router(sales.router,     prefix="/api/sales",     tags=["Sales"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["Alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_chat.router,   prefix="/api/chat",      tags=["AI Chat"])

@app.get("/")
def root():
    return {"message": "ShopKeeper API v2"}

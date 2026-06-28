from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, Shop
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    shop_name: str
    owner_name: str
    city: str | None = None
    phone: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    shop_id: int
    shop_name: str

    class Config:
        from_attributes = True


@router.post("/register", response_model=dict, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check email not already used
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create shop first
    shop = Shop(
        name=payload.shop_name,
        owner_name=payload.owner_name,
        city=payload.city,
        phone=payload.phone,
    )
    db.add(shop)
    db.flush()  # get shop.id without committing

    # Create user
    user = User(
        shop_id=shop.id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "shop_id": shop.id,
            "shop_name": shop.name,
        }
    }


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "shop_id": user.shop_id,
            "shop_name": user.shop.name,
        }
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "shop_id": current_user.shop_id,
        "shop_name": current_user.shop.name,
        "city": current_user.shop.city,
    }

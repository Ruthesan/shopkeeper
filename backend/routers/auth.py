"""
Auth router — register, login, refresh, logout, me

Security features:
  - Access token: 60 min
  - Refresh token: 30 days, rotated on every refresh
  - Login lockout: 5 failed attempts → 15 min lockout
  - Rate limiting: 10 login attempts / minute per IP
  - Token revocation on logout (JTI blacklist)
  - Password strength enforced server-side
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models import User, Shop
from auth import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token,
    verify_refresh_token, revoke_token_jti, get_current_user,
)

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES     = 15


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:      str
    password:   str
    full_name:  str
    shop_name:  str
    owner_name: str
    city:       str | None = None
    phone:      str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_response(user: User, access_token: str, refresh_token: str) -> dict:
    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "expires_in":    3600,
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": user.full_name,
            "shop_id":   user.shop_id,
            "shop_name": user.shop.name,
            "city":      user.shop.city,
        },
    }


def _check_lockout(user: User) -> None:
    if user.locked_until:
        now    = datetime.now(timezone.utc)
        locked = user.locked_until.replace(tzinfo=timezone.utc) if user.locked_until.tzinfo is None else user.locked_until
        if now < locked:
            remaining = int((locked - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Account locked for {remaining} more minute(s) due to too many failed login attempts.",
            )
        user.locked_until          = None
        user.failed_login_attempts = 0


def _record_failed(user: User, db: Session) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def _record_success(user: User, db: Session) -> None:
    user.failed_login_attempts = 0
    user.locked_until          = None
    user.last_login_at         = datetime.now(timezone.utc)
    db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
@limiter.limit("5/minute")       # max 5 registrations per minute per IP
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    err = validate_password_strength(payload.password)
    if err:
        raise HTTPException(status_code=422, detail=err)

    shop = Shop(
        name=payload.shop_name.strip(),
        owner_name=payload.owner_name.strip(),
        city=payload.city,
        phone=payload.phone,
    )
    db.add(shop)
    db.flush()

    user = User(
        shop_id=shop.id,
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _user_response(user, create_access_token(user.id), create_refresh_token(user.id))


@router.post("/login")
@limiter.limit("10/minute")      # max 10 login attempts per minute per IP
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username.lower().strip()).first()

    if not user:
        # Don't reveal that the email doesn't exist — timing-safe
        import time; time.sleep(0.3)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    _check_lockout(user)

    if not verify_password(form.password, user.hashed_password):
        _record_failed(user, db)
        attempts_left = max(0, MAX_FAILED_ATTEMPTS - (user.failed_login_attempts or 0))
        if attempts_left > 0:
            raise HTTPException(
                status_code=401,
                detail=f"Incorrect email or password. {attempts_left} attempt(s) left before account is locked.",
            )
        raise HTTPException(
            status_code=429,
            detail=f"Account locked for {LOCKOUT_MINUTES} minutes. Too many incorrect attempts.",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated.")

    _record_success(user, db)

    return _user_response(user, create_access_token(user.id), create_refresh_token(user.id))


@router.post("/refresh")
@limiter.limit("30/minute")
def refresh_token(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    """Rotate refresh token — old one is revoked, fresh pair is issued."""
    user, old_jti = verify_refresh_token(payload.refresh_token, db)
    revoke_token_jti(old_jti, db)
    return {
        "access_token":  create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type":    "bearer",
        "expires_in":    3600,
    }


@router.post("/logout")
def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke the refresh token. Access token expires naturally within 60 min."""
    try:
        _, jti = verify_refresh_token(payload.refresh_token, db)
        revoke_token_jti(jti, db)
    except HTTPException:
        pass  # already expired or invalid — logout still succeeds
    return {"message": "Logged out successfully."}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "shop_id":   current_user.shop_id,
        "shop_name": current_user.shop.name,
        "city":      current_user.shop.city,
    }

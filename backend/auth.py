"""
auth.py — Authentication utilities for ShopKeeper

Token strategy:
  - Short-lived ACCESS token  (60 min)   → sent with every API request
  - Long-lived  REFRESH token (30 days)  → used ONLY to get a new access token
  - Logout invalidates the refresh token via a DB blacklist table
  - Inactivity: frontend requests a new access token every 15 min of activity;
    if 60 min passes with no activity the access token expires and the user is
    silently refreshed once using the refresh token. After 30 days of total
    inactivity the refresh token expires and the user must log in again.
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User, RevokedToken

SECRET_KEY = os.getenv("SECRET_KEY", "shopkeeper-dev-secret-change-in-production-abc123xyz")
ALGORITHM  = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES  = 60        # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS    = 30        # 30 days

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def validate_password_strength(password: str) -> str | None:
    """Return an error message string, or None if password is strong enough."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    if not any(c.isalpha() for c in password):
        return "Password must contain at least one letter."
    return None


# ── Token creation ────────────────────────────────────────────────────────────

def _make_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload.update({
        "exp": datetime.utcnow() + expires_delta,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),   # unique token ID — enables blacklisting
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _make_token(
        {"sub": str(user_id), "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    return _make_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


# ── Token validation ──────────────────────────────────────────────────────────

def _decode_token(token: str) -> dict:
    """Decode and return payload, or raise HTTPException 401."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = _decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type.")

    # Check token not revoked
    jti = payload.get("jti")
    if jti and db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
        raise HTTPException(status_code=401, detail="Session has been revoked. Please log in again.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed token.")

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found or deactivated.")

    return user


def verify_refresh_token(token: str, db: Session) -> User:
    """Validate a refresh token and return the user. Raises 401 on any failure."""
    payload = _decode_token(token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type.")

    jti = payload.get("jti")
    if jti and db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
        raise HTTPException(status_code=401, detail="Refresh token has been revoked. Please log in again.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return user, jti


def revoke_token_jti(jti: str, db: Session) -> None:
    """Add a token JTI to the revocation table."""
    if jti:
        db.add(RevokedToken(jti=jti))
        db.commit()

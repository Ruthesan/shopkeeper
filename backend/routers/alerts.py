from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Alert, User
from schemas import AlertOut
from auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[AlertOut])
def list_alerts(
    resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Alert)
        .filter(Alert.shop_id == current_user.shop_id, Alert.resolved == resolved)
        .order_by(Alert.created_at.desc())
        .all()
    )


@router.patch("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter_by(id=alert_id, shop_id=current_user.shop_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()
    return {"message": "Alert resolved"}

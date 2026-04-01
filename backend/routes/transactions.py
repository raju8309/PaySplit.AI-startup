from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models.split_transaction import SplitTransaction
from routes.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("/history")
def get_transaction_history(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    txns = (
        db.query(SplitTransaction)
        .filter(SplitTransaction.user_id == str(current_user.id))
        .order_by(SplitTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"transactions": [t.to_dict() for t in txns]}

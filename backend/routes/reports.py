import csv
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db import get_db
from models.expense import Expense
from models.payment import Payment

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/expenses.csv")
def export_expenses_csv(
    db: Session = Depends(get_db),
):
    """
    Export all expenses to CSV.
    (No group_id filter possible yet because Expense has no group_id column.)
    """
    rows = db.query(Expense).order_by(Expense.created_at.desc()).all()

    def generate():
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "description", "amount_cents", "payer_id", "created_at"])

        for e in rows:
            writer.writerow([e.id, e.description, e.amount_cents, e.payer_id, e.created_at])
        yield buf.getvalue()

    headers = {"Content-Disposition": "attachment; filename=expenses.csv"}
    return StreamingResponse(generate(), media_type="text/csv", headers=headers)


@router.get("/payments.csv")
def export_payments_csv(
    group_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None, description="pending|paid|failed"),
    db: Session = Depends(get_db),
):
    """
    Export payments to CSV with optional filters.
    """
    q = db.query(Payment).order_by(Payment.created_at.desc())

    if group_id:
        q = q.filter(Payment.group_id == group_id)
    if status:
        q = q.filter(Payment.status == status)

    rows = q.all()

    def generate():
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "id",
                "from_user",
                "to_user",
                "amount_cents",
                "currency",
                "status",
                "stripe_session_id",
                "group_id",
                "settlement_ref",
                "created_at",
                "updated_at",
            ]
        )

        for p in rows:
            writer.writerow(
                [
                    p.id,
                    p.from_user,
                    p.to_user,
                    p.amount_cents,
                    p.currency,
                    p.status,
                    p.stripe_session_id,
                    p.group_id,
                    p.settlement_ref,
                    p.created_at,
                    p.updated_at,
                ]
            )
        yield buf.getvalue()

    headers = {"Content-Disposition": "attachment; filename=payments.csv"}
    return StreamingResponse(generate(), media_type="text/csv", headers=headers)
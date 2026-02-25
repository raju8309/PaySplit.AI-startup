from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from models.expense import Expense
from models.payment import Payment
from models.group import Group

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _parse_date(s: Optional[str]) -> Optional[datetime]:
    """
    Accepts YYYY-MM-DD. Returns datetime at start of day (UTC-ish).
    """
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d")


def _date_range_defaults(start: Optional[datetime], end: Optional[datetime]) -> (datetime, datetime):
    """
    Default to last 30 days if not provided.
    End is exclusive end-of-day by adding 1 day if date-only.
    """
    if end is None:
        end = datetime.utcnow()
    if start is None:
        start = end - timedelta(days=30)
    return start, end


@router.get("/summary")
def analytics_summary(
    start: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    group_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    KPI summary for dashboard:
    - total_groups
    - total_expenses_count, total_expenses_amount_cents
    - total_payments_count, total_payments_paid_cents
    - net_balance_cents for a given user (optional via user_id query)
      NOTE: since you don't store splits in DB yet, net balance can be derived only from payments,
            so we return payments-based net if user_id is provided.
    """
    start_dt = _parse_date(start)
    end_dt = _parse_date(end)
    start_dt, end_dt = _date_range_defaults(start_dt, end_dt)

    # Groups count
    total_groups = db.query(func.count(Group.id)).scalar() or 0

    # Expenses filters
    exp_q = db.query(Expense).filter(Expense.created_at >= start_dt, Expense.created_at <= end_dt)
    if group_id:
        # Expense model currently has no group_id, so we cannot filter by group_id.
        # Keep this here for future schema upgrade.
        pass

    total_expenses_count = exp_q.count()
    total_expenses_amount_cents = (
        db.query(func.coalesce(func.sum(Expense.amount_cents), 0))
        .filter(Expense.created_at >= start_dt, Expense.created_at <= end_dt)
        .scalar()
        or 0
    )

    # Payments filters
    pay_q = db.query(Payment).filter(Payment.created_at >= start_dt, Payment.created_at <= end_dt)
    if group_id:
        pay_q = pay_q.filter(Payment.group_id == group_id)

    total_payments_count = pay_q.count()
    total_payments_paid_cents = (
        db.query(func.coalesce(func.sum(Payment.amount_cents), 0))
        .filter(
            Payment.created_at >= start_dt,
            Payment.created_at <= end_dt,
            Payment.status == "paid",
        )
        .scalar()
        or 0
    )

    return {
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
        "total_groups": total_groups,
        "total_expenses_count": total_expenses_count,
        "total_expenses_amount_cents": int(total_expenses_amount_cents),
        "total_payments_count": total_payments_count,
        "total_payments_paid_cents": int(total_payments_paid_cents),
        "notes": [
            "Expense model currently has no group_id/category; charts will be limited until schema expands.",
            "Payments are DB-backed and support group_id and status filters.",
        ],
    }


@router.get("/monthly-spend")
def monthly_spend(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """
    Monthly spend trend based on Expenses.amount_cents.
    Since expenses table has no group_id/category yet, this is global trend.
    """
    # For SQLite compatibility: group by YYYY-MM
    # Using strftime works in SQLite; for Postgres you'd use date_trunc.
    rows = (
        db.query(
            func.strftime("%Y-%m", Expense.created_at).label("month"),
            func.coalesce(func.sum(Expense.amount_cents), 0).label("total_cents"),
            func.count(Expense.id).label("count"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    # Return only last N months (simple slice)
    rows = rows[-months:] if len(rows) > months else rows

    return {
        "months": months,
        "points": [
            {"month": r.month, "total_cents": int(r.total_cents), "count": int(r.count)}
            for r in rows
        ],
    }


@router.get("/payments-by-status")
def payments_by_status(
    start: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    group_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Breakdown of payments by status (pending/paid/failed).
    Useful for dashboard donut chart.
    """
    start_dt = _parse_date(start)
    end_dt = _parse_date(end)
    start_dt, end_dt = _date_range_defaults(start_dt, end_dt)

    q = db.query(Payment).filter(Payment.created_at >= start_dt, Payment.created_at <= end_dt)
    if group_id:
        q = q.filter(Payment.group_id == group_id)

    rows = (
        db.query(
            Payment.status.label("status"),
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount_cents), 0).label("amount_cents"),
        )
        .filter(Payment.created_at >= start_dt, Payment.created_at <= end_dt)
        .group_by(Payment.status)
        .all()
    )

    return {
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
        "group_id": group_id,
        "breakdown": [
            {"status": r.status, "count": int(r.count), "amount_cents": int(r.amount_cents)}
            for r in rows
        ],
    }


@router.get("/recent-activity")
def recent_activity(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Recent activity feed mixing Expenses + Payments.
    """
    expenses = (
        db.query(Expense)
        .order_by(Expense.created_at.desc())
        .limit(limit)
        .all()
    )

    payments = (
        db.query(Payment)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .all()
    )

    # Normalize into activity items
    activity: List[Dict[str, Any]] = []

    for e in expenses:
        activity.append(
            {
                "type": "expense",
                "id": e.id,
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "title": e.description,
                "amount_cents": e.amount_cents,
                "meta": {"payer_id": e.payer_id},
            }
        )

    for p in payments:
        activity.append(
            {
                "type": "payment",
                "id": p.id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "title": f"{p.from_user} → {p.to_user}",
                "amount_cents": p.amount_cents,
                "meta": {
                    "status": p.status,
                    "currency": p.currency,
                    "group_id": p.group_id,
                    "settlement_ref": p.settlement_ref,
                },
            }
        )

    # Sort by created_at desc, handle None safely
    activity.sort(key=lambda x: x["created_at"] or "", reverse=True)
    activity = activity[:limit]

    return {"limit": limit, "items": activity}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.settlement_service import calculate_balances, minimize_transactions, ai_optimize_split, compare_splits
from utils.money import dollars_to_cents

router = APIRouter(prefix="/api/settlements", tags=["Settlements"])


class SplitItem(BaseModel):
    user: str
    amount: Optional[float] = None
    percentage: Optional[float] = None


class ExpenseIn(BaseModel):
    payer: str
    amount: float
    members: List[str]
    split_type: str = "equal"
    splits: Optional[List[SplitItem]] = None


class SettlementRequest(BaseModel):
    expenses: List[ExpenseIn]


class CardIn(BaseModel):
    name: str
    limit_cents: int = 100000


class OptimizeRequest(BaseModel):
    total: float
    merchant: str = "general"
    cards: List[CardIn]


@router.post("/calculate")
def calculate(req: SettlementRequest):
    try:
        formatted_expenses = []
        for e in req.expenses:
            expense = {
                "payer": e.payer,
                "amount_cents": dollars_to_cents(e.amount),
                "members": e.members,
                "split_type": e.split_type,
            }
            if e.splits:
                expense["splits"] = [
                    {
                        "user": s.user,
                        "amount_cents": dollars_to_cents(s.amount) if s.amount is not None else 0,
                        "percentage": s.percentage,
                    }
                    for s in e.splits
                ]
            formatted_expenses.append(expense)

        balances = calculate_balances(formatted_expenses)
        txs = minimize_transactions(balances)
        return {
            "balances_cents": balances,
            "transactions": txs
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    try:
        total_cents = dollars_to_cents(req.total)
        cards = [{"name": c.name, "limit_cents": c.limit_cents} for c in req.cards]
        result = ai_optimize_split(total_cents, cards, req.merchant)
        comparison = compare_splits(total_cents, cards, req.merchant)
        return {**result, "comparison": comparison}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
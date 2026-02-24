from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import sys
import os

# Add ml/models directory DIRECTLY to path to avoid conflict with backend/models
ml_models_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'ml', 'models'))
sys.path.insert(0, ml_models_path)

from card_recommender import CardRecommender
from transaction_categorizer import TransactionCategorizer

router = APIRouter(prefix="/api/ml", tags=["ML"])

# Initialize ML models
card_recommender = CardRecommender()
transaction_categorizer = TransactionCategorizer()


class Card(BaseModel):
    id: int
    name: str
    limit: float
    balance: float
    rewards_rate: float = 0.01
    category_multipliers: Dict[str, float] = {}


class RecommendRequest(BaseModel):
    transaction_amount: float
    cards: List[Card]
    free_trial: bool = False
    merchant: Optional[str] = None


class CategorizeRequest(BaseModel):
    description: str


@router.post("/recommend")
def recommend_allocation(request: RecommendRequest):
    """AI-powered card allocation with rewards optimization"""
    try:
        cards_dict = [card.model_dump() for card in request.cards]
        result = card_recommender.recommend(
            transaction_amount=request.transaction_amount,
            cards=cards_dict,
            free_trial=request.free_trial,
            merchant=request.merchant,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categorize")
def categorize_transaction(request: CategorizeRequest):
    """AI-powered transaction categorization"""
    try:
        category, confidence = transaction_categorizer.categorize(request.description)
        return {
            "description": request.description,
            "category": category,
            "confidence": confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.card_recommender import CardRecommender
from models.transaction_categorizer import TransactionCategorizer

app = FastAPI(title="PaySplit.ai ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

card_recommender = CardRecommender()
transaction_categorizer = TransactionCategorizer()

class Card(BaseModel):
    id: int
    name: str
    limit: float
    balance: float

class RecommendRequest(BaseModel):
    transaction_amount: float
    cards: List[Card]
    free_trial: bool = False

class CategorizeRequest(BaseModel):
    description: str

@app.get("/")
def root():
    return {"message": "PaySplit.ai ML API", "status": "running"}

@app.post("/ml/recommend")
def recommend_allocation(request: RecommendRequest):
    try:
        cards_dict = [card.model_dump() for card in request.cards]
        result = card_recommender.recommend(
            transaction_amount=request.transaction_amount,
            cards=cards_dict,
            free_trial=request.free_trial
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ml/categorize")
def categorize_transaction(request: CategorizeRequest):
    try:
        category, confidence = transaction_categorizer.categorize(request.description)
        return {
            "description": request.description,
            "category": category,
            "confidence": confidence
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

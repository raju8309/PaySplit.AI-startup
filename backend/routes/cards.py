from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from db import get_db
from models.card import Card as DBCard  # Rename to avoid conflict
import sys
import os

# Add paths
backend_utils_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'utils')
sys.path.insert(0, backend_utils_path)

ml_models_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'ml', 'models'))
sys.path.insert(0, ml_models_path)

from csv_parser import BankCSVParser
from transaction_categorizer import TransactionCategorizer

router = APIRouter(prefix="/api/cards", tags=["Cards"])

class CardCreate(BaseModel):
    name: str
    card_type: str = "Visa"
    last_four: str = None
    limit: float
    balance: float = 0.0
    rewards_rate: float = 0.01
    category_multipliers: dict = {}
    color: str = "#3B82F6"
    icon: str = "💳"

class CardUpdate(BaseModel):
    name: str = None
    card_type: str = None
    last_four: str = None
    limit: float = None
    balance: float = None
    rewards_rate: float = None
    category_multipliers: dict = None
    is_active: bool = None
    is_preferred: bool = None
    color: str = None
    icon: str = None

@router.get("/")
def get_cards(db: Session = Depends(get_db)):
    """Get all cards"""
    try:
        cards = db.query(DBCard).filter(DBCard.is_active == True).all()
        return [card.to_dict() for card in cards]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{card_id}")
def get_card(card_id: int, db: Session = Depends(get_db)):
    """Get a specific card"""
    card = db.query(DBCard).filter(DBCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card.to_dict()

@router.post("/")
def create_card(card_data: CardCreate, db: Session = Depends(get_db)):
    """Create a new card"""
    try:
        new_card = DBCard(
            name=card_data.name,
            card_type=card_data.card_type,
            last_four=card_data.last_four,
            limit=card_data.limit,
            balance=card_data.balance,
            rewards_rate=card_data.rewards_rate,
            category_multipliers=card_data.category_multipliers,
            color=card_data.color,
            icon=card_data.icon
        )
        db.add(new_card)
        db.commit()
        db.refresh(new_card)
        return new_card.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{card_id}")
def update_card(card_id: int, card_data: CardUpdate, db: Session = Depends(get_db)):
    """Update a card"""
    card = db.query(DBCard).filter(DBCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    try:
        update_data = card_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(card, key, value)
        
        db.commit()
        db.refresh(card)
        return card.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db)):
    """Delete a card (soft delete)"""
    card = db.query(DBCard).filter(DBCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    try:
        card.is_active = False
        db.commit()
        return {"message": f"Card {card.name} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed")
def seed_demo_cards(db: Session = Depends(get_db)):
    """Add demo cards for testing"""
    try:
        db.query(DBCard).delete()
        
        demo_cards = [
            DBCard(
                name="Chase Sapphire Preferred",
                card_type="Visa",
                last_four="4321",
                limit=2000,
                balance=500,
                rewards_rate=0.02,
                category_multipliers={"Food & Dining": 0.03, "Travel": 0.05},
                color="#0047AB",
                icon="💎"
            ),
            DBCard(
                name="AmEx Gold",
                card_type="American Express",
                last_four="8765",
                limit=1500,
                balance=200,
                rewards_rate=0.01,
                category_multipliers={"Food & Dining": 0.04, "Shopping": 0.02},
                color="#D4AF37",
                icon="🏆"
            ),
            DBCard(
                name="Capital One Quicksilver",
                card_type="Mastercard",
                last_four="5555",
                limit=1000,
                balance=800,
                rewards_rate=0.015,
                category_multipliers={},
                color="#E53E3E",
                icon="💳"
            )
        ]
        
        db.add_all(demo_cards)
        db.commit()
        return {"message": "Demo cards seeded successfully", "count": len(demo_cards)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload bank CSV to auto-create card"""
    try:
        content = await file.read()
        file_content = content.decode('utf-8')
        
        parser = BankCSVParser()
        parsed_data = parser.auto_detect_format(file_content)
        suggestions = parser.suggest_card_details(parsed_data['transactions'])
        
        categorizer = TransactionCategorizer()
        categorized_transactions = []
        
        for txn in parsed_data['transactions'][:50]:
            category, confidence = categorizer.categorize(txn['description'])
            categorized_transactions.append({
                **txn,
                'ml_category': category,
                'confidence': confidence
            })
        
        category_spending = {}
        for txn in categorized_transactions:
            cat = txn['ml_category']
            if cat not in category_spending:
                category_spending[cat] = 0
            category_spending[cat] += txn['amount']
        
        return {
            'success': True,
            'card_suggestions': {
                'name': suggestions['suggested_name'],
                'card_type': parsed_data['card_type'],
                'limit': suggestions['suggested_limit'],
                'balance': suggestions['suggested_balance'],
                'rewards_rate': 0.01
            },
            'transaction_count': suggestions['transaction_count'],
            'category_breakdown': category_spending,
            'sample_transactions': categorized_transactions[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")

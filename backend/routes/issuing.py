# backend/routes/issuing.py
# PaySplit AI - Stripe Issuing Integration
# Handles virtual card creation, management, and split webhook

import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
import os
import json
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/issuing", tags=["Issuing"])

# ── Stripe setup ─────────────────────────────────────────────────────────────

# ── Request Models ────────────────────────────────────────────────────────────
class CreateCardholderRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address_line1: str = "123 Main St"
    address_city: str = "Manchester"
    address_state: str = "NH"
    address_postal_code: str = "03101"
    address_country: str = "US"

class CreateVirtualCardRequest(BaseModel):
    cardholder_id: str
    spending_limit: Optional[int] = 250000  # in cents = $2500

class SplitPreference(BaseModel):
    card_id: int        # PaySplit card ID
    card_name: str
    percentage: float   # e.g. 0.6 = 60%

class UpdateSplitRequest(BaseModel):
    virtual_card_id: str
    splits: List[SplitPreference]

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/cardholder/create")
async def create_cardholder(req: CreateCardholderRequest):
    """Create a Stripe Issuing cardholder for a PaySplit user"""
    try:
        s = stripe
        cardholder = s.issuing.Cardholder.create(
            name=req.name,
            email=req.email,
            phone_number=req.phone or "+16035550123",
            type="individual",
            billing={
                "address": {
                    "line1": req.address_line1,
                    "city": req.address_city,
                    "state": req.address_state,
                    "postal_code": req.address_postal_code,
                    "country": req.address_country,
                }
            },
        )
        return {
            "cardholder_id": cardholder.id,
            "name": cardholder.name,
            "email": cardholder.email,
            "status": cardholder.status,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/card/create")
async def create_virtual_card(req: CreateVirtualCardRequest):
    """Issue a virtual card to a cardholder"""
    try:
        s = stripe
        card = s.issuing.Card.create(
            cardholder=req.cardholder_id,
            type="virtual",
            currency="usd",
            status="active",
            spending_controls={
                "spending_limits": [
                    {
                        "amount": req.spending_limit,
                        "interval": "per_authorization",
                    }
                ]
            },
        )
        return {
            "card_id": card.id,
            "last4": card.last4,
            "exp_month": card.exp_month,
            "exp_year": card.exp_year,
            "status": card.status,
            "cardholder_id": card.cardholder,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/card/{card_id}")
async def get_card_details(card_id: str):
    """Get virtual card details including full number (test mode only)"""
    try:
        s = stripe
        card = s.issuing.Card.retrieve(
            card_id,
            expand=["number", "cvc"],
        )
        return {
            "card_id": card.id,
            "number": card.number,        # full 16-digit number
            "cvc": card.cvc,
            "last4": card.last4,
            "exp_month": card.exp_month,
            "exp_year": card.exp_year,
            "status": card.status,
            "cardholder": card.cardholder,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cards")
async def list_cards():
    """List all issued virtual cards"""
    try:
        s = stripe
        cards = s.issuing.Card.list(limit=20)
        return {
            "cards": [
                {
                    "card_id": c.id,
                    "last4": c.last4,
                    "exp_month": c.exp_month,
                    "exp_year": c.exp_year,
                    "status": c.status,
                    "cardholder": c.cardholder,
                }
                for c in cards.data
            ]
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/card/{card_id}/freeze")
async def freeze_card(card_id: str):
    """Freeze a virtual card"""
    try:
        s = stripe
        card = s.issuing.Card.modify(card_id, status="inactive")
        return {"card_id": card.id, "status": card.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/card/{card_id}/unfreeze")
async def unfreeze_card(card_id: str):
    """Unfreeze a virtual card"""
    try:
        s = stripe
        card = s.issuing.Card.modify(card_id, status="active")
        return {"card_id": card.id, "status": card.status}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Split Preferences (stored in memory for now, use DB in production) ────────
_split_preferences = {}  # card_id -> list of SplitPreference

@router.post("/card/{card_id}/splits")
async def update_split_preferences(card_id: str, req: UpdateSplitRequest):
    """Save how the user wants to split charges on this virtual card"""
    total_pct = sum(s.percentage for s in req.splits)
    if abs(total_pct - 1.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Split percentages must add up to 100%. Got {total_pct * 100:.1f}%"
        )
    _split_preferences[card_id] = [s.model_dump() for s in req.splits]
    return {"card_id": card_id, "splits": _split_preferences[card_id]}


@router.get("/card/{card_id}/splits")
async def get_split_preferences(card_id: str):
    """Get split preferences for a virtual card"""
    splits = _split_preferences.get(card_id, [])
    return {"card_id": card_id, "splits": splits}


# ── Stripe Webhook — handles real-time authorization ─────────────────────────
@router.post("/webhook")
async def stripe_issuing_webhook(request: Request):
    """
    Stripe sends every card authorization here in real time.
    We approve/decline based on fraud check, then log the split.
    
    In test mode: respond within 2 seconds to approve/decline.
    In live mode: respond within 2 seconds or Stripe auto-approves.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_ISSUING_WEBHOOK_SECRET", "")

    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event.get("type") or event.get("object", {}).get("object")

    # ── Real-time authorization request ──────────────────────────────────────
    if event_type == "issuing_authorization.request":
        auth = event["data"]["object"]
        amount = auth["amount"]           # in cents
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"]
        
        # Get split preferences for this card
        splits = _split_preferences.get(card_id, [])
        
        # Log the authorization with split info
        print(f"[Issuing] Authorization: ${amount/100:.2f} at {merchant}")
        print(f"[Issuing] Card: {card_id}")
        print(f"[Issuing] Splits: {splits}")
        
        # Approve the transaction
        # In production: run fraud check here first
        s = stripe
        s.issuing.Authorization.approve(auth["id"])
        
        return {"approved": True, "amount": amount, "merchant": merchant}

    # ── Authorization created (after approval) ────────────────────────────────
    if event_type == "issuing_authorization.created":
        auth = event["data"]["object"]
        amount = auth["amount"]
        merchant = auth["merchant_data"]["name"]
        card_id = auth["card"]
        splits = _split_preferences.get(card_id, [])
        
        print(f"[Issuing] Charge approved: ${amount/100:.2f} at {merchant}")
        
        # Here you would charge each linked card their portion
        # e.g. for split in splits: charge_real_card(split.card_id, amount * split.percentage)
        # This requires Plaid or Stripe Connect to charge external cards
        
        return {"status": "logged", "splits": splits}

    return {"status": "ignored", "type": event_type}
# backend/routes/multi_person_splits.py
# PaySplit AI - Multi-Person Split Endpoints

import os
import uuid
import secrets
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal
from models.split_transaction import SplitTransaction, SplitParticipant, SplitInvitation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/splits", tags=["Multi-Person Splits"])


# ── Dependency ─────────────────────────────────────────────────────────────
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic Models ────────────────────────────────────────────────────────

class ParticipantInput(BaseModel):
    user_id: str
    email: str
    name: str = "Friend"
    amount_cents: int
    card_id: str


class CreateMultiPersonSplitRequest(BaseModel):
    virtual_card_id: str
    merchant: str
    total_amount_cents: int
    participants: list


class ApproveMultiPersonSplitRequest(BaseModel):
    token: str
    plaid_access_token: str = None
    plaid_account_id: str = None


# ── Endpoint 1: Create Multi-Person Split ──────────────────────────────────

@router.post("/create-multi-person")
async def create_multi_person_split(
    req: CreateMultiPersonSplitRequest,
    db: Session = Depends(get_db)
):
    """
    Person A initiates a multi-person split payment
    
    Creates:
    1. SplitTransaction (split_type="multi_person", status="pending")
    2. SplitParticipant for each person (status="pending")
    3. SplitInvitation for each non-initiator (sends approval email link)
    """
    try:
        # Validate: amounts sum correctly
        total_from_participants = sum(p["amount_cents"] for p in req.participants)
        if total_from_participants != req.total_amount_cents:
            raise HTTPException(
                status_code=400,
                detail=f"Amounts don't match: {total_from_participants} vs {req.total_amount_cents}"
            )

        # Validate: at least 2 participants
        if len(req.participants) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 participants")

        # Create SplitTransaction
        split_id = str(uuid.uuid4())
        split_txn = SplitTransaction(
            id=split_id,
            virtual_card_id=req.virtual_card_id,
            stripe_card_id=req.virtual_card_id,
            merchant=req.merchant,
            total_amount_cents=req.total_amount_cents,
            card_name="Multi-Person Split",
            card_amount_cents=req.total_amount_cents,
            percentage=1.0,
            status="pending",
            split_type="multi_person"  # ← KEY FIELD
        )
        db.add(split_txn)
        db.flush()

        # Create SplitParticipant for each person
        participants_data = []
        for p in req.participants:
            participant_id = str(uuid.uuid4())
            participant = SplitParticipant(
                id=participant_id,
                split_transaction_id=split_id,
                user_id=p["user_id"],
                card_id=p["card_id"],
                amount_cents=p["amount_cents"],
                percentage=p["amount_cents"] / req.total_amount_cents,
                status="pending"
            )
            db.add(participant)
            db.flush()

            # Create invitation (send approval link)
            approval_token = secrets.token_urlsafe(32)
            invitation = SplitInvitation(
                id=str(uuid.uuid4()),
                split_participant_id=participant_id,
                invitee_email=p["email"],
                invitee_name=p.get("name", "Friend"),
                token=approval_token,
                token_expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            db.add(invitation)
            db.flush()

            approval_link = f"{os.getenv('FRONTEND_URL')}/splits/approve/{approval_token}"
            participants_data.append({
                "user_id": p["user_id"],
                "email": p["email"],
                "amount_cents": p["amount_cents"],
                "percentage": f"{participant.percentage * 100:.1f}%",
                "status": "pending",
                "approval_link": approval_link
            })

            # TODO: Send email with approval_link
            logger.info(f"[Split] Created for {p['email']}: {approval_link}")

        db.commit()

        return {
            "split_id": split_id,
            "status": "pending",
            "total_amount_cents": req.total_amount_cents,
            "merchant": req.merchant,
            "participants": participants_data
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[Split] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint 2: Approve Multi-Person Split ─────────────────────────────────

@router.post("/approve")
async def approve_multi_person_split(
    req: ApproveMultiPersonSplitRequest,
    db: Session = Depends(get_db)
):
    """
    Person B approves the split via email link
    
    Updates SplitParticipant status to "approved"
    If ALL participants approved → split ready for payment
    """
    try:
        # Find invitation by token
        invitation = db.query(SplitInvitation).filter(
            SplitInvitation.token == req.token,
            SplitInvitation.token_expires_at > datetime.utcnow()
        ).first()

        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid or expired link")

        # Get participant
        participant = db.query(SplitParticipant).filter(
            SplitParticipant.id == invitation.split_participant_id
        ).first()

        if not participant:
            raise HTTPException(status_code=400, detail="Participant not found")

        # Update participant
        participant.status = "approved"
        participant.approved_at = datetime.utcnow()

        # Store Plaid credentials if provided
        if req.plaid_access_token and req.plaid_account_id:
            participant.plaid_access_token = req.plaid_access_token
            participant.plaid_account_id = req.plaid_account_id

        # Mark invitation as clicked
        invitation.approval_clicked_at = datetime.utcnow()

        db.commit()

        # Check if ALL participants approved
        split_id = participant.split_transaction_id
        all_participants = db.query(SplitParticipant).filter(
            SplitParticipant.split_transaction_id == split_id
        ).all()

        all_approved = all(p.status == "approved" for p in all_participants)

        if all_approved:
            logger.info(f"[Split] All approved: {split_id}")
            return {
                "status": "approved",
                "message": "All participants approved! Ready for payment.",
                "split_id": split_id,
                "all_approved": True
            }
        else:
            pending = sum(1 for p in all_participants if p.status == "pending")
            return {
                "status": "approved",
                "message": f"Waiting for {pending} more participant(s)...",
                "split_id": split_id,
                "all_approved": False,
                "pending_count": pending
            }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[Split] Approval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint 3: Get Pending Splits ────────────────────────────────────────

@router.get("/pending/{user_id}")
async def get_pending_splits(user_id: str, db: Session = Depends(get_db)):
    """Get all pending split approvals for a user"""
    try:
        pending = db.query(SplitParticipant).filter(
            SplitParticipant.user_id == user_id,
            SplitParticipant.status == "pending"
        ).all()

        result = []
        for p in pending:
            split = db.query(SplitTransaction).filter(
                SplitTransaction.id == p.split_transaction_id
            ).first()

            if split:
                result.append({
                    "participant_id": p.id,
                    "split_id": split.id,
                    "merchant": split.merchant,
                    "your_amount": p.amount_cents / 100,
                    "total_amount": split.total_amount_cents / 100,
                    "invited_at": p.invited_at.isoformat() if p.invited_at else None
                })

        return {"pending_splits": result, "count": len(result)}

    except Exception as e:
        logger.error(f"[Split] Get pending error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint 4: Get Split Details ──────────────────────────────────────────

@router.get("/{split_id}")
async def get_split_details(split_id: str, db: Session = Depends(get_db)):
    """Get details of a split"""
    try:
        split = db.query(SplitTransaction).filter(
            SplitTransaction.id == split_id
        ).first()

        if not split:
            raise HTTPException(status_code=404, detail="Split not found")

        participants = db.query(SplitParticipant).filter(
            SplitParticipant.split_transaction_id == split_id
        ).all()

        participant_list = [
            {
                "user_id": p.user_id,
                "amount": p.amount_cents / 100,
                "percentage": f"{p.percentage * 100:.1f}%",
                "status": p.status
            }
            for p in participants
        ]

        all_approved = all(p.status == "approved" for p in participants)

        return {
            "split_id": split.id,
            "merchant": split.merchant,
            "total_amount": split.total_amount_cents / 100,
            "status": split.status,
            "participants": participant_list,
            "all_approved": all_approved,
            "created_at": split.created_at.isoformat() if split.created_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Split] Get details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
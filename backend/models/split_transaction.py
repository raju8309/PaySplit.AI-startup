import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.sql import func
from models import Base


class SplitTransaction(Base):
    __tablename__ = "split_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    stripe_card_id = Column(String, nullable=False)
    merchant = Column(String, nullable=True)
    total_amount_cents = Column(Integer, nullable=False)
    card_name = Column(String, nullable=False)
    card_amount_cents = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    status = Column(String, default="logged")  # logged | executed | failed | pending | completed | partial
    
    # ── NEW FIELDS FOR MULTI-PERSON SPLITS ──────────────────────────────
    split_type = Column(String, default="single_user")  # single_user | multi_person
    virtual_card_id = Column(String, nullable=True)     # Used for multi-person lookup
    # ────────────────────────────────────────────────────────────────────
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "merchant": self.merchant,
            "total_amount": self.total_amount_cents / 100,
            "card_name": self.card_name,
            "card_amount": self.card_amount_cents / 100,
            "percentage": self.percentage,
            "status": self.status,
            "split_type": self.split_type,  # NEW
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ────────────────────────────────────────────────────────────────────────────
# NEW MODEL: SplitParticipant
# ────────────────────────────────────────────────────────────────────────────

class SplitParticipant(Base):
    """
    Represents one person's contribution to a multi-person split payment.
    
    Example:
    - Split ID: abc-123 (total $70 payment)
    - Participant 1: Person A, $3000 cents, status=charged
    - Participant 2: Person B, $4000 cents, status=pending
    """
    __tablename__ = "split_participants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Keys
    split_transaction_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    card_id = Column(String, nullable=False)
    
    # Amount & Percentage
    amount_cents = Column(Integer, nullable=False)  # $40 = 4000
    percentage = Column(Float, nullable=False)      # 57.14%
    
    # Status
    status = Column(String, default="pending", index=True)  
    # Status values: pending | approved | charged | failed | declined
    
    # Plaid Credentials (for ACH)
    plaid_access_token = Column(String, nullable=True)
    plaid_account_id = Column(String, nullable=True)
    
    # Timestamps
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    charged_at = Column(DateTime(timezone=True), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    
    # Tracking
    decline_reason = Column(String, nullable=True)
    plaid_transfer_id = Column(String, nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "split_transaction_id": self.split_transaction_id,
            "user_id": self.user_id,
            "amount_cents": self.amount_cents,
            "amount_dollars": self.amount_cents / 100,
            "percentage": self.percentage,
            "status": self.status,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "charged_at": self.charged_at.isoformat() if self.charged_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ────────────────────────────────────────────────────────────────────────────
# NEW MODEL: SplitInvitation
# ────────────────────────────────────────────────────────────────────────────

class SplitInvitation(Base):
    """
    Email invitation sent to a participant to approve a multi-person split.
    Tracks approval links and expiration.
    """
    __tablename__ = "split_invitations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Key
    split_participant_id = Column(String, nullable=False, index=True)
    
    # Invitation Details
    invitee_email = Column(String, nullable=False, index=True)
    invitee_name = Column(String, nullable=True)
    
    # Approval Link
    token = Column(String, unique=True, nullable=False, index=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Status
    invitation_sent_at = Column(DateTime(timezone=True), server_default=func.now())
    approval_clicked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "split_participant_id": self.split_participant_id,
            "invitee_email": self.invitee_email,
            "invitee_name": self.invitee_name,
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "approval_clicked_at": self.approval_clicked_at.isoformat() if self.approval_clicked_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
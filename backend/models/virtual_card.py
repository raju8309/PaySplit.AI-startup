from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from models import Base


class VirtualCard(Base):
    """Stores Stripe Issuing virtual card per user"""
    __tablename__ = "virtual_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    # Stripe Issuing fields
    stripe_card_id = Column(String, unique=True, nullable=False)       # ic_xxx
    stripe_cardholder_id = Column(String, nullable=True)               # ich_xxx
    last4 = Column(String(4), nullable=True)
    exp_month = Column(Integer, nullable=True)
    exp_year = Column(Integer, nullable=True)
    status = Column(String, default="active")                          # active / inactive

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "stripe_card_id": self.stripe_card_id,
            "last4": self.last4,
            "exp_month": self.exp_month,
            "exp_year": self.exp_year,
            "status": self.status,
        }


class SplitPreference(Base):
    """Stores how a user wants to split charges on their virtual card"""
    __tablename__ = "split_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)

    # Which virtual card this split config applies to
    stripe_card_id = Column(String, nullable=False, index=True)        # ic_xxx

    # Which real card to charge
    card_id = Column(Integer, ForeignKey('cards.id'), nullable=False)
    card_name = Column(String, nullable=False)

    # What percentage of the charge goes to this card (0.0 - 1.0)
    percentage = Column(Float, nullable=False)

    # Plaid fields for ACH transfer
    plaid_access_token = Column(String, nullable=True)                 # encrypted in production
    plaid_account_id = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "stripe_card_id": self.stripe_card_id,
            "card_id": self.card_id,
            "card_name": self.card_name,
            "percentage": self.percentage,
            "plaid_account_id": self.plaid_account_id,
            "is_active": self.is_active,
        }
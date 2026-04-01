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
    status = Column(String, default="logged")  # logged | executed | failed
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
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

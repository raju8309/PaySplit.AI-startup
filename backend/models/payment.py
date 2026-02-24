import uuid
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from models import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user = Column(String, nullable=False)
    to_user = Column(String, nullable=False)

    amount_cents = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="usd")

    status = Column(String, nullable=False, default="pending")  # pending|paid|failed
    stripe_session_id = Column(String, nullable=True)

    group_id = Column(String, nullable=True)
    settlement_ref = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
import uuid
from models.user import Base

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    description = Column(String, nullable=False)
    amount_cents = Column(Integer, nullable=False)
    payer_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Expense {self.description}>"

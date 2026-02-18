from sqlalchemy import Column, String, DateTime
from datetime import datetime
import uuid
from models.user import Base

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Group {self.name}>"

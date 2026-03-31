from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey
from models import Base

class Card(Base):
    __tablename__ = "cards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)
    
    name = Column(String, nullable=False)
    card_type = Column(String, nullable=False)
    last_four = Column(String(4), nullable=True)
    
    limit = Column(Float, nullable=False, default=1000.0)
    balance = Column(Float, nullable=False, default=0.0)
    
    rewards_rate = Column(Float, nullable=False, default=0.01)
    category_multipliers = Column(JSON, nullable=False, default={})
    
    is_active = Column(Boolean, default=True)
    is_preferred = Column(Boolean, default=False)
    
    color = Column(String, default="#3B82F6")
    icon = Column(String, default="💳")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'card_type': self.card_type,
            'last_four': self.last_four,
            'limit': self.limit,
            'balance': self.balance,
            'available': self.limit - self.balance,
            'rewards_rate': self.rewards_rate,
            'category_multipliers': self.category_multipliers,
            'is_active': self.is_active,
            'is_preferred': self.is_preferred,
            'color': self.color,
            'icon': self.icon
        }

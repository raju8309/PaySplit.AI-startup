from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models BEFORE using Base.metadata
from models.user import User
from models.group import Group
from models.expense import Expense

__all__ = ['Base', 'User', 'Group', 'Expense']
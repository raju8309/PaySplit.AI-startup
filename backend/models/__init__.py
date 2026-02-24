from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

from models.user import User
from models.group import Group
from models.expense import Expense
from models.card import Card

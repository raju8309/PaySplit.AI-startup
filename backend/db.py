from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base  # ✅ CHANGED
from config import settings  # ✅ CHANGED

# ✅ engine is required by main startup hook
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
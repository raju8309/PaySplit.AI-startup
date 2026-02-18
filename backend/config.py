import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "PaySplit.AI"
    VERSION = "1.0.0"
    
    # Use SQLite for development (no PostgreSQL needed!)
    DATABASE_URL = "sqlite:///./paysplit.db"
    
    SECRET_KEY = "your-secret-key-change-this-in-production"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    
    # CORS
    CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

settings = Settings()
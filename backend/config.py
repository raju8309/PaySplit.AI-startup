import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "PaySplit.AI"
    VERSION = "1.0.0"

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./paysplit.db")

    # Auth
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    # CORS
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

    # Frontend
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()

print("Loaded Stripe Key:", settings.STRIPE_SECRET_KEY)
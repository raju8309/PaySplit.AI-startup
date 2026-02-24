from pydantic_settings import BaseSettings
from typing import Optional


<<<<<<< HEAD
class Settings:
    APP_NAME = "PaySplit.AI"
    VERSION = "1.0.0"

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./paysplit.db")

    # Auth
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
=======
class Settings(BaseSettings):
    APP_NAME: str = "PaySplit.AI"
    VERSION: str = "1.0.0"

    # ===============================
    # Database
    # ===============================
    DATABASE_URL: str

    # ===============================
    # JWT
    # ===============================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ===============================
    # Google OAuth
    # ===============================
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3001/api/auth/google/callback"

    # ===============================
    # CORS
    # ===============================
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # ===============================
    # Fraud Model (XGBoost)
    # ===============================
    FRAUD_XGB_MODEL_PATH: str = "ml/artifacts/fraud_xgb/fraud_xgb_model.json"

    # Default threshold used by API
    FRAUD_THRESHOLD: float = 0.93

    # Mode switching (future flexibility)
    FRAUD_MODE: str = "strict"  # strict | balanced

    class Config:
        env_file = ".env"
        case_sensitive = True

>>>>>>> effc070eaa5f73ba80c9fa7dc8bec932aecb2fe7

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
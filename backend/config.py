from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    APP_NAME: str = "PaySplit.AI"
    VERSION: str = "1.0.0"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./paysplit.db"

    # ── JWT ───────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── Google OAuth ──────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3001/api/auth/google/callback"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:3000"
    )

    # ── Fraud Model ───────────────────────────────────────────────────────────
    FRAUD_XGB_MODEL_PATH: str = "ml/artifacts/fraud_xgb/fraud_xgb_model.json"
    FRAUD_THRESHOLD: float = 0.93
    FRAUD_MODE: str = "strict"

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # ── Plaid ─────────────────────────────────────────────────────────────────
    PLAID_CLIENT_ID: Optional[str] = None
    PLAID_SECRET: Optional[str] = None
    PLAID_ENV: str = "sandbox"

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def cors_origins_list(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]


settings = Settings()
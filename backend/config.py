from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List

_INSECURE_DEFAULT_KEY = "your-secret-key-change-this-in-production"


class Settings(BaseSettings):
    APP_NAME: str = "PaySplit.AI"
    VERSION: str = "1.0.0"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./paysplit.db"

    # ── JWT ───────────────────────────────────────────────────────────────────
    # REQUIRED: set a strong random SECRET_KEY in your .env file.
    # Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ALGORITHM: str = "HS256"
    # Reduced from 1440 (24h) to 60 minutes — use refresh tokens for longer sessions.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if v == _INSECURE_DEFAULT_KEY:
            import os
            if os.getenv("ENVIRONMENT", "development") == "production":
                raise ValueError(
                    "SECRET_KEY must be set to a strong random value in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
        return v

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
    STRIPE_ISSUING_WEBHOOK_SECRET: Optional[str] = None

    # ── Plaid ─────────────────────────────────────────────────────────────────
    PLAID_CLIENT_ID: Optional[str] = None
    PLAID_SECRET: Optional[str] = None
    PLAID_ENV: str = "sandbox"

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── SendGrid (Email) ──────────────────────────────────────────────────────
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: str = "rajukotturi45@gmail.com"
    SENDGRID_FROM_NAME: str = "PaySplit"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def cors_origins_list(self) -> List[str]:
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]


settings = Settings()
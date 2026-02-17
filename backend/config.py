import os
from dotenv import load_dotenv

# Load .env (either in repo root or backend/.env)
load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "PaySplit API")

    # Comma-separated list in env
    CORS_ORIGINS = [
        o.strip() for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000"
        ).split(",")
        if o.strip()
    ]

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/paysplit"
    )

    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_me")
    JWT_ALG: str = os.getenv("JWT_ALG", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ✅ THIS is what backend.main imports
settings = Settings()

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    APP_NAME: str = "PaySplit.AI"
    VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3001/api/auth/google/callback"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"


settings = Settings()
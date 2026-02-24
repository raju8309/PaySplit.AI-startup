from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging
from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.settlements import router as settlements_router
from routes.ml import router as ml_router
from routes.cards import router as cards_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")


# ── Fix Google OAuth popup blocked issue ──────────────────────────────────
class CoopMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response

app.add_middleware(CoopMiddleware)


# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(settlements_router)
app.include_router(ml_router)
app.include_router(cards_router)


# ── Startup ───────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    try:
        from db import engine
        from models import Base
        from models.user import User
        from models.group import Group
        from models.expense import Expense
        from models.card import Card
        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all).")
    except Exception as e:
        logger.warning(f"DB not ready yet. Skipping create_all. Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=True
    )
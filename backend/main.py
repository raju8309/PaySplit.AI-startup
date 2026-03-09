import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware  # ✅ REQUIRED for Authlib OAuth

from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.settlements import router as settlements_router
from routes.payments import router as payments_router
from routes.cards import router as cards_router

# Fraud model loader/service (XGBoost)
try:
    from ml.fraud_service import FraudModelXGB
except Exception:
    FraudModelXGB = None

# ✅ Week 8 routes
from routes.analytics import router as analytics_router
from routes.reports import router as reports_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)


# ── Fix Google OAuth popup issue ──────────────────────────────────────────
class CoopMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response


app.add_middleware(CoopMiddleware)


# ── ✅ Sessions (REQUIRED for Google OAuth via Authlib) ───────────────────
# Put this AFTER CoopMiddleware and BEFORE CORS is fine.
app.add_middleware(
    SessionMiddleware,
    secret_key=getattr(settings, "SECRET_KEY", "dev-secret-change-me"),
    same_site="lax",
    https_only=False,  # set True in production (HTTPS)
)


# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Optional ML Routers (prevents startup crash if artifacts/deps missing) ─
try:
    from routes.ml import router as ml_router
except Exception as e:
    ml_router = None
    logger.warning(f"ML routes disabled (reason: {e})")

try:
    from routes.fraud import router as fraud_router
except Exception as e:
    fraud_router = None
    logger.warning(f"Fraud routes disabled (reason: {e})")


# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(settlements_router)
app.include_router(payments_router)
app.include_router(cards_router)

if ml_router:
    app.include_router(ml_router)

if fraud_router:
    app.include_router(fraud_router)

app.include_router(analytics_router)
app.include_router(reports_router)


# ── Startup ───────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    # 1) Create DB tables
    try:
        from db import engine
        from models import Base
        from models.user import User
        from models.group import Group
        from models.expense import Expense
        from models.payment import Payment
        from models.card import Card

        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all).")
    except Exception as e:
        logger.warning(f"DB not ready yet. Skipping create_all. Error: {e}")

    # 2) Load fraud model (XGBoost) once at startup
    app.state.fraud_model = None
    app.state.fraud_threshold = getattr(settings, "FRAUD_THRESHOLD", 0.93)

    try:
        repo_root = Path(__file__).resolve().parents[1]  # <repo>
        model_path = repo_root / "ml" / "artifacts" / "fraud_xgb" / "fraud_xgb_model.json"

        if not model_path.exists():
            logger.warning(f"Fraud model not found at {model_path}. Fraud gate disabled.")
        else:
            if FraudModelXGB is not None:
                model = FraudModelXGB(
                    model_path=str(model_path),
                    default_threshold=float(getattr(settings, "FRAUD_THRESHOLD", 0.93)),
                )
                model.load()
                app.state.fraud_model = model
                logger.info("Fraud model loaded via FraudModelXGB service (ready=True).")
            else:
                import xgboost as xgb

                booster = xgb.Booster()
                booster.load_model(str(model_path))
                app.state.fraud_model = booster
                logger.info("Fraud model loaded via raw XGBoost Booster.")

    except Exception as e:
        logger.warning(f"Fraud model load failed. Fraud gate disabled. Error: {e}")
        app.state.fraud_model = None

    loaded = app.state.fraud_model is not None
    ready = bool(getattr(app.state.fraud_model, "ready", loaded))
    print("FRAUD MODEL LOADED?", loaded, "READY?", ready)
    logger.info(f"FRAUD MODEL LOADED? {loaded} READY? {ready}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
    )
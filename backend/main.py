import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.middleware.sessions import SessionMiddleware

from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.settlements import router as settlements_router
from routes.payments import router as payments_router
from routes.cards import router as cards_router
from models.virtual_card import VirtualCard, SplitPreference

try:
    from ml.fraud_service import FraudModelXGB
except Exception:
    FraudModelXGB = None

from routes.analytics import router as analytics_router
from routes.reports import router as reports_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)


class CoopMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
        return response


app.add_middleware(CoopMiddleware)

app.add_middleware(
    SessionMiddleware,
    secret_key=getattr(settings, "SECRET_KEY", "dev-secret-change-me"),
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Optional routers ──────────────────────────────────────────────────────────
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

try:
    from routes.issuing import router as issuing_router
except Exception as e:
    issuing_router = None
    logger.warning(f"Issuing routes disabled (reason: {e})")

try:
    from routes.plaid import router as plaid_router
except Exception as e:
    plaid_router = None
    logger.warning(f"Plaid routes disabled (reason: {e})")

try:
    from routes.webhook_split import router as webhook_split_router
except Exception as e:
    webhook_split_router = None
    logger.warning(f"Webhook split disabled (reason: {e})")


# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(settlements_router)
app.include_router(payments_router)
app.include_router(cards_router)
app.include_router(analytics_router)
app.include_router(reports_router)

if ml_router:
    app.include_router(ml_router)
if fraud_router:
    app.include_router(fraud_router)
if issuing_router:
    app.include_router(issuing_router)
if plaid_router:
    app.include_router(plaid_router)
if webhook_split_router:
    app.include_router(webhook_split_router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    try:
        from db import engine
        from models import Base
        from models.user import User
        from models.group import Group
        from models.expense import Expense
        from models.payment import Payment
        from models.card import Card
        from models.virtual_card import VirtualCard, SplitPreference

        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured.")
    except Exception as e:
        logger.warning(f"DB not ready. Error: {e}")

    app.state.fraud_model = None
    app.state.fraud_threshold = getattr(settings, "FRAUD_THRESHOLD", 0.93)

    try:
        repo_root = Path(__file__).resolve().parents[1]
        model_path = repo_root / "ml" / "artifacts" / "fraud_xgb" / "fraud_xgb_model.json"

        if not model_path.exists():
            logger.warning(f"Fraud model not found at {model_path}.")
        else:
            if FraudModelXGB is not None:
                model = FraudModelXGB(
                    model_path=str(model_path),
                    default_threshold=float(getattr(settings, "FRAUD_THRESHOLD", 0.93)),
                )
                model.load()
                app.state.fraud_model = model
            else:
                import xgboost as xgb
                booster = xgb.Booster()
                booster.load_model(str(model_path))
                app.state.fraud_model = booster

    except Exception as e:
        logger.warning(f"Fraud model load failed. Error: {e}")
        app.state.fraud_model = None

    loaded = app.state.fraud_model is not None
    ready = bool(getattr(app.state.fraud_model, "ready", loaded))
    print("FRAUD MODEL LOADED?", loaded, "READY?", ready)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
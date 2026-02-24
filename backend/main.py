# backend/main.py
import logging
from pathlib import Path
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.settlements import router as settlements_router
<<<<<<< HEAD
from routes.payments import router as payments_router
=======
from routes.ml import router as ml_router
from routes.cards import router as cards_router
>>>>>>> effc070eaa5f73ba80c9fa7dc8bec932aecb2fe7

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)


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
<<<<<<< HEAD
app.include_router(payments_router)
=======
app.include_router(ml_router)
app.include_router(cards_router)
>>>>>>> effc070eaa5f73ba80c9fa7dc8bec932aecb2fe7


# ── Startup ───────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    # 1) DB tables
    try:
        from db import engine
        from models import Base
        from models.user import User
        from models.group import Group
        from models.expense import Expense
<<<<<<< HEAD
        from models.payment import Payment
        
=======
        from models.card import Card

>>>>>>> effc070eaa5f73ba80c9fa7dc8bec932aecb2fe7
        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all).")
    except Exception as e:
        logger.warning(f"DB not ready yet. Skipping create_all. Error: {e}")

    # 2) Load fraud model (XGBoost) once
    try:
        import xgboost as xgb

        repo_root = Path(__file__).resolve().parents[1]  # .../paysplit_startup
        model_path = repo_root / "ml" / "artifacts" / "fraud_xgb" / "fraud_xgb_model.json"
        meta_path = repo_root / "ml" / "artifacts" / "fraud_xgb" / "train_meta.json"
        preprocess_meta_path = repo_root / "ml" / "artifacts" / "fraud_tf" / "preprocess_meta.json"

        if not model_path.exists():
            logger.warning(f"Fraud model not found at {model_path}. Fraud gate disabled.")
            app.state.fraud_model = None
            return

        booster = xgb.Booster()
        booster.load_model(str(model_path))

        # feature order: best source is preprocess_meta.json (from preprocessing)
        feature_names = None
        if preprocess_meta_path.exists():
            preprocess_meta = json.loads(preprocess_meta_path.read_text())
            feature_names = preprocess_meta.get("feature_names")

        # fallback: train_meta might include it depending on your file
        if not feature_names and meta_path.exists():
            meta = json.loads(meta_path.read_text())
            feature_names = meta.get("feature_names")

        if not feature_names:
            # last resort: assume 11 features and order is already known
            feature_names = [f"f{i}" for i in range(11)]
            logger.warning("Could not find feature_names in meta. Using f0..f10 fallback.")

        app.state.fraud_model = booster
        app.state.fraud_feature_names = feature_names

        # default threshold: use what you discovered in evaluation (0.93-ish for XGB best F1),
        # you can change this later.
        app.state.fraud_threshold = 0.93

        logger.info(f"✅ Loaded fraud XGB model from: {model_path}")
        logger.info(f"✅ Fraud feature count: {len(feature_names)}")
        logger.info(f"✅ Fraud threshold default: {app.state.fraud_threshold}")

    except Exception as e:
        logger.warning(f"Fraud model load failed. Fraud gate disabled. Error: {e}")
        app.state.fraud_model = None


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=True,
    )
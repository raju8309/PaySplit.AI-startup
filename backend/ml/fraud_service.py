from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict, Any
import os

import numpy as np
import xgboost as xgb


# Resolve repo root reliably (works even when backend runs from /backend)
# File: <repo>/backend/ml/fraud_service.py
REPO_ROOT = Path(__file__).resolve().parents[2]  # <repo>
DEFAULT_MODEL_PATH = REPO_ROOT / "ml" / "artifacts" / "fraud_xgb" / "fraud_xgb_model.json"


@dataclass
class FraudPrediction:
    probability: float
    threshold: float
    is_fraud: bool


class FraudModelXGB:
    """
    Production-ready XGBoost fraud model service.

    - Loads model ONCE at startup via load()
    - Uses env var FRAUD_XGB_MODEL_PATH if provided
    - Validates feature dimension (11)
    """

    def __init__(self, model_path: Optional[str] = None, default_threshold: float = 0.93):
        # Allow override via environment variable
        env_path = os.getenv("FRAUD_XGB_MODEL_PATH")
        final_path = env_path or model_path

        # If user passed a path (or env var), respect it.
        # If it's relative, resolve it from repo root so it works no matter where uvicorn is started.
        if final_path:
            p = Path(final_path)
            self.model_path = p if p.is_absolute() else (REPO_ROOT / p)
        else:
            self.model_path = DEFAULT_MODEL_PATH

        self.default_threshold = float(default_threshold)

        self.booster: Optional[xgb.Booster] = None
        self.input_dim = 11  # Your trained model expects 11 features

    # ---------------------------------------------------------
    # Lifecycle
    # ---------------------------------------------------------
    def load(self) -> None:
        """Load model into memory (call once at FastAPI startup)."""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Fraud XGB model not found at: {self.model_path.resolve()}")

        booster = xgb.Booster()
        booster.load_model(str(self.model_path))
        self.booster = booster

    @property
    def ready(self) -> bool:
        return self.booster is not None

    # ---------------------------------------------------------
    # Prediction
    # ---------------------------------------------------------
    def predict_proba(self, features: List[float]) -> float:
        if not self.ready:
            raise RuntimeError("FraudModelXGB not loaded. Call load() at startup.")

        if len(features) != self.input_dim:
            raise ValueError(f"Expected {self.input_dim} features, got {len(features)}")

        X = np.array(features, dtype=np.float32).reshape(1, -1)
        dmat = xgb.DMatrix(X)
        prob = float(self.booster.predict(dmat)[0])
        return prob

    def predict(self, features: List[float], threshold: Optional[float] = None) -> FraudPrediction:
        thr = self.default_threshold if threshold is None else float(threshold)
        prob = self.predict_proba(features)
        return FraudPrediction(
            probability=prob,
            threshold=thr,
            is_fraud=(prob >= thr),
        )


# -------------------------------------------------------------
# Feature Builder
# -------------------------------------------------------------

def build_features_from_fields(payload: Dict[str, Any]) -> List[float]:
    """
    API-safe feature builder.

    IMPORTANT:
    This MUST match the SAME feature order used in preprocess.py.
    If you update training features, update this function too.
    """

    amount = float(payload.get("amount", 0.0))

    hour_sin = float(payload.get("hour_sin", 0.0))
    hour_cos = float(payload.get("hour_cos", 1.0))

    dow_sin = float(payload.get("dow_sin", 0.0))
    dow_cos = float(payload.get("dow_cos", 1.0))

    card_limit = float(payload.get("card_limit", 0.0))
    card_balance = float(payload.get("card_balance", 0.0))
    utilization = float(payload.get("utilization", 0.0))

    distance_km = float(payload.get("distance_km", 0.0))

    mcc_group_id = float(payload.get("mcc_group_id", 0.0))

    # Placeholder 11th feature
    extra = float(payload.get("extra", 0.0))

    return [
        amount,
        hour_sin, hour_cos,
        dow_sin, dow_cos,
        card_limit, card_balance, utilization,
        distance_km,
        mcc_group_id,
        extra,
    ]
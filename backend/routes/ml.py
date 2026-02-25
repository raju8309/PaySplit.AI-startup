# backend/routes/ml.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import os
import sys
from datetime import datetime
import math

import numpy as np

# Add ml/models directory DIRECTLY to path to avoid conflict with backend/models
ml_models_path = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "ml", "models")
)
sys.path.insert(0, ml_models_path)

from card_recommender import CardRecommender
from transaction_categorizer import TransactionCategorizer

router = APIRouter(prefix="/api/ml", tags=["ML"])

# Initialize lightweight models
card_recommender = CardRecommender()
transaction_categorizer = TransactionCategorizer()


class Card(BaseModel):
    id: int
    name: str
    limit: float
    balance: float
    rewards_rate: float = 0.01
    category_multipliers: Dict[str, float] = {}


class RecommendRequest(BaseModel):
    transaction_amount: float
    cards: List[Card]
    free_trial: bool = False
    merchant: Optional[str] = None

    # new: fraud gate controls
    fraud_action: Literal["warn", "block"] = "warn"   # warn = allow but include warning; block = 403
    fraud_threshold: Optional[float] = None          # override default threshold if needed


class CategorizeRequest(BaseModel):
    description: str


# -------- Fraud feature builder (must match your preprocess feature order) --------
def _sin_cos_time_features(dt: datetime):
    hour = dt.hour + dt.minute / 60.0
    hour_rad = 2 * math.pi * (hour / 24.0)
    hour_sin = math.sin(hour_rad)
    hour_cos = math.cos(hour_rad)

    dow = dt.weekday()  # 0=Mon..6=Sun
    dow_rad = 2 * math.pi * (dow / 7.0)
    dow_sin = math.sin(dow_rad)
    dow_cos = math.cos(dow_rad)
    return hour_sin, hour_cos, dow_sin, dow_cos


def build_fraud_features(
    amount: float,
    cards: List[Dict],
    feature_names: List[str],
    merchant: Optional[str] = None,
) -> List[float]:
    """
    Build the 11-feature vector in the SAME ORDER used during training.

    We use feature_names (from preprocess_meta.json) so we don't guess the order.

    If some features are not available from the request (distance, MCC group, etc.),
    we set safe defaults (0.0).
    """
    now = datetime.utcnow()
    hour_sin, hour_cos, dow_sin, dow_cos = _sin_cos_time_features(now)

    # Use primary card (card[0]) as "current" context for fraud features
    c0 = cards[0] if cards else {}
    limit = float(c0.get("limit", 0.0))
    balance = float(c0.get("balance", 0.0))
    util = (balance / limit) if limit > 0 else 0.0

    # If you don't have geo, keep 0
    distance_km = 0.0

    # MCC group id: if you later map merchant->mcc group, plug it here
    mcc_group_id = 0.0

    # some older versions had raw mcc id too; if your feature_names includes it, default 0
    mcc_raw = 0.0

    # Build dictionary of known feature values
    values = {
        "_amount": float(amount),
        "_hour_sin": float(hour_sin),
        "_hour_cos": float(hour_cos),
        "_dow_sin": float(dow_sin),
        "_dow_cos": float(dow_cos),
        "_card_limit": float(limit),
        "_card_balance": float(balance),
        "_utilization": float(util),
        "_distance_km": float(distance_km),
        "_mcc": float(mcc_raw),
        "_mcc_group_id": float(mcc_group_id),
    }

    # Convert to correct order
    vec = []
    for name in feature_names:
        # if meta contains "f0..f10", we can't map -> just push defaults
        if name in values:
            vec.append(values[name])
        else:
            vec.append(0.0)

    return vec


def predict_fraud_prob(request: Request, features: List[float]) -> Optional[float]:
    """Return fraud probability if a fraud model is loaded, else None.

    Supports either:
    - app.state.fraud_model = FraudModelXGB service (preferred)
    - app.state.fraud_model = xgboost.Booster (legacy)
    """
    model = getattr(request.app.state, "fraud_model", None)
    if model is None:
        return None

    # Preferred: our service wrapper exposes predict_proba(features)
    if hasattr(model, "predict_proba") and callable(getattr(model, "predict_proba")):
        return float(model.predict_proba(features))

    # Fallback: service exposes predict(features) -> dataclass with .probability
    if hasattr(model, "predict") and callable(getattr(model, "predict")):
        try:
            out = model.predict(features)  # type: ignore
            if hasattr(out, "probability"):
                return float(out.probability)
        except TypeError:
            # This may be a native Booster.predict expecting a DMatrix; handled below
            pass

    # Legacy: native Booster stored in state
    try:
        import xgboost as xgb

        X = np.array([features], dtype=np.float32)
        dmat = xgb.DMatrix(X)
        return float(model.predict(dmat)[0])
    except Exception as e:
        raise RuntimeError(f"Fraud prediction failed: {e}")


# -------- Routes --------
@router.post("/recommend")
def recommend_allocation(request: RecommendRequest, fastapi_request: Request):
    """
    1) Run fraud model first
    2) If risk high:
       - block -> 403
       - warn  -> return allocations + warning
    3) Otherwise run card allocation as usual
    """
    try:
        cards_dict = [card.model_dump() for card in request.cards]

        # ---- Fraud first ----
        input_dim = getattr(getattr(fastapi_request.app.state, "fraud_model", None), "input_dim", 11)
        feature_names = getattr(fastapi_request.app.state, "fraud_feature_names", [f"f{i}" for i in range(int(input_dim))])
        features = build_fraud_features(
            amount=request.transaction_amount,
            cards=cards_dict,
            feature_names=feature_names,
            merchant=request.merchant,
        )

        prob = predict_fraud_prob(fastapi_request, features)
        threshold = request.fraud_threshold if request.fraud_threshold is not None else getattr(
            fastapi_request.app.state, "fraud_threshold", 0.93
        )

        # If fraud model loaded, enforce policy
        if prob is not None and prob >= threshold:
            payload = {
                "blocked": request.fraud_action == "block",
                "reason": "High fraud risk detected",
                "fraud_probability": round(prob, 6),
                "threshold": float(threshold),
                "merchant": request.merchant,
            }

            if request.fraud_action == "block":
                raise HTTPException(status_code=403, detail=payload)

            # warn -> continue but include warning
            warn_info = payload
        else:
            warn_info = None

        # ---- Allocation ----
        result = card_recommender.recommend(
            transaction_amount=request.transaction_amount,
            cards=cards_dict,
            free_trial=request.free_trial,
            merchant=request.merchant,
        )

        # attach warning if any
        if warn_info:
            result["fraud_warning"] = warn_info

        # also attach probability even when safe (useful for UI)
        if prob is not None:
            result["fraud_probability"] = round(prob, 6)
            result["fraud_threshold"] = float(threshold)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categorize")
def categorize_transaction(request: CategorizeRequest):
    """AI-powered transaction categorization"""
    try:
        category, confidence = transaction_categorizer.categorize(request.description)
        return {
            "description": request.description,
            "category": category,
            "confidence": confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
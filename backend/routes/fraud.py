from __future__ import annotations

from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.config import settings
from backend.ml.fraud_service import FraudModelXGB, build_features_from_fields

router = APIRouter(prefix="/api/ml", tags=["ML - Fraud"])

# Load once (startup)
fraud_model = FraudModelXGB(
    model_path=getattr(settings, "FRAUD_XGB_MODEL_PATH", "ml/artifacts/fraud_xgb/fraud_xgb_model.json"),
    default_threshold=float(getattr(settings, "FRAUD_THRESHOLD", 0.93)),
)


class FraudRequest(BaseModel):
    # Option A: direct features (best for now)
    features: Optional[List[float]] = Field(default=None, description="Exactly 11 features in model order")

    # Option B: fields (only used if features=None)
    amount: Optional[float] = None
    hour_sin: Optional[float] = None
    hour_cos: Optional[float] = None
    dow_sin: Optional[float] = None
    dow_cos: Optional[float] = None
    card_limit: Optional[float] = None
    card_balance: Optional[float] = None
    utilization: Optional[float] = None
    distance_km: Optional[float] = None
    mcc_group_id: Optional[float] = None
    extra: Optional[float] = 0.0

    threshold: Optional[float] = Field(default=None, description="Override threshold for this request")


class FraudResponse(BaseModel):
    probability: float
    threshold: float
    is_fraud: bool


@router.post("/fraud", response_model=FraudResponse)
def predict_fraud(req: FraudRequest):
    try:
        if req.features is not None:
            feats = req.features
        else:
            feats = build_features_from_fields(req.model_dump())

        pred = fraud_model.predict(features=feats, threshold=req.threshold)

        return FraudResponse(
            probability=pred.probability,
            threshold=pred.threshold,
            is_fraud=pred.is_fraud,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fraud prediction failed: {e}")
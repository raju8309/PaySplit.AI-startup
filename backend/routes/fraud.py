from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from config import settings
from ml.fraud_service import build_features_from_fields

router = APIRouter(prefix="/api/ml", tags=["ML - Fraud"])


class FraudRequest(BaseModel):
    # Option A: direct features (best for now)
    features: Optional[List[float]] = Field(
        default=None,
        description="Exactly 11 features in model order"
    )

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
def predict_fraud(req: FraudRequest, request: Request):
    try:
        fraud_model = getattr(request.app.state, "fraud_model", None)
        if fraud_model is None:
            raise HTTPException(status_code=503, detail="Fraud model not loaded on server startup")

        feats = req.features if req.features is not None else build_features_from_fields(req.model_dump())

        pred = fraud_model.predict(features=feats, threshold=req.threshold)

        return FraudResponse(
            probability=float(pred.probability),
            threshold=float(pred.threshold),
            is_fraud=bool(pred.is_fraud),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fraud prediction failed: {e}")
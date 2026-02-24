from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np
import xgboost as xgb


@dataclass
class FraudPrediction:
    probability: float
    threshold: float
    is_fraud: bool


class FraudModelXGB:
    """
    Loads your trained XGBoost model from:
      ml/artifacts/fraud_xgb/fraud_xgb_model.json

    Predicts probability of fraud.
    """

    def __init__(self, model_path: str, default_threshold: float = 0.93):
        self.model_path = Path(model_path)
        self.default_threshold = float(default_threshold)

        if not self.model_path.exists():
            raise FileNotFoundError(f"Fraud XGB model not found at: {self.model_path}")

        self.booster = xgb.Booster()
        self.booster.load_model(str(self.model_path))

        # IMPORTANT: Your model expects 11 features
        self.input_dim = 11

    def predict_proba(self, features: List[float]) -> float:
        if len(features) != self.input_dim:
            raise ValueError(f"Expected {self.input_dim} features, got {len(features)}")

        X = np.array(features, dtype=np.float32).reshape(1, -1)
        dmat = xgb.DMatrix(X)
        prob = float(self.booster.predict(dmat)[0])
        return prob

    def predict(self, features: List[float], threshold: Optional[float] = None) -> FraudPrediction:
        thr = self.default_threshold if threshold is None else float(threshold)
        prob = self.predict_proba(features)
        return FraudPrediction(probability=prob, threshold=thr, is_fraud=(prob >= thr))


def build_features_from_fields(payload: Dict[str, Any]) -> List[float]:
    """
    Minimal feature builder for API usage.

    IMPORTANT:
    This must match the SAME feature order you used in preprocess.py.

    Based on what we debugged earlier, your 11 features look like:
      [amount,
       hour_sin, hour_cos,
       dow_sin, dow_cos,
       card_limit, card_balance, utilization,
       distance_km,
       mcc_group_id,
       maybe something else (like merchant risk / txn_velocity)]
    BUT your current dataset still outputs 11.
    So for now: we let user pass features OR we build a simple safe baseline.

    You should later copy the exact feature builder from preprocess.py into here.
    """

    # Safe defaults so endpoint doesn't crash if field missing.
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

    # 11th feature placeholder:
    # Until you wire the exact preprocess logic, keep it stable.
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
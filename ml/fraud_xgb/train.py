# ml/fraud_xgb/train.py
import argparse
import json
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.metrics import roc_auc_score, average_precision_score


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", required=True, help="Path to fraud_dataset.npz")
    parser.add_argument("--artifacts_dir", required=True, help="Where to save XGBoost model + metadata")

    # Training config (simple + stable)
    parser.add_argument("--num_boost_round", type=int, default=2000)
    parser.add_argument("--early_stop_rounds", type=int, default=50)
    parser.add_argument("--learning_rate", type=float, default=0.05)
    parser.add_argument("--max_depth", type=int, default=6)
    parser.add_argument("--subsample", type=float, default=0.8)
    parser.add_argument("--colsample_bytree", type=float, default=0.8)
    parser.add_argument("--reg_lambda", type=float, default=1.0)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    npz_path = Path(args.npz)
    artifacts_dir = Path(args.artifacts_dir)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    d = np.load(npz_path)

    X_train = d["X_train"].astype(np.float32)
    y_train = d["y_train"].astype(int)

    X_val = d["X_val"].astype(np.float32)
    y_val = d["y_val"].astype(int)

    print(f"✅ X_train: {X_train.shape}  frauds={y_train.sum()}  rate={y_train.mean():.6f}")
    print(f"✅ X_val:   {X_val.shape}    frauds={y_val.sum()}  rate={y_val.mean():.6f}")

    # Imbalance handling
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos_weight = float(neg / max(pos, 1))
    print(f"✅ scale_pos_weight: {scale_pos_weight:.2f}")

    # DMatrix is the stable API (works in all xgboost versions)
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dval = xgb.DMatrix(X_val, label=y_val)

    params = {
        "objective": "binary:logistic",
        "eval_metric": ["auc", "aucpr"],
        "eta": args.learning_rate,
        "max_depth": args.max_depth,
        "subsample": args.subsample,
        "colsample_bytree": args.colsample_bytree,
        "lambda": args.reg_lambda,
        "scale_pos_weight": scale_pos_weight,
        "seed": args.seed,
        "tree_method": "hist",  # good default on Mac
    }

    evals = [(dtrain, "train"), (dval, "val")]

    print("\n🚀 Training XGBoost with early stopping (native API)...")
    booster = xgb.train(
        params=params,
        dtrain=dtrain,
        num_boost_round=args.num_boost_round,
        evals=evals,
        early_stopping_rounds=args.early_stop_rounds,
        verbose_eval=100,  # prints every 100 rounds
    )

    # Save model
    model_path = artifacts_dir / "fraud_xgb_model.json"
    booster.save_model(model_path)
    print(f"\n✅ Saved model: {model_path}")

    # Quick val metrics
    val_probs = booster.predict(dval)
    auc_roc = roc_auc_score(y_val, val_probs)
    auc_pr = average_precision_score(y_val, val_probs)

    print("\n--- VAL metrics ---")
    print("val prob min/max/mean:", float(val_probs.min()), float(val_probs.max()), float(val_probs.mean()))
    print("val AUC-ROC:", float(auc_roc))
    print("val AUC-PR :", float(auc_pr))

    meta = {
        "xgboost_version": getattr(xgb, "__version__", "unknown"),
        "best_iteration": int(getattr(booster, "best_iteration", -1)),
        "best_score": float(getattr(booster, "best_score", float("nan"))),
        "params": {
            **params,
            "num_boost_round": args.num_boost_round,
            "early_stop_rounds": args.early_stop_rounds,
        },
        "val_auc_roc": float(auc_roc),
        "val_auc_pr": float(auc_pr),
    }

    meta_path = artifacts_dir / "train_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"✅ Saved metadata: {meta_path}")


if __name__ == "__main__":
    main()
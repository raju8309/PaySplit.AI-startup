import argparse
import json
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_recall_fscore_support,
    classification_report,
)


def pick_best_threshold(y_true, probs, min_precision=None):
    """
    Find a threshold that maximizes F1.
    Optionally enforce a minimum precision (useful in fraud to reduce false alarms).
    """
    best = {"thr": 0.5, "f1": -1, "precision": 0.0, "recall": 0.0}

    # scan thresholds
    for thr in np.linspace(0.01, 0.99, 99):
        preds = (probs >= thr).astype(int)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, preds, average="binary", zero_division=0
        )

        if min_precision is not None and precision < min_precision:
            continue

        if f1 > best["f1"]:
            best = {"thr": float(thr), "f1": float(f1), "precision": float(precision), "recall": float(recall)}

    return best


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", required=True, help="Path to fraud_dataset.npz")
    parser.add_argument("--model", required=True, help="Path to saved XGBoost booster json")
    parser.add_argument("--split", choices=["train", "val", "test"], default="val")
    parser.add_argument("--threshold", type=float, default=None, help="If set, evaluate using this threshold")
    parser.add_argument("--min_precision", type=float, default=None, help="Optional constraint when auto-picking threshold")
    args = parser.parse_args()

    d = np.load(args.npz)

    X = d[f"X_{args.split}"].astype(np.float32)
    y = d[f"y_{args.split}"].astype(int)

    booster = xgb.Booster()
    booster.load_model(args.model)

    probs = booster.predict(xgb.DMatrix(X))

    auc_roc = roc_auc_score(y, probs)
    auc_pr = average_precision_score(y, probs)

    print(f"\n✅ Split: {args.split}")
    print(f"✅ AUC-ROC: {auc_roc:.4f}")
    print(f"✅ AUC-PR : {auc_pr:.4f}")
    print("✅ prob min/max/mean:", float(probs.min()), float(probs.max()), float(probs.mean()))

    # Threshold logic
    if args.threshold is None:
        best = pick_best_threshold(y, probs, min_precision=args.min_precision)
        thr = best["thr"]
        print(f"\n🎯 Auto-picked threshold = {thr:.4f} (best F1)")
        print(f"   precision={best['precision']:.4f} recall={best['recall']:.4f} f1={best['f1']:.4f}")
    else:
        thr = float(args.threshold)
        print(f"\n🎯 Using provided threshold = {thr:.4f}")

    preds = (probs >= thr).astype(int)
    print()
    print(classification_report(y, preds, digits=4, zero_division=0))


if __name__ == "__main__":
    main()
"""ml/fraud_xgb/evaluate.py

Evaluate an XGBoost fraud model (native Booster saved as .json) on train/val/test splits.

What this script does:
- Loads X/y from a processed .npz file
- Loads a saved XGBoost Booster (.json)
- Computes AUC-ROC and AUC-PR
- Picks a threshold that maximizes F1 (optionally enforcing a minimum precision)
- Prints a classification report
- Optionally saves eval_<split>.json into artifacts_dir (recommended)

Examples:
  python3 ml/fraud_xgb/evaluate.py \
    --npz ml/data/processed/fraud_dataset.npz \
    --model ml/artifacts/fraud_xgb/fraud_xgb_model.json \
    --split val \
    --artifacts_dir ml/artifacts/fraud_xgb

  python3 ml/fraud_xgb/evaluate.py \
    --npz ml/data/processed/fraud_dataset.npz \
    --model ml/artifacts/fraud_xgb/fraud_xgb_model.json \
    --split test \
    --artifacts_dir ml/artifacts/fraud_xgb
"""

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
    confusion_matrix,
)


def pick_best_threshold(y_true: np.ndarray, probs: np.ndarray, min_precision: float | None = None) -> dict:
    """Find a threshold that maximizes F1.

    If `min_precision` is provided, only thresholds meeting that precision are considered.
    This is useful in fraud to reduce false alarms.
    """
    best = {"thr": 0.5, "f1": -1.0, "precision": 0.0, "recall": 0.0}

    # Scan a simple grid of thresholds.
    for thr in np.linspace(0.01, 0.99, 99):
        preds = (probs >= thr).astype(int)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, preds, average="binary", zero_division=0
        )

        if min_precision is not None and precision < min_precision:
            continue

        if f1 > best["f1"]:
            best = {
                "thr": float(thr),
                "f1": float(f1),
                "precision": float(precision),
                "recall": float(recall),
            }

    return best


def _jsonable(obj):
    """Convert numpy types to plain Python types for JSON."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", required=True, help="Path to fraud_dataset.npz")
    parser.add_argument("--model", required=True, help="Path to saved XGBoost booster json")
    parser.add_argument("--split", choices=["train", "val", "test"], default="val")
    parser.add_argument("--threshold", type=float, default=None, help="If set, evaluate using this threshold")
    parser.add_argument(
        "--min_precision",
        type=float,
        default=None,
        help="Optional constraint when auto-picking threshold (helps reduce false positives)",
    )

    # NEW: optional JSON output
    parser.add_argument(
        "--artifacts_dir",
        type=str,
        default=None,
        help="If provided, saves eval_<split>.json into this folder",
    )
    parser.add_argument(
        "--out_json",
        type=str,
        default=None,
        help="Optional explicit JSON output path (overrides --artifacts_dir)",
    )

    args = parser.parse_args()

    npz_path = Path(args.npz)
    model_path = Path(args.model)

    d = np.load(npz_path)
    X = d[f"X_{args.split}"].astype(np.float32)
    y = d[f"y_{args.split}"].astype(int)

    booster = xgb.Booster()
    booster.load_model(str(model_path))

    probs = booster.predict(xgb.DMatrix(X)).reshape(-1)

    auc_roc = float(roc_auc_score(y, probs))
    auc_pr = float(average_precision_score(y, probs))

    print(f"\n✅ Split: {args.split}")
    print(f"✅ AUC-ROC: {auc_roc:.4f}")
    print(f"✅ AUC-PR : {auc_pr:.4f}")
    print("✅ prob min/max/mean:", float(probs.min()), float(probs.max()), float(probs.mean()))

    # Threshold logic
    if args.threshold is None:
        best = pick_best_threshold(y, probs, min_precision=args.min_precision)
        thr = float(best["thr"])
        print(f"\n🎯 Auto-picked threshold = {thr:.4f} (best F1)")
        print(
            f"   precision={best['precision']:.4f} recall={best['recall']:.4f} f1={best['f1']:.4f}"
        )
    else:
        thr = float(args.threshold)
        print(f"\n🎯 Using provided threshold = {thr:.4f}")

    preds = (probs >= thr).astype(int)

    # Print report
    report_text = classification_report(y, preds, digits=4, zero_division=0)
    print("\n" + report_text)

    # Confusion matrix (tn, fp, fn, tp)
    cm = confusion_matrix(y, preds, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    # JSON report
    report_dict = classification_report(y, preds, digits=6, zero_division=0, output_dict=True)

    payload = {
        "split": args.split,
        "npz": str(npz_path),
        "model": str(model_path),
        "n_rows": int(len(y)),
        "fraud_rate": float(np.mean(y)),
        "threshold": float(thr),
        "min_precision": None if args.min_precision is None else float(args.min_precision),
        "auc_roc": auc_roc,
        "auc_pr": auc_pr,
        "prob_min": float(np.min(probs)),
        "prob_max": float(np.max(probs)),
        "prob_mean": float(np.mean(probs)),
        "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
        "classification_report": report_dict,
    }

    # Decide output JSON path
    out_json_path = None
    if args.out_json:
        out_json_path = Path(args.out_json)
    elif args.artifacts_dir:
        out_dir = Path(args.artifacts_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_json_path = out_dir / f"eval_{args.split}.json"

    if out_json_path is not None:
        out_json_path.parent.mkdir(parents=True, exist_ok=True)
        with out_json_path.open("w") as f:
            json.dump({k: _jsonable(v) for k, v in payload.items()}, f, indent=2)
        print(f"\n✅ Saved eval report: {out_json_path}")


if __name__ == "__main__":
    main()
# ml/fraud_tf/evaluate.py
"""Evaluate a trained TensorFlow fraud model on val/test splits.

What this script does:
- Loads X/y from a processed .npz file
- Loads a saved .keras model
- Computes AUC-ROC and AUC-PR (average precision)
- Picks a threshold that maximizes F1 (unless you provide one)
- Prints a classification report
- Optionally saves a JSON report with all metrics + metadata

Examples:
  python3 ml/fraud_tf/evaluate.py \
    --npz ml/data/processed/fraud_dataset.npz \
    --model ml/artifacts/fraud_tf/fraud_tf_model_best.keras \
    --split test \
    --artifacts_dir ml/artifacts/fraud_tf

  # force a threshold
  python3 ml/fraud_tf/evaluate.py --npz ... --model ... --split val --threshold 0.30
"""

import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
    confusion_matrix,
)


def find_best_threshold(y_true: np.ndarray, probs: np.ndarray):
    """Pick the threshold that maximizes F1 on a precision-recall curve."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, probs)

    # thresholds length is (len(precisions) - 1)
    # We compute F1 for each threshold index.
    f1_scores = []
    for i in range(len(thresholds)):
        p = float(precisions[i])
        r = float(recalls[i])
        f1 = 0.0 if (p + r) == 0 else (2 * p * r) / (p + r)
        f1_scores.append(f1)

    best_idx = int(np.argmax(f1_scores))
    return (
        float(thresholds[best_idx]),
        float(precisions[best_idx]),
        float(recalls[best_idx]),
        float(f1_scores[best_idx]),
    )


def as_jsonable(x):
    """Convert numpy scalars/arrays to plain Python types for JSON."""
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        return float(x)
    if isinstance(x, np.ndarray):
        return x.tolist()
    return x


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", type=str, required=True, help="Processed .npz path")
    parser.add_argument("--model", type=str, required=True, help="Path to saved .keras model")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test"], help="Which split to evaluate")
    parser.add_argument("--threshold", type=float, default=None, help="If not given, auto-pick best threshold (by F1)")

    # NEW: where to write metrics JSON
    parser.add_argument(
        "--artifacts_dir",
        type=str,
        default=None,
        help="If provided, writes eval report JSON into this folder",
    )
    parser.add_argument(
        "--out_json",
        type=str,
        default=None,
        help="Optional explicit JSON output path (overrides --artifacts_dir default)",
    )

    args = parser.parse_args()

    npz_path = Path(args.npz)
    model_path = Path(args.model)

    data = np.load(npz_path)

    X = data[f"X_{args.split}"].astype(np.float32)
    y = data[f"y_{args.split}"].astype(int)

    model = tf.keras.models.load_model(model_path)
    probs = model.predict(X, verbose=0).reshape(-1)

    auc_roc = float(roc_auc_score(y, probs))
    auc_pr = float(average_precision_score(y, probs))

    print(f"\n✅ Split: {args.split}")
    print(f"✅ AUC-ROC: {auc_roc:.4f}")
    print(f"✅ AUC-PR : {auc_pr:.4f}")
    print("✅ prob min/max/mean:", float(probs.min()), float(probs.max()), float(probs.mean()))

    # Threshold selection
    if args.threshold is None:
        t, p, r, f1 = find_best_threshold(y, probs)
        threshold = t
        print(f"\n🎯 Auto-picked threshold = {threshold:.4f} (best F1)")
        print(f"   precision={p:.4f} recall={r:.4f} f1={f1:.4f}")
    else:
        threshold = float(args.threshold)
        print(f"\n🎯 Using threshold = {threshold:.4f}")

    preds = (probs >= threshold).astype(int)

    # Text report
    report_text = classification_report(y, preds, digits=4, zero_division=0)
    print("\n" + report_text)

    # Confusion matrix
    cm = confusion_matrix(y, preds, labels=[0, 1])
    tn, fp, fn, tp = (int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1]))

    # Build a JSON report (useful for dashboards / CI / comparisons)
    report_dict = classification_report(y, preds, digits=6, zero_division=0, output_dict=True)

    payload = {
        "split": args.split,
        "npz": str(npz_path),
        "model": str(model_path),
        "n_rows": int(len(y)),
        "fraud_rate": float(np.mean(y)),
        "threshold": float(threshold),
        "auc_roc": auc_roc,
        "auc_pr": auc_pr,
        "prob_min": float(np.min(probs)),
        "prob_max": float(np.max(probs)),
        "prob_mean": float(np.mean(probs)),
        "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
        "classification_report": report_dict,
    }

    # Decide output JSON path
    out_json = None
    if args.out_json:
        out_json = Path(args.out_json)
    elif args.artifacts_dir:
        out_dir = Path(args.artifacts_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_json = out_dir / f"eval_{args.split}.json"

    if out_json is not None:
        out_json.parent.mkdir(parents=True, exist_ok=True)
        with out_json.open("w") as f:
            json.dump({k: as_jsonable(v) for k, v in payload.items()}, f, indent=2)
        print(f"\n✅ Saved eval report: {out_json}")


if __name__ == "__main__":
    main()
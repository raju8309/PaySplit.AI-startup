# ml/fraud_tf/evaluate.py
import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    average_precision_score,
    precision_recall_curve,
)


def find_best_threshold(y_true, probs):
    precisions, recalls, thresholds = precision_recall_curve(y_true, probs)

    # thresholds length is (len(precisions) - 1)
    # We compute F1 for each threshold index.
    f1_scores = []
    for i in range(len(thresholds)):
        p = precisions[i]
        r = recalls[i]
        f1 = 0.0 if (p + r) == 0 else (2 * p * r) / (p + r)
        f1_scores.append(f1)

    best_idx = int(np.argmax(f1_scores))
    return float(thresholds[best_idx]), float(precisions[best_idx]), float(recalls[best_idx]), float(f1_scores[best_idx])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", type=str, required=True, help="Processed npz path")
    parser.add_argument("--model", type=str, required=True, help="Path to saved .keras model")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test"])
    parser.add_argument("--threshold", type=float, default=None, help="If not given, auto-pick best threshold")
    args = parser.parse_args()

    data = np.load(Path(args.npz))

    X = data[f"X_{args.split}"]
    y = data[f"y_{args.split}"].astype(int)

    model = tf.keras.models.load_model(Path(args.model))

    probs = model.predict(X, verbose=0).reshape(-1)

    auc_roc = roc_auc_score(y, probs)
    auc_pr = average_precision_score(y, probs)

    print(f"\n✅ Split: {args.split}")
    print(f"✅ AUC-ROC: {auc_roc:.4f}")
    print(f"✅ AUC-PR : {auc_pr:.4f}")
    print("✅ prob min/max/mean:", float(probs.min()), float(probs.max()), float(probs.mean()))

    if args.threshold is None:
        t, p, r, f1 = find_best_threshold(y, probs)
        print(f"\n🎯 Auto-picked threshold = {t:.4f} (best F1)")
        print(f"   precision={p:.4f} recall={r:.4f} f1={f1:.4f}")
        threshold = t
    else:
        threshold = float(args.threshold)
        print(f"\n🎯 Using threshold = {threshold:.4f}")

    preds = (probs >= threshold).astype(int)

    print("\n" + classification_report(y, preds, digits=4, zero_division=0))


if __name__ == "__main__":
    main()
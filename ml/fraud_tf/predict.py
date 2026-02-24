# ml/fraud_tf/predict.py

import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf


def load_threshold(artifacts_dir: Path, default_threshold: float) -> float:
    thresh_path = artifacts_dir / "threshold.json"
    if thresh_path.exists():
        try:
            data = json.loads(thresh_path.read_text())
            return float(data.get("threshold", default_threshold))
        except Exception:
            pass
    return float(default_threshold)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, required=True, help="Path to saved .keras model")
    parser.add_argument("--npz", type=str, required=True, help="Path to fraud_dataset.npz")
    parser.add_argument("--split", type=str, default="test", choices=["train", "val", "test"])
    parser.add_argument("--index", type=int, default=0, help="Row index inside selected split")
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--artifacts_dir", type=str, default="ml/artifacts/fraud_tf")
    args = parser.parse_args()

    model_path = Path(args.model)
    artifacts_dir = Path(args.artifacts_dir)

    model = tf.keras.models.load_model(model_path)

    data = np.load(args.npz)

    X = data[f"X_{args.split}"].astype(np.float32)
    y = data[f"y_{args.split}"].astype(int)

    if args.index >= len(X):
        raise ValueError(f"Index {args.index} out of range. Max index = {len(X)-1}")

    sample_x = X[args.index:args.index+1]
    true_label = int(y[args.index])

    threshold = load_threshold(artifacts_dir, args.threshold)

    prob = float(model.predict(sample_x, verbose=0).reshape(-1)[0])
    flagged = prob >= threshold

    print("\n--- Fraud Prediction ---")
    print(f"Split             : {args.split}")
    print(f"Index             : {args.index}")
    print(f"True Label        : {true_label}")
    print(f"Fraud probability : {prob:.6f}")
    print(f"Threshold         : {threshold:.4f}")
    print(f"Flagged as fraud  : {bool(flagged)}")


if __name__ == "__main__":
    main()
import argparse
import numpy as np
import xgboost as xgb


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to saved XGBoost booster json")
    parser.add_argument("--npz", required=True, help="Path to fraud_dataset.npz")
    parser.add_argument("--split", choices=["train", "val", "test"], default="test")
    parser.add_argument("--index", type=int, default=0, help="Row index inside the chosen split")
    parser.add_argument("--threshold", type=float, default=0.5)
    args = parser.parse_args()

    d = np.load(args.npz)
    X = d[f"X_{args.split}"].astype(np.float32)
    y = d[f"y_{args.split}"].astype(int)

    if args.index < 0 or args.index >= len(y):
        raise SystemExit(f"Index out of range. split={args.split} has {len(y)} rows.")

    booster = xgb.Booster()
    booster.load_model(args.model)

    x_row = X[args.index : args.index + 1]
    prob = float(booster.predict(xgb.DMatrix(x_row))[0])

    flagged = prob >= args.threshold

    print("\n--- Fraud Prediction (XGBoost) ---")
    print("Split             :", args.split)
    print("Index             :", args.index)
    print("True Label        :", int(y[args.index]))
    print("Fraud probability :", f"{prob:.6f}")
    print("Threshold         :", f"{args.threshold:.4f}")
    print("Flagged as fraud  :", bool(flagged))


if __name__ == "__main__":
    main()
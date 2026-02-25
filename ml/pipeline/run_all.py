"""
Fraud ML Full Pipeline Runner
Runs:
1) Preprocess
2) Train TensorFlow
3) Evaluate TensorFlow
4) Train XGBoost
5) Evaluate XGBoost
6) Save summary metadata

Usage:
    python3 ml/pipeline/run_all.py --which both
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

def run_command(cmd: list[str]):
    """Run subprocess and stop on failure."""
    print("\n▶ Running:", " ".join(cmd))
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        raise SystemExit(f"\n❌ Command failed: {' '.join(cmd)}")


def now():
    return datetime.utcnow().isoformat() + "Z"


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# Main Pipeline
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--which", choices=["tf", "xgb", "both"], default="both")
    parser.add_argument("--max_rows", type=int, default=500000)
    parser.add_argument("--tf_epochs", type=int, default=10)
    parser.add_argument("--tf_batch_size", type=int, default=2048)
    parser.add_argument("--tf_lr", type=float, default=1e-3)
    args = parser.parse_args()

    root = Path(".").resolve()

    data_raw = root / "ml" / "data" / "raw"
    data_processed = root / "ml" / "data" / "processed"
    artifacts_tf = root / "ml" / "artifacts" / "fraud_tf"
    artifacts_xgb = root / "ml" / "artifacts" / "fraud_xgb"

    ensure_dir(data_processed)
    ensure_dir(artifacts_tf)
    ensure_dir(artifacts_xgb)

    npz_path = data_processed / "fraud_dataset.npz"

    # ───────── 1️⃣ Preprocess ─────────
    preprocess_cmd = [
        sys.executable,
        "ml/fraud_tf/preprocess.py",
        "--data_dir", str(data_raw),
        "--out_dir", str(data_processed),
        "--artifacts_dir", str(artifacts_tf),
        "--max_rows", str(args.max_rows),
    ]
    run_command(preprocess_cmd)

    if not npz_path.exists():
        raise SystemExit("❌ fraud_dataset.npz not created!")

    summary = {
        "ran_at": now(),
        "npz": str(npz_path),
        "results": {}
    }

    # ───────── 2️⃣ TensorFlow ─────────
    if args.which in ("tf", "both"):
        train_tf_cmd = [
            sys.executable,
            "ml/fraud_tf/train.py",
            "--npz", str(npz_path),
            "--artifacts_dir", str(artifacts_tf),
            "--epochs", str(args.tf_epochs),
            "--batch_size", str(args.tf_batch_size),
            "--lr", str(args.tf_lr),
        ]
        run_command(train_tf_cmd)

        model_tf = artifacts_tf / "fraud_tf_model_best.keras"
        if not model_tf.exists():
            model_tf = artifacts_tf / "fraud_tf_model_final.keras"

        eval_tf_val_cmd = [
            sys.executable,
            "ml/fraud_tf/evaluate.py",
            "--npz", str(npz_path),
            "--model", str(model_tf),
            "--split", "val",
        ]
        run_command(eval_tf_val_cmd)

        eval_tf_test_cmd = [
            sys.executable,
            "ml/fraud_tf/evaluate.py",
            "--npz", str(npz_path),
            "--model", str(model_tf),
            "--split", "test",
        ]
        run_command(eval_tf_test_cmd)

        summary["results"]["tensorflow"] = {
            "model_path": str(model_tf)
        }

    # ───────── 3️⃣ XGBoost ─────────
    if args.which in ("xgb", "both"):
        train_xgb_cmd = [
            sys.executable,
            "ml/fraud_xgb/train.py",
            "--npz", str(npz_path),
            "--artifacts_dir", str(artifacts_xgb),
        ]
        run_command(train_xgb_cmd)

        model_xgb = artifacts_xgb / "fraud_xgb_model.json"

        eval_xgb_val_cmd = [
            sys.executable,
            "ml/fraud_xgb/evaluate.py",
            "--npz", str(npz_path),
            "--model", str(model_xgb),
            "--split", "val",
        ]
        run_command(eval_xgb_val_cmd)

        eval_xgb_test_cmd = [
            sys.executable,
            "ml/fraud_xgb/evaluate.py",
            "--npz", str(npz_path),
            "--model", str(model_xgb),
            "--split", "test",
        ]
        run_command(eval_xgb_test_cmd)

        summary["results"]["xgboost"] = {
            "model_path": str(model_xgb)
        }

    # ───────── Save Summary ─────────
    summary_path = root / "ml" / "artifacts" / "fraud_pipeline_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2))

    print(f"\n✅ Pipeline completed successfully.")
    print(f"📁 Summary saved to: {summary_path}")


if __name__ == "__main__":
    main()

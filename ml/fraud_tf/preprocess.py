from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Optional, List, Tuple

import numpy as np
import pandas as pd


# -----------------------------
# Helpers (robust column finding)
# -----------------------------
def pick_col(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    """Return the first candidate column that exists in df (case-sensitive)."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def read_csv(path: Path) -> pd.DataFrame:
    # Low-memory read. If file is huge, pandas will stream internally.
    return pd.read_csv(path)


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def parse_labels(labels_json: dict) -> pd.DataFrame:
    """
    Your label file format (based on your debug):
      { "target": { "10649266": "No", "23410063": "No", ... } }

    We convert it into a DataFrame:
      transaction_id (string), is_fraud (0/1)
    """
    # Most common: labels are under "target"
    if isinstance(labels_json, dict) and "target" in labels_json and isinstance(labels_json["target"], dict):
        raw_map = labels_json["target"]
    # Fallback: maybe labels_json itself is a mapping
    elif isinstance(labels_json, dict):
        raw_map = labels_json
    else:
        raise ValueError("Labels JSON is not a dict. Unexpected format.")

    rows = []
    for k, v in raw_map.items():
        # k is transaction_id, v could be "Yes"/"No" or 0/1 or True/False
        if isinstance(v, str):
            vv = v.strip().lower()
            if vv in ("yes", "fraud", "1", "true"):
                y = 1
            elif vv in ("no", "legit", "0", "false"):
                y = 0
            else:
                # unknown label string → skip
                continue
        elif isinstance(v, (int, np.integer)):
            y = int(v)
            if y not in (0, 1):
                continue
        elif isinstance(v, bool):
            y = 1 if v else 0
        else:
            # Sometimes v might be dict; skip it safely
            continue

        rows.append({"transaction_id": str(k), "is_fraud": y})

    if not rows:
        raise ValueError("Parsed 0 usable labels. Check label values (expected Yes/No).")

    labels_df = pd.DataFrame(rows)
    return labels_df


def safe_float(series: pd.Series, default: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default).astype(float)


def safe_int(series: pd.Series, default: int = 0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default).astype(int)


def haversine_km(lat1, lon1, lat2, lon2) -> np.ndarray:
    """
    Vectorized haversine distance in km.
    Missing values → 0 distance.
    """
    lat1 = np.radians(np.nan_to_num(lat1, nan=0.0))
    lon1 = np.radians(np.nan_to_num(lon1, nan=0.0))
    lat2 = np.radians(np.nan_to_num(lat2, nan=0.0))
    lon2 = np.radians(np.nan_to_num(lon2, nan=0.0))

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return 6371.0 * c


def split_indices(n: int, seed: int, test_size: float, val_size: float) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Create train/val/test indices without sklearn dependency.
    """
    rng = np.random.default_rng(seed)
    idx = np.arange(n)
    rng.shuffle(idx)

    n_test = int(n * test_size)
    n_val = int(n * val_size)

    test_idx = idx[:n_test]
    val_idx = idx[n_test:n_test + n_val]
    train_idx = idx[n_test + n_val:]
    return train_idx, val_idx, test_idx


# -----------------------------
# Feature builder (numeric-only)
# -----------------------------
def build_numeric_features(df: pd.DataFrame, mcc_df: Optional[pd.DataFrame]) -> Tuple[np.ndarray, List[str]]:
    """
    Build a compact numeric feature matrix X and feature name list.
    This avoids giant one-hot encoding and keeps preprocessing stable.
    """

    # Amount
    amt_col = pick_col(df, ["amount", "transaction_amount", "amt", "purchase_amount"])
    if amt_col is None:
        df["_amount"] = 0.0
    else:
        df["_amount"] = safe_float(df[amt_col], 0.0)

    # Timestamp → hour/day features
    ts_col = pick_col(df, ["timestamp", "trans_date_trans_time", "datetime", "date", "transaction_time"])
    if ts_col:
        dt = pd.to_datetime(df[ts_col], errors="coerce", utc=True)
    else:
        dt = pd.to_datetime(pd.Series([pd.NaT] * len(df)), utc=True)

    hour = dt.dt.hour.fillna(0).astype(int)
    dow = dt.dt.dayofweek.fillna(0).astype(int)

    df["_hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    df["_hour_cos"] = np.cos(2 * np.pi * hour / 24.0)
    df["_dow_sin"] = np.sin(2 * np.pi * dow / 7.0)
    df["_dow_cos"] = np.cos(2 * np.pi * dow / 7.0)

    # Card utilization: balance/limit (if available)
    limit_col = pick_col(df, ["credit_limit", "limit", "card_limit"])
    bal_col = pick_col(df, ["balance", "card_balance", "current_balance"])

    if limit_col:
        limit = safe_float(df[limit_col], 0.0)
    else:
        limit = pd.Series(np.zeros(len(df)))

    if bal_col:
        bal = safe_float(df[bal_col], 0.0)
    else:
        bal = pd.Series(np.zeros(len(df)))

    util = np.where(limit.values > 0, bal.values / np.maximum(limit.values, 1e-6), 0.0)
    df["_card_limit"] = limit
    df["_card_balance"] = bal
    df["_utilization"] = util

    # Geo distance between user and merchant (if those columns exist)
    user_lat_col = pick_col(df, ["user_lat", "latitude_user", "lat_user", "home_lat", "lat"])
    user_lon_col = pick_col(df, ["user_long", "user_lon", "longitude_user", "lon_user", "home_lon", "long", "lng"])

    merch_lat_col = pick_col(df, ["merchant_lat", "lat_merchant", "merch_lat", "merchant_latitude"])
    merch_lon_col = pick_col(df, ["merchant_long", "merchant_lon", "lon_merchant", "merch_lon", "merchant_longitude"])

    if user_lat_col and user_lon_col and merch_lat_col and merch_lon_col:
        dist_km = haversine_km(
            safe_float(df[user_lat_col], 0.0).values,
            safe_float(df[user_lon_col], 0.0).values,
            safe_float(df[merch_lat_col], 0.0).values,
            safe_float(df[merch_lon_col], 0.0).values,
        )
    else:
        dist_km = np.zeros(len(df), dtype=float)

    df["_distance_km"] = dist_km

    # MCC code (as a simple numeric id + optional "risk bucket")
    mcc_col = pick_col(df, ["mcc", "mcc_code", "merchant_mcc"])
    if mcc_col:
        df["_mcc"] = safe_int(df[mcc_col], 0)
    else:
        df["_mcc"] = 0

    # If we have mcc_codes.json loaded into a DF, we can create "mcc_group_id"
    # (still numeric, safe)
    if mcc_df is not None:
        mcc_key = pick_col(mcc_df, ["mcc", "mcc_code", "code"])
        if mcc_key is None:
            mcc_key = mcc_df.columns[0]

        # create an index mapping mcc -> row number
        mcc_map = {str(k): i for i, k in enumerate(mcc_df[mcc_key].astype(str).values)}
        df["_mcc_group_id"] = df["_mcc"].astype(str).map(mcc_map).fillna(-1).astype(int)
    else:
        df["_mcc_group_id"] = -1

    feature_cols = [
        "_amount",
        "_hour_sin", "_hour_cos",
        "_dow_sin", "_dow_cos",
        "_card_limit",
        "_card_balance",
        "_utilization",
        "_distance_km",
        "_mcc",
        "_mcc_group_id",
    ]

    X = df[feature_cols].to_numpy(dtype=np.float32)
    return X, feature_cols


# -----------------------------
# Main
# -----------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="data/raw", help="Folder containing raw dataset files")
    parser.add_argument("--out_dir", default="data/processed", help="Folder to write processed outputs")
    parser.add_argument("--artifacts_dir", default="artifacts/fraud_tf", help="Folder to write metadata (feature names etc.)")

    # ✅ This is what you need
    parser.add_argument("--max_rows", type=int, default=500_000, help="Max labeled rows to keep (for faster training)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test_size", type=float, default=0.15)
    parser.add_argument("--val_size", type=float, default=0.15)

    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    out_dir = Path(args.out_dir)
    artifacts_dir = Path(args.artifacts_dir)

    out_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    transactions_path = data_dir / "transactions_data.csv"
    users_path = data_dir / "users_data.csv"
    cards_path = data_dir / "cards_data.csv"
    mcc_path = data_dir / "mcc_codes.json"
    labels_path = data_dir / "train_fraud_labels.json"

    # --- Load raw files ---
    if not transactions_path.exists():
        raise FileNotFoundError(f"Missing: {transactions_path}")

    print(f"✅ Loading transactions: {transactions_path}")
    tx = read_csv(transactions_path)

    users = None
    if users_path.exists():
        print(f"✅ Loading users: {users_path}")
        users = read_csv(users_path)

    cards = None
    if cards_path.exists():
        print(f"✅ Loading cards: {cards_path}")
        cards = read_csv(cards_path)

    mcc_df = None
    if mcc_path.exists():
        print(f"✅ Loading MCC codes: {mcc_path}")
        mcc_json = read_json(mcc_path)
        # mcc_codes.json can be dict or list → normalize to DataFrame
        if isinstance(mcc_json, dict):
            # common format: { "1234": {..}, "5678": {..} }
            mcc_df = pd.DataFrame(
                [{"mcc": str(k), **(v if isinstance(v, dict) else {})} for k, v in mcc_json.items()]
            )
        elif isinstance(mcc_json, list):
            mcc_df = pd.DataFrame(mcc_json)
        else:
            mcc_df = None

    if not labels_path.exists():
        raise FileNotFoundError(f"Missing labels file: {labels_path}")

    print(f"✅ Loading labels: {labels_path}")
    labels_json = read_json(labels_path)
    labels = parse_labels(labels_json)
    print(f"📌 Parsed labels rows: {len(labels):,}")
    print("📌 Labels head:")
    print(labels.head().to_string(index=False))

    # --- Identify transaction id column and align ---
    tx_id_col = pick_col(tx, ["transaction_id", "id", "trans_id"])
    if tx_id_col is None:
        raise ValueError("Could not find transaction id column in transactions_data.csv (tried transaction_id/id/trans_id).")

    tx["_transaction_id_str"] = tx[tx_id_col].astype(str)
    labels["transaction_id"] = labels["transaction_id"].astype(str)

    # --- Merge users/cards into tx (robust joins) ---
    # Users join on user_id (if possible)
    if users is not None:
        tx_user_col = pick_col(tx, ["user_id", "customer_id", "client_id"])
        users_user_col = pick_col(users, ["user_id", "customer_id", "client_id", "id"])
        if tx_user_col and users_user_col:
            users_small_cols = [users_user_col]

            # keep a few optional numeric columns if they exist (safe)
            for extra in ["age", "income", "user_lat", "user_long", "lat", "long", "lng"]:
                if extra in users.columns:
                    users_small_cols.append(extra)

            users_small = users[users_small_cols].drop_duplicates(users_user_col)
            users_small = users_small.rename(columns={users_user_col: "_join_user_id"})

            tx["_join_user_id"] = tx[tx_user_col]
            tx = tx.merge(users_small, on="_join_user_id", how="left")

    # Cards join on card_id (if possible)
    if cards is not None:
        tx_card_col = pick_col(tx, ["card_id", "payment_card_id"])
        cards_card_col = pick_col(cards, ["card_id", "id"])
        if tx_card_col and cards_card_col:
            keep_cols = [cards_card_col]
            for extra in ["credit_limit", "limit", "balance", "card_type", "card_brand"]:
                if extra in cards.columns:
                    keep_cols.append(extra)

            cards_small = cards[keep_cols].drop_duplicates(cards_card_col)
            cards_small = cards_small.rename(columns={cards_card_col: "_join_card_id"})

            tx["_join_card_id"] = tx[tx_card_col]
            tx = tx.merge(cards_small, on="_join_card_id", how="left")

    # --- Merge labels ---
    df = tx.merge(labels, left_on="_transaction_id_str", right_on="transaction_id", how="inner")

    if df.empty:
        raise ValueError("No labeled rows after merge. Check transaction_id matching between tx and labels.")

    print(f"�� Labeled rows after merge: {len(df):,}")
    fraud_rate = df["is_fraud"].mean()
    print(f"📌 Fraud rate: {fraud_rate:.4f}")

    # --- Limit rows for speed ---
    if args.max_rows and len(df) > args.max_rows:
        df = df.sample(n=args.max_rows, random_state=args.seed)
        df = df.reset_index(drop=True)
        print(f"✅ Downsampled to max_rows={args.max_rows:,}")

    # --- Build features ---
    X, feature_names = build_numeric_features(df, mcc_df)
    y = df["is_fraud"].astype(np.int64).to_numpy()

    # --- Split ---
    train_idx, val_idx, test_idx = split_indices(len(df), args.seed, args.test_size, args.val_size)

    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # --- Save ---
    out_path = out_dir / "fraud_dataset.npz"
    np.savez_compressed(
        out_path,
        X_train=X_train, y_train=y_train,
        X_val=X_val, y_val=y_val,
        X_test=X_test, y_test=y_test,
    )

    meta = {
        "feature_names": feature_names,
        "n_train": int(len(train_idx)),
        "n_val": int(len(val_idx)),
        "n_test": int(len(test_idx)),
        "fraud_rate": float(fraud_rate),
        "max_rows": int(args.max_rows),
        "seed": int(args.seed),
    }
    (artifacts_dir / "preprocess_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"\n✅ Saved dataset: {out_path}")
    print(f"✅ Saved metadata: {artifacts_dir / 'preprocess_meta.json'}")
    print(f"Shapes:")
    print(f"  X_train: {X_train.shape}  y_train: {y_train.shape}")
    print(f"  X_val:   {X_val.shape}  y_val:   {y_val.shape}")
    print(f"  X_test:  {X_test.shape}  y_test:  {y_test.shape}")


if __name__ == "__main__":
    main()

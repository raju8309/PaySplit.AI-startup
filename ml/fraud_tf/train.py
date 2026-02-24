# ml/fraud_tf/train.py

import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.metrics import roc_auc_score, average_precision_score


def build_model(input_dim: int, X_train: np.ndarray, y_train: np.ndarray) -> tf.keras.Model:
    # Normalization layer (fit only on train)
    norm = tf.keras.layers.Normalization(axis=-1)
    norm.adapt(X_train)

    # Initialize bias using fraud rate
    pos_rate = float(np.clip(y_train.mean(), 1e-6, 1 - 1e-6))
    init_bias = np.log(pos_rate / (1.0 - pos_rate))

    inputs = tf.keras.Input(shape=(input_dim,), name="features")
    x = norm(inputs)

    x = tf.keras.layers.Dense(128, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    x = tf.keras.layers.Dense(32, activation="relu")(x)

    outputs = tf.keras.layers.Dense(
        1,
        activation="sigmoid",
        bias_initializer=tf.keras.initializers.Constant(init_bias),
        name="fraud_prob",
    )(x)

    return tf.keras.Model(inputs, outputs)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--npz", type=str, required=True)
    parser.add_argument("--artifacts_dir", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch_size", type=int, default=2048)
    parser.add_argument("--lr", type=float, default=3e-4)
    args = parser.parse_args()

    data = np.load(args.npz)

    X_train = data["X_train"].astype(np.float32)
    y_train = data["y_train"].astype(np.int32)
    X_val = data["X_val"].astype(np.float32)
    y_val = data["y_val"].astype(np.int32)

    print("Train fraud rate:", y_train.mean())
    print("Val fraud rate:", y_val.mean())

    # Class weight (capped)
    neg = int((y_train == 0).sum())
    pos = int((y_train == 1).sum())
    pos_weight = min(neg / max(pos, 1), 50.0)
    class_weight = {0: 1.0, 1: pos_weight}
    print("Class weight:", class_weight)

    model = build_model(X_train.shape[1], X_train, y_train)

    optimizer = tf.keras.optimizers.legacy.Adam(
        learning_rate=args.lr,
        clipnorm=1.0
    )

    model.compile(
        optimizer=optimizer,
        loss=tf.keras.losses.BinaryCrossentropy(),
        metrics=[
            tf.keras.metrics.AUC(name="auc_roc", curve="ROC"),
            tf.keras.metrics.AUC(name="auc_pr", curve="PR"),
        ],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_auc_pr",
            mode="max",
            patience=3,
            restore_best_weights=True,
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(Path(args.artifacts_dir) / "fraud_tf_model_best.keras"),
            monitor="val_auc_pr",
            mode="max",
            save_best_only=True,
        ),
    ]

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        class_weight=class_weight,
        callbacks=callbacks,
        verbose=1,
    )

    Path(args.artifacts_dir).mkdir(parents=True, exist_ok=True)

    model.save(Path(args.artifacts_dir) / "fraud_tf_model_final.keras")

    with open(Path(args.artifacts_dir) / "train_history.json", "w") as f:
        json.dump(history.history, f, indent=2)

    # Quick check
    probs = model.predict(X_val, verbose=0).reshape(-1)
    print("\nVal AUC-ROC:", roc_auc_score(y_val, probs))
    print("Val AUC-PR :", average_precision_score(y_val, probs))


if __name__ == "__main__":
    main()
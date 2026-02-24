# ml/models/card_recommender.py
"""
PaySplit.AI — Card Recommender (PyTorch)

What this file does:
- Defines a small neural net that outputs allocation % across up to 3 cards.
- Trains on synthetic data (for demo) and saves the model to ml/artifacts/card_recommender.pt
- Loads the saved model on startup (FastAPI safe).
- Works even if the saved file is either:
  A) raw PyTorch state_dict
  B) a checkpoint dict {"state_dict": ..., "num_features": ...}
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn


# Resolve repo root reliably (works even when backend runs from /backend)
# File: <repo>/ml/models/card_recommender.py
REPO_ROOT = Path(__file__).resolve().parents[2]  # <repo>
DEFAULT_MODEL_PATH = REPO_ROOT / "ml" / "artifacts" / "card_recommender.pt"


class CardRecommenderNet(nn.Module):
    def __init__(self, num_features: int = 9):
        super().__init__()
        self.num_features = num_features
        self.network = nn.Sequential(
            nn.Linear(num_features, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 3),
            nn.Softmax(dim=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


class CardRecommender:
    """
    Recommend how to split a transaction across up to 3 cards.

    Important:
    - This is a demo model trained on synthetic rules.
    - Real product would train on real user/card/merchant reward outcomes.
    """

    PAYSPLIT_FEE = 0.005  # 0.5%

    def __init__(
        self,
        model_path: Path | str = DEFAULT_MODEL_PATH,
        auto_train_if_missing: bool = False,
        seed: int = 42,
    ):
        self.model_path = Path(model_path)
        self.seed = seed
        self.model = CardRecommenderNet(num_features=9)

        if self.model_path.exists():
            self._load()
        else:
            if not auto_train_if_missing:
                raise FileNotFoundError(
                    f"Card recommender model not found at: {self.model_path}\n"
                    f"Run: python3 ml/models/card_recommender.py --train"
                )
            self._train_synthetic()
            self._save()

        self.model.eval()

    # ---------------------------
    # Save / Load (robust)
    # ---------------------------
    def _save(self) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)

        # Save as checkpoint dict (recommended)
        torch.save(
            {
                "state_dict": self.model.state_dict(),
                "num_features": self.model.num_features,
                "seed": self.seed,
            },
            self.model_path,
        )

        print(f"✅ Saved card recommender model to: {self.model_path}")

    def _load(self) -> None:
        obj = torch.load(self.model_path, map_location="cpu")

        # Case A: checkpoint dict
        if isinstance(obj, dict) and "state_dict" in obj:
            state = obj["state_dict"]
            # Optional: sanity check expected input features
            num_features = obj.get("num_features", 9)
            if num_features != self.model.num_features:
                # Not fatal, but warns you early
                print(
                    f"⚠️ Warning: model num_features={num_features} but code expects {self.model.num_features}."
                )
        else:
            # Case B: raw state_dict
            state = obj

        self.model.load_state_dict(state)
        print(f"✅ Loaded card recommender model from: {self.model_path}")

    # ---------------------------
    # Training (synthetic demo)
    # ---------------------------
    def _train_synthetic(self, n_samples: int = 500, epochs: int = 50) -> None:
        print("Training card recommender (synthetic)...")
        np.random.seed(self.seed)
        torch.manual_seed(self.seed)

        X_train: List[List[float]] = []
        y_train: List[List[float]] = []

        # Features (9):
        # [txn_amount,
        #  card1_limit, card1_balance, card1_rewards,
        #  card2_limit, card2_balance, card2_rewards,
        #  card3_limit, card3_balance]
        for _ in range(n_samples):
            txn_amount = np.random.uniform(10, 500)

            card1_limit = np.random.uniform(500, 2000)
            card1_balance = np.random.uniform(0, card1_limit * 0.7)

            card2_limit = np.random.uniform(500, 2000)
            card2_balance = np.random.uniform(0, card2_limit * 0.7)

            card3_limit = np.random.uniform(500, 2000)
            card3_balance = np.random.uniform(0, card3_limit * 0.7)

            card1_rewards = 0.01
            card2_rewards = 0.01

            features = [
                float(txn_amount),
                float(card1_limit),
                float(card1_balance),
                float(card1_rewards),
                float(card2_limit),
                float(card2_balance),
                float(card2_rewards),
                float(card3_limit),
                float(card3_balance),
            ]

            avail1 = card1_limit - card1_balance
            avail2 = card2_limit - card2_balance
            avail3 = card3_limit - card3_balance

            # Simple rule target:
            # - If one card can cover it fully, allocate 100% there
            # - Else split proportionally by available balance
            if avail1 >= txn_amount:
                allocation = [1.0, 0.0, 0.0]
            elif avail2 >= txn_amount:
                allocation = [0.0, 1.0, 0.0]
            elif avail3 >= txn_amount:
                allocation = [0.0, 0.0, 1.0]
            else:
                total = max(avail1 + avail2 + avail3, 1e-6)
                allocation = [avail1 / total, avail2 / total, avail3 / total]

            X_train.append(features)
            y_train.append([float(a) for a in allocation])

        X = torch.tensor(X_train, dtype=torch.float32)
        y = torch.tensor(y_train, dtype=torch.float32)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-3)
        criterion = nn.MSELoss()

        self.model.train()
        for epoch in range(epochs):
            optimizer.zero_grad()
            out = self.model(X)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()

            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}")

        self.model.eval()
        print("Training complete!")

    # ---------------------------
    # Inference
    # ---------------------------
    def recommend(
        self,
        transaction_amount: float,
        cards: List[Dict],
        free_trial: bool = False,
        merchant: Optional[str] = None,
    ) -> Dict:
        """
        cards: list of dicts with keys like: id, name, limit, balance, rewards_rate
        Supports 1-3 cards. (If fewer than 3, missing cards are padded.)
        """
        if not cards:
            raise ValueError("cards list cannot be empty")

        # Build 9 features (pad missing cards)
        def get_card(i: int) -> Dict:
            if i < len(cards):
                return cards[i]
            return {"id": f"card_{i+1}", "name": f"Card {i+1}", "limit": 1000, "balance": 0, "rewards_rate": 0.01}

        c1 = get_card(0)
        c2 = get_card(1)
        c3 = get_card(2)

        features = [
            float(transaction_amount),
            float(c1.get("limit", 1000)),
            float(c1.get("balance", 0)),
            float(c1.get("rewards_rate", 0.01)),
            float(c2.get("limit", 1000)),
            float(c2.get("balance", 0)),
            float(c2.get("rewards_rate", 0.01)),
            float(c3.get("limit", 1000)),
            float(c3.get("balance", 0)),
        ]

        with torch.no_grad():
            x = torch.tensor([features], dtype=torch.float32)
            allocation_pcts = self.model(x)[0].cpu().numpy()  # shape (3,)

        total_fee = 0.0 if free_trial else float(transaction_amount) * self.PAYSPLIT_FEE

        allocations = []
        for i, pct in enumerate(allocation_pcts):
            card = get_card(i)
            amount = float(transaction_amount) * float(pct)

            # Ignore tiny dust allocations
            if amount > 0.01:
                allocations.append(
                    {
                        "card_id": card.get("id", f"card_{i+1}"),
                        "card_name": card.get("name", f"Card {i+1}"),
                        "amount": round(amount, 2),
                        "percentage": round(float(pct) * 100, 1),
                    }
                )

        # Re-normalize percentages to 100 if rounding caused drift
        pct_sum = sum(a["percentage"] for a in allocations) or 100.0
        if abs(pct_sum - 100.0) > 0.2 and allocations:
            scale = 100.0 / pct_sum
            for a in allocations:
                a["percentage"] = round(a["percentage"] * scale, 1)

        return {
            "allocations": allocations,
            "transaction_amount": float(transaction_amount),
            "merchant": merchant,
            "paysplit_fee": round(total_fee, 2),
            "total_charged": round(float(transaction_amount) + total_fee, 2),
            "free_trial": bool(free_trial),
        }


# ---------------------------
# CLI
# ---------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true", help="Train & save model to ml/artifacts/card_recommender.pt")
    args = parser.parse_args()

    if args.train:
        rec = CardRecommender(auto_train_if_missing=True)
        # If file existed, it loaded; force retrain + overwrite for consistency
        rec._train_synthetic()
        rec._save()

    # Demo run (loads model from disk if present)
    rec = CardRecommender(auto_train_if_missing=False)

    demo_cards = [
        {"id": 1, "name": "Chase Sapphire", "limit": 2000, "balance": 500, "rewards_rate": 0.02},
        {"id": 2, "name": "AmEx Gold", "limit": 1500, "balance": 200, "rewards_rate": 0.03},
        {"id": 3, "name": "Capital One", "limit": 1000, "balance": 800, "rewards_rate": 0.01},
    ]

    print("\n🆓 FREE TRIAL (First Week):")
    r1 = rec.recommend(transaction_amount=50.0, cards=demo_cards, free_trial=True, merchant="DoorDash")
    print("Transaction:", r1["transaction_amount"])
    print("PaySplit Fee:", r1["paysplit_fee"])
    print("Total:", r1["total_charged"])
    print("Allocations:", r1["allocations"])

    print("\n💳 AFTER FREE TRIAL:")
    r2 = rec.recommend(transaction_amount=50.0, cards=demo_cards, free_trial=False, merchant="DoorDash")
    print("Transaction:", r2["transaction_amount"])
    print("PaySplit Fee:", r2["paysplit_fee"])
    print("Total:", r2["total_charged"])
    print("Allocations:", r2["allocations"])


if __name__ == "__main__":
    main()
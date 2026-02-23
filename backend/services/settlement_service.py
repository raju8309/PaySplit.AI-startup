from typing import Dict, List, Optional

# ── AI: Card reward rules by merchant category ─────────────────────────────
CATEGORY_REWARDS = {
    "dining": {
        "amex_gold": 4.0,
        "chase_sapphire": 3.0,
        "citi_double": 2.0,
        "default": 1.0,
    },
    "groceries": {
        "amex_gold": 4.0,
        "amex_blue": 3.0,
        "citi_double": 2.0,
        "default": 1.0,
    },
    "travel": {
        "chase_sapphire": 5.0,
        "amex_platinum": 5.0,
        "citi_double": 2.0,
        "default": 1.0,
    },
    "shopping": {
        "amazon_prime": 5.0,
        "citi_double": 2.0,
        "default": 1.0,
    },
    "general": {
        "citi_double": 2.0,
        "default": 1.5,
    },
}

# ── AI: Detect merchant category from name ─────────────────────────────────
def detect_category(merchant: str) -> str:
    merchant = merchant.lower()
    if any(x in merchant for x in ["doordash", "ubereats", "grubhub", "restaurant", "food", "pizza", "cafe"]):
        return "dining"
    if any(x in merchant for x in ["whole foods", "walmart", "kroger", "grocery", "trader joe"]):
        return "groceries"
    if any(x in merchant for x in ["united", "delta", "airbnb", "hotel", "flight", "uber", "lyft"]):
        return "travel"
    if any(x in merchant for x in ["amazon", "target", "bestbuy", "ebay", "shop"]):
        return "shopping"
    return "general"

# ── AI: Score a card for a given category ──────────────────────────────────
def get_reward_rate(card_name: str, category: str) -> float:
    card_key = card_name.lower().replace(" ", "_")
    rates = CATEGORY_REWARDS.get(category, CATEGORY_REWARDS["general"])
    return rates.get(card_key, rates.get("default", 1.0))

# ── AI: Find optimal split across multiple cards ───────────────────────────
def ai_optimize_split(
    total_cents: int,
    cards: List[dict],
    merchant: str = "general"
) -> dict:
    """
    AI optimizer: finds the best way to split a payment across cards
    to maximize total cashback rewards.

    Args:
        total_cents: total amount in cents
        cards: list of {"name": str, "limit_cents": int}
        merchant: merchant name for category detection

    Returns:
        {
          "splits": [...],
          "total_reward_cents": int,
          "category": str,
          "recommendation": str
        }
    """
    if not cards:
        return {"error": "No cards provided"}

    category = detect_category(merchant)

    # Score each card by reward rate
    scored_cards = []
    for card in cards:
        rate = get_reward_rate(card["name"], category)
        scored_cards.append({
            "name": card["name"],
            "limit_cents": card.get("limit_cents", total_cents),
            "rate": rate,
        })

    # Sort cards by reward rate (highest first)
    scored_cards.sort(key=lambda x: x["rate"], reverse=True)

    # Greedily allocate to highest-reward card first
    splits = []
    remaining = total_cents

    for card in scored_cards:
        if remaining <= 0:
            break
        allocate = min(remaining, card["limit_cents"])
        if allocate > 0:
            reward = int(allocate * card["rate"] / 100)
            splits.append({
                "card": card["name"],
                "amount_cents": allocate,
                "reward_rate_pct": card["rate"],
                "reward_cents": reward,
            })
            remaining -= allocate

    total_reward = sum(s["reward_cents"] for s in splits)

    best = splits[0] if splits else None
    recommendation = (
        f"Put ${splits[0]['amount_cents']/100:.2f} on {splits[0]['card']} "
        f"({splits[0]['reward_rate_pct']}% back = ${splits[0]['reward_cents']/100:.2f}) "
        f"for maximum {category} rewards."
        if best else "No recommendation available."
    )

    return {
        "splits": splits,
        "total_reward_cents": total_reward,
        "category": category,
        "merchant": merchant,
        "recommendation": recommendation,
    }

# ── AI: Compare naive equal split vs AI split rewards ──────────────────────
def compare_splits(total_cents: int, cards: List[dict], merchant: str = "general") -> dict:
    """Shows how much more reward AI split gives vs equal split."""
    n = len(cards)
    if n == 0:
        return {}

    category = detect_category(merchant)
    equal_share = total_cents // n
    equal_reward = sum(
        int(equal_share * get_reward_rate(c["name"], category) / 100)
        for c in cards
    )

    ai_result = ai_optimize_split(total_cents, cards, merchant)
    ai_reward = ai_result.get("total_reward_cents", 0)
    gain = ai_reward - equal_reward

    return {
        "equal_split_reward_cents": equal_reward,
        "ai_split_reward_cents": ai_reward,
        "gain_cents": gain,
        "gain_dollars": round(gain / 100, 2),
        "improvement_pct": round((gain / max(equal_reward, 1)) * 100, 1),
    }


# ── Existing: Calculate balances ───────────────────────────────────────────
def calculate_balances(expenses: List[dict]) -> Dict[str, int]:
    balances: Dict[str, int] = {}
    all_people = set()

    for e in expenses:
        payer = e["payer"]
        amount = int(e["amount_cents"])
        split_type = e.get("split_type", "equal")
        members = e.get("members") or []
        splits = e.get("splits") or []

        all_people.add(payer)
        for m in members:
            all_people.add(m)
        for s in splits:
            all_people.add(s["user"])

        balances[payer] = balances.get(payer, 0) + amount

        if split_type == "equal":
            if not members:
                raise ValueError("Equal split requires 'members'")
            share = amount // len(members)
            remainder = amount % len(members)
            for i, m in enumerate(sorted(members)):
                owe = share + (1 if i < remainder else 0)
                balances[m] = balances.get(m, 0) - owe

        elif split_type == "custom":
            if not splits:
                raise ValueError("Custom split requires 'splits'")
            total = 0
            for s in splits:
                user = s["user"]
                raw = s.get("amount_cents")
                owe = int(raw) if raw is not None else 0
                total += owe
                balances[user] = balances.get(user, 0) - owe
            if total != amount:
                raise ValueError(
                    f"Custom splits must sum to amount_cents. Got {total}, expected {amount}"
                )

        elif split_type == "percentage":
            if not splits:
                raise ValueError("Percentage split requires 'splits'")
            total_allocated = 0
            for s in splits:
                user = s["user"]
                pct = float(s.get("percentage") or 0)
                owe = int(amount * (pct / 100.0))
                total_allocated += owe
                balances[user] = balances.get(user, 0) - owe
            remainder = amount - total_allocated
            if remainder != 0 and splits:
                first_user = splits[0]["user"]
                balances[first_user] = balances.get(first_user, 0) - remainder

        else:
            raise ValueError("Invalid split_type (use: equal, custom, percentage)")

        for person in all_people:
            balances.setdefault(person, 0)

    return balances


# ── Existing: Minimize transactions ───────────────────────────────────────
def minimize_transactions(balances: Dict[str, int]) -> List[dict]:
    debtors = [(name, -bal) for name, bal in balances.items() if bal < 0]
    creditors = [(name, bal) for name, bal in balances.items() if bal > 0]

    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)

    txs = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d_name, d_amt = debtors[i]
        c_name, c_amt = creditors[j]
        pay = min(d_amt, c_amt)
        txs.append({"from": d_name, "to": c_name, "amount_cents": pay})
        d_amt -= pay
        c_amt -= pay
        debtors[i] = (d_name, d_amt)
        creditors[j] = (c_name, c_amt)
        if d_amt == 0:
            i += 1
        if c_amt == 0:
            j += 1

    return txs
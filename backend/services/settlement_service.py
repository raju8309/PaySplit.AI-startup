from typing import Dict, List, Tuple


def calculate_balances(expenses: List[dict]) -> Dict[str, int]:
    """
    Net balances in cents.

    Convention:
    + positive => should RECEIVE
    - negative => OWES

    Supported split types:
      - equal
      - custom
      - percentage
    """

    balances: Dict[str, int] = {}
    all_people = set()

    for e in expenses:
        payer = e["payer"]
        amount = int(e["amount_cents"])
        split_type = e.get("split_type", "equal")
        members = e.get("members") or []
        splits = e.get("splits") or []

        # Track everyone who appears anywhere
        all_people.add(payer)
        for m in members:
            all_people.add(m)
        for s in splits:
            all_people.add(s["user"])

        # payer paid full amount
        balances[payer] = balances.get(payer, 0) + amount

        if split_type == "equal":
            if not members:
                raise ValueError("Equal split requires 'members'")

            share = amount // len(members)
            remainder = amount % len(members)

            # deterministic remainder distribution
            for i, m in enumerate(sorted(members)):
                owe = share + (1 if i < remainder else 0)
                balances[m] = balances.get(m, 0) - owe

        elif split_type == "custom":
            if not splits:
                raise ValueError("Custom split requires 'splits'")

            total = 0
            for s in splits:
                user = s["user"]
                owe = int(s["amount_cents"])
                total += owe
                balances[user] = balances.get(user, 0) - owe

            if total != amount:
                raise ValueError(f"Custom splits must sum to amount_cents. Got {total}, expected {amount}")

        elif split_type == "percentage":
            if not splits:
                raise ValueError("Percentage split requires 'splits'")

            total_allocated = 0

            # floor allocation
            for s in splits:
                user = s["user"]
                pct = float(s["percentage"])
                owe = int(amount * (pct / 100.0))
                total_allocated += owe
                balances[user] = balances.get(user, 0) - owe

            # remainder cents: assign to first split user deterministically
            remainder = amount - total_allocated
            if remainder != 0:
                first_user = splits[0]["user"]
                balances[first_user] = balances.get(first_user, 0) - remainder

        else:
            raise ValueError("Invalid split_type (use: equal, custom, percentage)")

    # ✅ IMPORTANT: Ensure everyone appears, even if their balance is 0
    for person in all_people:
        balances.setdefault(person, 0)

    return balances


def minimize_transactions(balances: Dict[str, int]) -> List[Tuple[str, str, int]]:
    """
    Convert balances into transactions (greedy).
    Returns list of (from_user, to_user, amount_cents).
    """
    debtors = [(name, -bal) for name, bal in balances.items() if bal < 0]
    creditors = [(name, bal) for name, bal in balances.items() if bal > 0]

    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)

    txs: List[Tuple[str, str, int]] = []
    i = j = 0

    while i < len(debtors) and j < len(creditors):
        d_name, d_amt = debtors[i]
        c_name, c_amt = creditors[j]

        pay = min(d_amt, c_amt)
        txs.append((d_name, c_name, pay))

        d_amt -= pay
        c_amt -= pay

        debtors[i] = (d_name, d_amt)
        creditors[j] = (c_name, c_amt)

        if d_amt == 0:
            i += 1
        if c_amt == 0:
            j += 1

    return txs
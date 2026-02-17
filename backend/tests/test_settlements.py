import pytest

from backend.services.settlement_service import calculate_balances, minimize_transactions


def cents(dollars: float) -> int:
    return int(round(dollars * 100))


def assert_conservation(balances: dict):
    # Sum of all net balances must be exactly 0 cents
    assert sum(balances.values()) == 0


# -------------------------
# Equal Split Tests
# -------------------------

def test_equal_split_two_people_one_expense():
    expenses = [
        {
            "payer": "Alice",
            "amount_cents": cents(100),
            "members": ["Alice", "Bob"],
            "split_type": "equal",
        }
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    assert balances["Alice"] == cents(50)
    assert balances["Bob"] == -cents(50)

    txs = minimize_transactions(balances)
    assert txs == [("Bob", "Alice", cents(50))]


def test_equal_split_three_people_one_expense():
    expenses = [
        {
            "payer": "Alice",
            "amount_cents": cents(120),
            "members": ["Alice", "Bob", "Charlie"],
            "split_type": "equal",
        }
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    # Each owes 40; Alice paid 120 => +80
    assert balances["Alice"] == cents(80)
    assert balances["Bob"] == -cents(40)
    assert balances["Charlie"] == -cents(40)


def test_equal_split_multiple_expenses_group_total():
    expenses = [
        {"payer": "Alice", "amount_cents": cents(120), "members": ["Alice", "Bob", "Charlie"], "split_type": "equal"},
        {"payer": "Bob", "amount_cents": cents(60), "members": ["Alice", "Bob", "Charlie"], "split_type": "equal"},
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    # Total 180, each owes 60:
    # Alice: 120-60 = +60
    # Bob: 60-60 = 0
    # Charlie: 0-60 = -60
    assert balances["Alice"] == cents(60)
    assert balances["Bob"] == 0
    assert balances["Charlie"] == -cents(60)

    txs = minimize_transactions(balances)
    assert txs == [("Charlie", "Alice", cents(60))]


def test_equal_split_rounding_case_10_split_3():
    # $10.00 split 3 ways => 334, 333, 333 cents (remainder 1 cent)
    expenses = [
        {"payer": "Alice", "amount_cents": cents(10.00), "members": ["Alice", "Bob", "Charlie"], "split_type": "equal"}
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    # Non-payers should owe 333 and 333; payer should receive 666 or 667 depending remainder assignment.
    assert balances["Bob"] < 0
    assert balances["Charlie"] < 0
    assert balances["Alice"] > 0

    owed_by_non_payers = (-balances["Bob"]) + (-balances["Charlie"])
    assert owed_by_non_payers in (666, 667)


# -------------------------
# Custom Split Tests
# -------------------------

def test_custom_split_simple():
    # Alice paid $100; Alice owes $30; Bob owes $70
    # So Alice net +70, Bob net -70
    expenses = [
        {
            "payer": "Alice",
            "amount_cents": cents(100),
            "members": ["Alice", "Bob"],
            "split_type": "custom",
            "splits": [
                {"user": "Alice", "amount_cents": cents(30)},
                {"user": "Bob", "amount_cents": cents(70)},
            ],
        }
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    assert balances["Alice"] == cents(70)
    assert balances["Bob"] == -cents(70)

    txs = minimize_transactions(balances)
    assert txs == [("Bob", "Alice", cents(70))]


# -------------------------
# Percentage Split Tests
# -------------------------

def test_percentage_split_50_50():
    expenses = [
        {
            "payer": "Alice",
            "amount_cents": cents(100),
            "members": ["Alice", "Bob"],
            "split_type": "percentage",
            "splits": [
                {"user": "Alice", "percentage": 50},
                {"user": "Bob", "percentage": 50},
            ],
        }
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    assert balances["Alice"] == cents(50)
    assert balances["Bob"] == -cents(50)

    txs = minimize_transactions(balances)
    assert txs == [("Bob", "Alice", cents(50))]


def test_percentage_split_rounding_remainder():
    # 1001 cents @ 50/50 => 500 + 500 = 1000 remainder 1 cent
    # Our rule assigns remainder to the FIRST user in splits => Alice owes +1 cent more (balance -1 more)
    expenses = [
        {
            "payer": "Alice",
            "amount_cents": 1001,
            "members": ["Alice", "Bob"],
            "split_type": "percentage",
            "splits": [
                {"user": "Alice", "percentage": 50},
                {"user": "Bob", "percentage": 50},
            ],
        }
    ]
    balances = calculate_balances(expenses)
    assert_conservation(balances)

    # Alice paid full 1001. Alice owes 501, Bob owes 500
    # Alice net: 1001-501 = +500
    # Bob net: 0-500 = -500
    assert balances["Alice"] == 500
    assert balances["Bob"] == -500


# -------------------------
# Minimize Transactions Tests
# -------------------------

def test_minimize_transactions_basic():
    balances = {"A": 5000, "B": -2000, "C": -3000}
    txs = minimize_transactions(balances)

    assert ("B", "A", 2000) in txs
    assert ("C", "A", 3000) in txs
    assert all(amt > 0 for _, _, amt in txs)


def test_minimize_transactions_conservation():
    balances = {"A": 1000, "B": -1000}
    txs = minimize_transactions(balances)
    assert txs == [("B", "A", 1000)]

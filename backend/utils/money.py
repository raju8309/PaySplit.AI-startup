from decimal import Decimal, ROUND_HALF_UP

def dollars_to_cents(amount: float) -> int:
    """
    Convert dollars (float) to cents (int) safely using Decimal.
    Example: 10.01 -> 1001
    """
    dec = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(dec * 100)

def cents_to_dollars(cents: int) -> float:
    """
    Convert cents (int) to dollars (float).
    Example: 1001 -> 10.01
    """
    return float(Decimal(cents) / 100)

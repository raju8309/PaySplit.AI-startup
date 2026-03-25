from typing import Tuple, List

class TransactionCategorizer:
    CATEGORIES = [
        'Food & Dining',
        'Shopping',
        'Transportation',
        'Entertainment',
        'Bills & Utilities',
        'Travel',
        'Other'
    ]
    
    def __init__(self):
        self.keyword_map = {
            'doordash': 0, 'uber eats': 0, 'restaurant': 0, 'food': 0, 'pizza': 0,
            'amazon': 1, 'walmart': 1, 'target': 1, 'shopping': 1,
            'uber': 2, 'lyft': 2, 'gas': 2, 'taxi': 2,
            'netflix': 3, 'spotify': 3, 'movie': 3, 'game': 3,
            'electric': 4, 'water': 4, 'internet': 4, 'bill': 4,
            'hotel': 5, 'airbnb': 5, 'flight': 5, 'travel': 5,
        }
        print("Transaction categorizer initialized!")
    
    def categorize(self, description: str) -> Tuple[str, float]:
        desc_lower = description.lower()
        for keyword, cat_idx in self.keyword_map.items():
            if keyword in desc_lower:
                return self.CATEGORIES[cat_idx], 0.95
        return self.CATEGORIES[-1], 0.30

if __name__ == "__main__":
    categorizer = TransactionCategorizer()
    tests = [
        "DoorDash - Order #12345",
        "Amazon.com purchase",
        "Uber ride",
        "Netflix subscription"
    ]
    print("\n📊 Categorization:")
    for desc in tests:
        category, confidence = categorizer.categorize(desc)
        print(f"  '{desc}' → {category} ({confidence*100:.0f}%)")

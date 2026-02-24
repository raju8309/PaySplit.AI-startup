import torch
import torch.nn as nn
import numpy as np
from typing import List, Dict, Optional  # ← added Optional

class CardRecommenderNet(nn.Module):
    def __init__(self, num_features=9):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(num_features, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 3),
            nn.Softmax(dim=1)
        )
    
    def forward(self, x):
        return self.network(x)

class CardRecommender:
    PAYSPLIT_FEE = 0.005  # 0.5% fee
    
    def __init__(self):
        self.model = CardRecommenderNet()
        self._train_synthetic()
        self.model.eval()
    
    def _train_synthetic(self):
        print("Training card recommender...")
        np.random.seed(42)
        X_train = []
        y_train = []
        
        for _ in range(500):
            txn_amount = np.random.uniform(10, 500)
            card1_limit = np.random.uniform(500, 2000)
            card1_balance = np.random.uniform(0, card1_limit * 0.7)
            
            card2_limit = np.random.uniform(500, 2000)
            card2_balance = np.random.uniform(0, card2_limit * 0.7)
            
            card3_limit = np.random.uniform(500, 2000)
            card3_balance = np.random.uniform(0, card3_limit * 0.7)
            
            features = [txn_amount, card1_limit, card1_balance, 0.01,
                       card2_limit, card2_balance, 0.01, card3_limit, card3_balance]
            
            available1 = card1_limit - card1_balance
            available2 = card2_limit - card2_balance
            available3 = card3_limit - card3_balance
            
            # Smart allocation based on available balance
            if available1 >= txn_amount:
                allocation = [1.0, 0.0, 0.0]
            elif available2 >= txn_amount:
                allocation = [0.0, 1.0, 0.0]
            elif available3 >= txn_amount:
                allocation = [0.0, 0.0, 1.0]
            else:
                total = available1 + available2 + available3
                allocation = [available1/total, available2/total, available3/total]
            
            X_train.append(features)
            y_train.append(allocation)
        
        X_train = torch.FloatTensor(X_train)
        y_train = torch.FloatTensor(y_train)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        criterion = nn.MSELoss()
        
        self.model.train()
        for epoch in range(50):
            optimizer.zero_grad()
            outputs = self.model(X_train)
            loss = criterion(outputs, y_train)
            loss.backward()
            optimizer.step()
            
            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/50], Loss: {loss.item():.4f}")
        
        self.model.eval()
        print("Training complete!")
    
    def recommend(self, transaction_amount: float, cards: List[Dict], free_trial: bool = False, merchant: Optional[str] = None) -> Dict:  # ← added merchant
        features = [transaction_amount]
        
        # Card 1
        features.extend([
            cards[0].get('limit', 1000),
            cards[0].get('balance', 0),
            0.01
        ])
        
        # Card 2
        features.extend([
            cards[1].get('limit', 1000) if len(cards) > 1 else 1000,
            cards[1].get('balance', 0) if len(cards) > 1 else 0,
            0.01
        ])
        
        # Card 3
        features.extend([
            cards[2].get('limit', 1000) if len(cards) > 2 else 1000,
            cards[2].get('balance', 0) if len(cards) > 2 else 0
        ])
        
        with torch.no_grad():
            X = torch.FloatTensor([features])
            allocation_pcts = self.model(X)[0].numpy()
        
        allocations = []
        total_fee = 0 if free_trial else transaction_amount * self.PAYSPLIT_FEE
        
        for i, (pct, card) in enumerate(zip(allocation_pcts, cards)):
            amount = float(transaction_amount * pct)
            
            if amount > 0.01:
                allocations.append({
                    'card_id': card.get('id', f'card_{i+1}'),
                    'card_name': card.get('name', f'Card {i+1}'),
                    'amount': round(amount, 2),
                    'percentage': round(float(pct) * 100, 1)
                })
        
        return {
            'allocations': allocations,
            'transaction_amount': transaction_amount,
            'merchant': merchant,  # ← added merchant to response
            'paysplit_fee': round(total_fee, 2),
            'total_charged': round(transaction_amount + total_fee, 2),
            'free_trial': free_trial
        }

if __name__ == "__main__":
    recommender = CardRecommender()
    
    # Free trial (first week)
    print("\n🆓 FREE TRIAL (First Week):")
    result = recommender.recommend(
        transaction_amount=50.0,
        cards=[
            {'id': 1, 'name': 'Chase Sapphire', 'limit': 2000, 'balance': 500},
            {'id': 2, 'name': 'AmEx Gold', 'limit': 1500, 'balance': 200},
            {'id': 3, 'name': 'Capital One', 'limit': 1000, 'balance': 800},
        ],
        free_trial=True
    )
    print(f"Transaction: ${result['transaction_amount']}")
    print(f"PaySplit Fee: ${result['paysplit_fee']} (FREE during trial)")
    print(f"Total: ${result['total_charged']}")
    print(f"\nAllocations:")
    for alloc in result['allocations']:
        print(f"  {alloc['card_name']}: ${alloc['amount']} ({alloc['percentage']}%)")
    
    # After free trial
    print("\n\n💳 AFTER FREE TRIAL:")
    result = recommender.recommend(
        transaction_amount=50.0,
        cards=[
            {'id': 1, 'name': 'Chase Sapphire', 'limit': 2000, 'balance': 500},
            {'id': 2, 'name': 'AmEx Gold', 'limit': 1500, 'balance': 200},
            {'id': 3, 'name': 'Capital One', 'limit': 1000, 'balance': 800},
        ],
        free_trial=False
    )
    print(f"Transaction: ${result['transaction_amount']}")
    print(f"PaySplit Fee (0.5%): ${result['paysplit_fee']}")
    print(f"Total Charged: ${result['total_charged']}")
    print(f"\nAllocations:")
    for alloc in result['allocations']:
        print(f"  {alloc['card_name']}: ${alloc['amount']} ({alloc['percentage']}%)")
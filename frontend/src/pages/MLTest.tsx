import { useState } from 'react';

interface Card {
  id: number;
  name: string;
  limit: number;
  balance: number;
  rewards_rate: number;
  category_multipliers: { [key: string]: number };
}

interface Allocation {
  card_id: number;
  card_name: string;
  amount: number;
  percentage: number;
  rewards_rate: number;
  rewards_earned: number;
}

export default function MLTest() {
  const [amount, setAmount] = useState(100);
  const [merchant, setMerchant] = useState('DoorDash');
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [freeTrial, setFreeTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([1, 2, 3]);

  const demoCards: Card[] = [
    {
      id: 1,
      name: 'Chase Sapphire',
      limit: 2000,
      balance: 500,
      rewards_rate: 0.02,
      category_multipliers: {
        'Food & Dining': 0.03,
        'Travel': 0.05
      }
    },
    {
      id: 2,
      name: 'AmEx Gold',
      limit: 1500,
      balance: 200,
      rewards_rate: 0.01,
      category_multipliers: {
        'Food & Dining': 0.04,
        'Shopping': 0.02
      }
    },
    {
      id: 3,
      name: 'Capital One',
      limit: 1000,
      balance: 800,
      rewards_rate: 0.015,
      category_multipliers: {}
    }
  ];

  const toggleCard = (cardId: number) => {
    if (selectedCardIds.includes(cardId)) {
      if (selectedCardIds.length === 1) {
        alert('You must select at least one card!');
        return;
      }
      setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
    } else {
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    setRecommendation(null);
    
    try {
      const cardsToUse = manualMode 
        ? demoCards.filter(card => selectedCardIds.includes(card.id))
        : demoCards;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ml/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_amount: amount,
          cards: cardsToUse,
          free_trial: freeTrial,
          merchant: merchant
        })
      });
      
      if (!response.ok) throw new Error('Failed to connect to ML API');
      const result = await response.json();
      
      if (result.error) {
        setError(result.message);
      } else {
        setRecommendation(result);
      }
    } catch (error) {
      console.error('Error:', error);
      setError('ML API Error - Is backend running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">🤖 PaySplit.ai</h1>
        <p className="text-center text-gray-700 mb-8 font-medium">AI-Powered Rewards Optimization</p>
        
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Smart Split with Rewards</h2>
          
          {/* Merchant Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-800">Merchant</label>
            <select
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 font-medium bg-white"
            >
              <option value="DoorDash">🍕 DoorDash (Food)</option>
              <option value="Amazon">📦 Amazon (Shopping)</option>
              <option value="Uber">🚗 Uber (Transportation)</option>
              <option value="Delta Airlines">✈️ Delta (Travel)</option>
              <option value="Netflix">🎬 Netflix (Entertainment)</option>
            </select>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-800">Transaction Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 font-semibold text-lg"
            />
          </div>

          {/* Manual Mode Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={manualMode}
                onChange={(e) => setManualMode(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-base font-bold text-gray-900">Manual Card Selection</span>
            </label>

            {/* Card Selection */}
            {manualMode && (
              <div className="ml-8 space-y-3 p-5 bg-gray-100 rounded-lg border-2 border-gray-300">
                <p className="text-sm font-bold text-gray-800 mb-3">Choose which cards to use:</p>
                {demoCards.map(card => {
                  const available = card.limit - card.balance;
                  const isSelected = selectedCardIds.includes(card.id);
                  
                  return (
                    <label 
                      key={card.id} 
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                        isSelected 
                          ? 'border-cyan-600 bg-cyan-50 shadow-md' 
                          : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCard(card.id)}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-base text-gray-900">{card.name}</div>
                        <div className="text-sm font-semibold text-gray-700 mt-1">
                          ${available} available • {card.rewards_rate * 100}% base rewards
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Free Trial */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={freeTrial}
                onChange={(e) => setFreeTrial(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-base font-semibold text-gray-900">Free Trial (No 0.5% fee)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="w-full bg-cyan-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-cyan-600 disabled:opacity-50 shadow-lg hover:shadow-xl transition"
          >
            {loading ? 'Optimizing Rewards...' : manualMode ? 'Split with Selected Cards ✨' : 'Get Best Rewards Split ✨'}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-lg shadow">
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-red-900 mb-1">Error</h3>
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {recommendation && !error && (
            <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-300 shadow-md">
              {/* Manual Mode Indicator */}
              {manualMode && (
                <div className="mb-4 p-3 bg-blue-100 border-2 border-blue-400 rounded-lg">
                  <p className="text-sm font-bold text-blue-900">
                    👤 Manual Mode: Using only your selected cards
                  </p>
                </div>
              )}

              {/* Category Badge */}
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-full text-sm font-bold shadow">
                  📊 Category: {recommendation.merchant_category}
                </span>
              </div>

              <h3 className="font-bold mb-4 text-xl text-gray-900">
                💡 {manualMode ? 'Your Custom Split:' : 'Optimized Allocation:'}
              </h3>
              
              {/* Allocations */}
              {recommendation.allocations.map((alloc: Allocation) => (
                <div key={alloc.card_id} className="mb-3 p-4 bg-white rounded-lg border-l-4 border-green-600 shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{alloc.card_name}</span>
                      <span className="ml-2 text-xs bg-green-200 text-green-900 px-3 py-1 rounded-full font-bold">
                        {alloc.rewards_rate}% rewards
                      </span>
                    </div>
                    <span className="text-cyan-600 font-bold text-2xl">${alloc.amount}</span>
                  </div>
                  <div className="text-sm text-gray-800 mt-2 flex justify-between font-semibold">
                    <span>{alloc.percentage}% of transaction</span>
                    <span className="text-green-700 font-bold">+${alloc.rewards_earned} earned</span>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-5 pt-4 border-t-2 border-gray-300 space-y-3">
                <div className="flex justify-between text-base font-semibold text-gray-900">
                  <span>Transaction:</span>
                  <span>${recommendation.transaction_amount}</span>
                </div>
                
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-gray-900">Total Rewards Earned:</span>
                  <span className="text-green-700 font-bold">+${recommendation.total_rewards_earned}</span>
                </div>

                <div className="flex justify-between text-base font-semibold">
                  <span className="text-gray-900">PaySplit Fee (0.5%):</span>
                  <span className={recommendation.free_trial ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                    {recommendation.free_trial ? '+' : '-'}${recommendation.paysplit_fee} {recommendation.free_trial && '✅ FREE'}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-xl border-t-2 border-gray-400 pt-3">
                  <span className="text-gray-900">Net Benefit:</span>
                  <span className={recommendation.net_benefit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {recommendation.net_benefit >= 0 ? '+' : ''}${recommendation.net_benefit}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-xl border-t-2 border-gray-400 pt-3">
                  <span className="text-gray-900">Total Charged:</span>
                  <span className="text-cyan-600">${recommendation.total_charged}</span>
                </div>
              </div>

              {/* Success Message */}
              {recommendation.net_benefit > 0 && (
                <div className="mt-5 p-4 bg-green-100 border-2 border-green-500 rounded-lg shadow">
                  <p className="text-base text-green-900 font-bold">
                    🎉 You're saving ${recommendation.net_benefit}! {manualMode ? 'Great choice!' : 'PaySplit optimized your cards to maximize rewards.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="mt-6 text-center">
          <p className="font-bold text-base text-gray-900 mb-2">💳 Card Rewards:</p>
          <p className="text-sm font-semibold text-gray-800">
            Chase: 3% Food, 5% Travel | AmEx: 4% Food (BEST!) | Capital One: 1.5% Everything
          </p>
          <p className="mt-2 text-xs font-medium text-gray-700">
            💡 Try Manual Mode to choose your cards or let AI optimize!
          </p>
        </div>
      </div>
    </div>
  );
}
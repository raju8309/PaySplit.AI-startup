import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import CSVUpload from '../components/CSVUpload';

interface Card {
  id: number;
  name: string;
  card_type: string;
  last_four: string | null;
  limit: number;
  balance: number;
  available: number;
  rewards_rate: number;
  category_multipliers: { [key: string]: number };
  is_active: boolean;
  is_preferred: boolean;
  color: string;
  icon: string;
}

interface CardFormData {
  name: string;
  card_type: string;
  last_four: string;
  limit: number;
  balance: number;
  rewards_rate: number;
  category_multipliers: { [key: string]: number };
  color: string;
  icon: string;
}

export default function CardManager() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CardFormData>({
    name: '',
    card_type: 'Visa',
    last_four: '',
    limit: 1000,
    balance: 0,
    rewards_rate: 0.01,
    category_multipliers: {},
    color: '#3B82F6',
    icon: '💳'
  });

  const [categoryRewards, setCategoryRewards] = useState({
    'Food & Dining': 0,
    'Travel': 0,
    'Shopping': 0,
    'Gas': 0,
    'Entertainment': 0
  });

  // Fetch cards
  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/cards/');
      if (!response.ok) throw new Error('Failed to fetch cards');
      const data = await response.json();
      setCards(data);
      setError(null);
    } catch (err) {
      setError('Failed to load cards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // Create or Update card
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const multipliers: { [key: string]: number } = {};
    Object.entries(categoryRewards).forEach(([category, rate]) => {
      if (rate > 0) {
        multipliers[category] = rate / 100;
      }
    });

    const cardData = {
      ...formData,
      rewards_rate: formData.rewards_rate / 100,
      category_multipliers: multipliers
    };

    try {
      const url = editingCard
        ? `http://localhost:8000/api/cards/${editingCard.id}`
        : 'http://localhost:8000/api/cards/';
      
      const response = await fetch(url, {
        method: editingCard ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });

      if (!response.ok) throw new Error('Failed to save card');

      await fetchCards();
      resetForm();
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError('Failed to save card');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete card
  const handleDelete = async (cardId: number) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/cards/${cardId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete card');

      await fetchCards();
      setError(null);
    } catch (err) {
      setError('Failed to delete card');
      console.error(err);
    }
  };

  // Edit card
  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      card_type: card.card_type,
      last_four: card.last_four || '',
      limit: card.limit,
      balance: card.balance,
      rewards_rate: card.rewards_rate * 100,
      category_multipliers: card.category_multipliers,
      color: card.color,
      icon: card.icon
    });

    const newCategoryRewards = { ...categoryRewards };
    Object.entries(card.category_multipliers).forEach(([category, rate]) => {
      if (category in newCategoryRewards) {
        newCategoryRewards[category as keyof typeof categoryRewards] = rate * 100;
      }
    });
    setCategoryRewards(newCategoryRewards);

    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      card_type: 'Visa',
      last_four: '',
      limit: 1000,
      balance: 0,
      rewards_rate: 0.01,
      category_multipliers: {},
      color: '#3B82F6',
      icon: '💳'
    });
    setCategoryRewards({
      'Food & Dining': 0,
      'Travel': 0,
      'Shopping': 0,
      'Gas': 0,
      'Entertainment': 0
    });
    setEditingCard(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">💳 My Cards</h1>
            <p className="text-gray-700 mt-2 font-medium">Manage your credit cards and rewards</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-cyan-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-cyan-600 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Card
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {/* ✅ CSV UPLOAD SECTION - ADD THIS */}
        <div className="mb-8">
          <CSVUpload onCardCreated={fetchCards} />
        </div>

        {/* Card Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingCard ? 'Edit Card' : 'Add New Card'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Card Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chase Sapphire Preferred"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>

                {/* Card Type & Last 4 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Card Type</label>
                    <select
                      value={formData.card_type}
                      onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                    >
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="American Express">American Express</option>
                      <option value="Discover">Discover</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formData.last_four}
                      onChange={(e) => setFormData({ ...formData, last_four: e.target.value })}
                      placeholder="1234"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                    />
                  </div>
                </div>

                {/* Limit & Balance */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Credit Limit ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.limit}
                      onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Current Balance ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                    />
                  </div>
                </div>

                {/* Base Rewards Rate */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Base Rewards Rate (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.rewards_rate}
                    onChange={(e) => setFormData({ ...formData, rewards_rate: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                  <p className="text-xs text-gray-600 mt-1 font-medium">e.g., 1.5 for 1.5% cashback</p>
                </div>

                {/* Category Multipliers */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-3">Category Rewards (%) - Optional</label>
                  <div className="space-y-3">
                    {Object.entries(categoryRewards).map(([category, rate]) => (
                      <div key={category} className="flex items-center gap-3">
                        <label className="w-40 text-sm font-semibold text-gray-700">{category}</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={rate}
                          onChange={(e) => setCategoryRewards({ ...categoryRewards, [category]: Number(e.target.value) })}
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600 font-medium">%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">💡 Leave at 0 if your card doesn't have category bonuses</p>
                </div>

                {/* Color & Icon */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Card Color</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="💳"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-medium text-2xl text-center"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-500 text-white py-3 rounded-lg font-bold hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingCard ? 'Update Card' : 'Add Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {loading && !showForm ? (
          <div className="text-center py-12">
            <div className="text-gray-600 font-semibold text-lg">Loading cards...</div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-gray-200">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold text-lg mb-4">No cards yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-cyan-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-cyan-600"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition"
              >
                {/* Card Header */}
                <div
                  className="p-6 text-white"
                  style={{ backgroundColor: card.color }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl">{card.icon}</div>
                    <div className="text-sm font-bold opacity-90">{card.card_type}</div>
                  </div>
                  <div className="text-2xl font-bold mb-2">{card.name}</div>
                  {card.last_four && (
                    <div className="text-sm opacity-90">•••• {card.last_four}</div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Available</div>
                      <div className="text-xl font-bold text-green-600">${card.available.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Balance</div>
                      <div className="text-xl font-bold text-gray-900">${card.balance.toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Limit */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 font-semibold mb-2">
                      Credit Limit: ${card.limit.toFixed(0)}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{ width: `${(card.balance / card.limit) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 font-semibold mb-2">Rewards</div>
                    <div className="text-sm font-bold text-gray-900">
                      {card.rewards_rate * 100}% Base
                    </div>
                    {Object.entries(card.category_multipliers).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(card.category_multipliers).map(([category, rate]) => (
                          <div key={category} className="text-xs text-gray-700 font-semibold">
                            • {category}: {(rate as number) * 100}%
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(card)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-lg font-bold hover:bg-blue-100"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 py-2 rounded-lg font-bold hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
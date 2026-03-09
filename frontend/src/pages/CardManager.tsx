import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

function bestRewardLabel(card: Card): string {
  const entries = Object.entries(card.category_multipliers ?? {});
  if (entries.length > 0) {
    const [cat, rate] = entries.sort((a, b) => b[1] - a[1])[0];
    return `${Math.round((rate as number) * 100)}% ${cat}`;
  }
  if (card.rewards_rate > 0) return `${Math.round(card.rewards_rate * 100)}% Everything`;
  return '0% Base';
}

export default function CardManager() {
  const navigate = useNavigate();
  const [cards, setCards]           = useState<Card[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [csvOpen, setCsvOpen]       = useState(false);

  const [formData, setFormData] = useState<CardFormData>({
    name: '', card_type: 'Visa', last_four: '', limit: 1000,
    balance: 0, rewards_rate: 0.01, category_multipliers: {},
    color: '#3B82F6', icon: '💳'
  });

  const [categoryRewards, setCategoryRewards] = useState({
    'Food & Dining': 0, 'Travel': 0, 'Shopping': 0, 'Gas': 0, 'Entertainment': 0
  });

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/cards/');
      if (!response.ok) throw new Error('Failed to fetch cards');
      setCards(await response.json());
      setError(null);
    } catch { setError('Failed to load cards'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchCards(); }, []);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const multipliers: { [key: string]: number } = {};
    Object.entries(categoryRewards).forEach(([cat, rate]) => {
      if (rate > 0) multipliers[cat] = rate / 100;
    });
    const cardData = { ...formData, rewards_rate: formData.rewards_rate / 100, category_multipliers: multipliers };
    try {
      const url = editingCard ? `http://localhost:8000/api/cards/${editingCard.id}` : 'http://localhost:8000/api/cards/';
      const res = await fetch(url, {
        method: editingCard ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      if (!res.ok) throw new Error('Failed to save card');
      await fetchCards(); resetForm(); setShowForm(false); setError(null);
    } catch { setError('Failed to save card'); }
    finally { setLoading(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (cardId: number) => {
    if (!confirm('Delete this card?')) return;
    try {
      await fetch(`http://localhost:8000/api/cards/${cardId}`, { method: 'DELETE' });
      await fetchCards();
    } catch { setError('Failed to delete card'); }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setFormData({
      name: card.name, card_type: card.card_type, last_four: card.last_four || '',
      limit: card.limit, balance: card.balance, rewards_rate: card.rewards_rate * 100,
      category_multipliers: card.category_multipliers, color: card.color, icon: card.icon
    });
    const newCat = { ...categoryRewards };
    Object.entries(card.category_multipliers).forEach(([cat, rate]) => {
      if (cat in newCat) newCat[cat as keyof typeof categoryRewards] = (rate as number) * 100;
    });
    setCategoryRewards(newCat);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', card_type: 'Visa', last_four: '', limit: 1000, balance: 0, rewards_rate: 0.01, category_multipliers: {}, color: '#3B82F6', icon: '💳' });
    setCategoryRewards({ 'Food & Dining': 0, 'Travel': 0, 'Shopping': 0, 'Gas': 0, 'Entertainment': 0 });
    setEditingCard(null);
  };

  const inputCls = "w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition";

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-2xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition">
              ← Back
            </button>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition glow-primary"
          >
            <Plus size={15} />
            Add Card
          </button>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="mx-auto max-w-2xl px-6 py-10">

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {loading ? '...' : `${cards.length} card${cards.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm font-semibold">
            {error}
          </div>
        )}

        {/* ── Stacked wallet cards ── */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="glass gradient-border rounded-3xl py-20 flex flex-col items-center gap-4">
            <div className="text-5xl">💳</div>
            <p className="text-muted-foreground font-semibold">No cards yet</p>
            <button onClick={() => setShowForm(true)}
              className="bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition glow-primary">
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="relative mb-10">
            {/* Stacked cards — each one offset down */}
            {cards.map((card, i) => {
              const isExpanded = expandedId === card.id;
              const stackOffset = isExpanded ? 0 : i * 12;
              const zIndex = isExpanded ? 50 : cards.length - i;

              return (
                <div
                  key={card.id}
                  className="absolute w-full transition-all duration-300 cursor-pointer"
                  style={{
                    top: `${i === 0 ? 0 : cards.slice(0, i).reduce((acc, _, j) => acc + (expandedId === cards[j].id ? 260 : 60), 0)}px`,
                    zIndex,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : card.id)}
                >
                  {/* Card face */}
                  <div
                    className="w-full rounded-3xl overflow-hidden shadow-2xl"
                    style={{ backgroundColor: card.color }}
                  >
                    {/* Top section — always visible */}
                    <div className="p-7 pb-5">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-xs font-bold tracking-widest text-white/60 uppercase mb-1">
                            {card.card_type}
                          </p>
                          <p className="font-display text-2xl font-bold text-white">{card.name}</p>
                        </div>
                        {/* NFC icon */}
                        <div className="text-white/50 text-xl mt-1">))</div>
                      </div>

                      {/* Chip + number */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-8 rounded-md bg-yellow-400/80 border border-yellow-300/50 flex items-center justify-center">
                          <div className="w-6 h-5 rounded-sm border border-yellow-600/40 grid grid-cols-2 gap-px p-0.5">
                            <div className="bg-yellow-600/30 rounded-sm" />
                            <div className="bg-yellow-600/30 rounded-sm" />
                            <div className="bg-yellow-600/30 rounded-sm" />
                            <div className="bg-yellow-600/30 rounded-sm" />
                          </div>
                        </div>
                        <p className="text-white/80 font-mono text-base tracking-widest">
                          •••• •••• •••• {card.last_four ?? '••••'}
                        </p>
                      </div>

                      {/* Available + Rewards */}
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-bold tracking-widest text-white/50 uppercase mb-1">Available</p>
                          <p className="font-display text-2xl font-bold text-white">
                            ${card.available.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold tracking-widest text-white/50 uppercase mb-1">Rewards</p>
                          <p className="font-bold text-white text-sm">{bestRewardLabel(card)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <div className="flex justify-center pb-3">
                      <ChevronDown
                        size={18}
                        className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="glass gradient-border rounded-b-3xl rounded-t-none border-t-0 px-6 py-5 mt-0">
                      <div className="grid grid-cols-3 gap-4 mb-5">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Balance</p>
                          <p className="font-bold">${card.balance.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Limit</p>
                          <p className="font-bold">${card.limit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Base Rate</p>
                          <p className="font-bold text-primary">{card.rewards_rate * 100}%</p>
                        </div>
                      </div>

                      {/* Usage bar */}
                      <div className="mb-5">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Credit used</span>
                          <span>{Math.round((card.balance / card.limit) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min((card.balance / card.limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(card); }}
                          className="flex-1 flex items-center justify-center gap-2 border border-border bg-secondary/30 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                          className="flex-1 flex items-center justify-center gap-2 border border-destructive/30 bg-destructive/10 py-2.5 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/20 transition"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Spacer to push content below the stacked cards */}
            <div style={{
              height: `${cards.reduce((acc, card) => {
                return acc + (expandedId === card.id ? 340 : 60);
              }, 200)}px`
            }} />
          </div>
        )}

        {/* ── CSV Import collapsible ── */}
        <div className="glass gradient-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setCsvOpen(!csvOpen)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center">
                <Upload size={15} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Import from Bank CSV</p>
                <p className="text-xs text-muted-foreground">Bulk add cards from your statement</p>
              </div>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-300 ${csvOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {csvOpen && (
            <div className="px-6 pb-6 border-t border-border/40">
              <div className="pt-4">
                <CSVUpload onCardCreated={fetchCards} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}
        >
          <div className="glass-strong gradient-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="p-8">
              <h2 className="font-display text-2xl font-bold mb-6">
                {editingCard ? 'Edit Card' : 'Add New Card'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Card Name</label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chase Sapphire Preferred" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Card Type</label>
                    <select value={formData.card_type}
                      onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                      className={inputCls}>
                      {['Visa','Mastercard','American Express','Discover'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Last 4 Digits</label>
                    <input type="text" maxLength={4} value={formData.last_four}
                      onChange={(e) => setFormData({ ...formData, last_four: e.target.value })}
                      placeholder="1234" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Credit Limit ($)</label>
                    <input type="number" required min="0" step="0.01" value={formData.limit}
                      onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Current Balance ($)</label>
                    <input type="number" required min="0" step="0.01" value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                      className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Base Rewards Rate (%)</label>
                  <input type="number" required min="0" max="100" step="0.1" value={formData.rewards_rate}
                    onChange={(e) => setFormData({ ...formData, rewards_rate: Number(e.target.value) })}
                    className={inputCls} />
                  <p className="text-xs text-muted-foreground mt-1">e.g., 1.5 for 1.5% cashback</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-3">Category Rewards (%) — Optional</label>
                  <div className="space-y-2">
                    {Object.entries(categoryRewards).map(([category, rate]) => (
                      <div key={category} className="flex items-center gap-3">
                        <span className="w-36 text-xs font-medium text-muted-foreground">{category}</span>
                        <input type="number" min="0" max="100" step="0.1" value={rate}
                          onChange={(e) => setCategoryRewards({ ...categoryRewards, [category]: Number(e.target.value) })}
                          className="flex-1 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary transition"
                          placeholder="0" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">💡 Leave at 0 if no category bonuses</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Card Color</label>
                    <input type="color" value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-11 rounded-xl border border-border bg-secondary/40 cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Icon</label>
                    <input type="text" value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="💳" className={`${inputCls} text-2xl text-center`} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition glow-primary">
                    {loading ? 'Saving...' : editingCard ? 'Update Card' : 'Add Card'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 border border-border bg-secondary/30 text-muted-foreground py-3 rounded-xl font-bold hover:bg-secondary hover:text-foreground transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
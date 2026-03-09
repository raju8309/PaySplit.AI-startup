import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Sparkles, CreditCard } from "lucide-react";
import { recommendSplit, splitCheckout } from "../services/paySplitService";

type Card = {
  id: number;
  name: string;
  card_type: string;
  last_four: string | null;
  limit: number;
  balance: number;
  available: number;
  rewards_rate: number;
  category_multipliers: { [key: string]: number };
  color: string;
  icon: string;
};

const PAYSPLIT_FEE_RATE = 0.005; // 0.5%

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function bestRewardsRate(card: Card): number {
  const entries = Object.entries(card.category_multipliers ?? {});
  if (entries.length > 0) return Math.max(...entries.map(([, r]) => r));
  return card.rewards_rate;
}

function bestCategory(card: Card): string {
  const entries = Object.entries(card.category_multipliers ?? {});
  if (entries.length === 0) return "Everything";
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export default function SplitApp() {
  const navigate = useNavigate();

  const [cards, setCards]           = useState<Card[]>([]);
  const [merchant, setMerchant]     = useState("");
  const [amount, setAmount]         = useState<number | "">("");
  const [sliderPct, setSliderPct]   = useState(50); // 0–100: % going to card A
  const [aiPct, setAiPct]           = useState<number | null>(null);
  const [loadingSplit, setLoadingSplit] = useState(false);
  const [loadingPay, setLoadingPay]   = useState(false);
  const [error, setError]             = useState("");
  const [showSplit, setShowSplit]     = useState(false);

  // Fetch cards
  useEffect(() => {
    const go = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("http://localhost:8000/api/cards/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const list: Card[] = Array.isArray(data) ? data : data.data ?? [];
          setCards(list);
        }
      } catch (e) { console.error(e); }
    };
    go();
  }, []);

  const total   = Number(amount) || 0;
  const cardA   = cards[0];
  const cardB   = cards[1];

  const amountA = Math.round((sliderPct / 100) * total * 100) / 100;
  const amountB = Math.round((total - amountA) * 100) / 100;
  const fee     = Math.round(total * PAYSPLIT_FEE_RATE * 100) / 100;

  const cashbackA = cardA ? Math.round(amountA * bestRewardsRate(cardA) * 100) / 100 : 0;
  const cashbackB = cardB ? Math.round(amountB * bestRewardsRate(cardB) * 100) / 100 : 0;

  // Ask AI for optimal split
  async function getAISplit() {
    if (!total || cards.length < 2) return;
    setLoadingSplit(true);
    setError("");
    try {
      const res = await recommendSplit({
        transaction_amount: total,
        merchant: merchant || "general",
        free_trial: true,
        fraud_action: "warn",
        cards: cards.map((c) => ({
          id: c.id, name: c.name,
          limit: c.limit, balance: c.balance,
          available: c.available, rewards_rate: c.rewards_rate,
          last_four: c.last_four, category_multipliers: c.category_multipliers,
        })),
      });

      const allocs = res.data.allocations ?? [];
      const allocA = allocs.find((a) => a.card_name.toLowerCase() === cardA?.name.toLowerCase());
      if (allocA && total > 0) {
        const optimalPct = Math.round((allocA.amount / total) * 100);
        setSliderPct(optimalPct);
        setAiPct(optimalPct);
      }
      setShowSplit(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoadingSplit(false);
    }
  }

  const isAiOptimized = aiPct !== null && sliderPct === aiPct;

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setSliderPct(Number(e.target.value));
  }

  async function pay() {
    if (!cardA || !cardB) return;
    setLoadingPay(true);
    setError("");
    try {
      const res = await splitCheckout({
        from_user: localStorage.getItem("username") || "user",
        to_user: merchant || "merchant",
        cards: [
          { card_name: cardA.name, amount_cents: Math.max(1, Math.round(amountA * 100)) },
          { card_name: cardB.name, amount_cents: Math.max(1, Math.round(amountB * 100)) },
        ],
      });
      localStorage.setItem("paysplit_payment_ids", JSON.stringify(res.payment_ids));
      window.location.href = res.url;
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Payment checkout failed.");
    } finally {
      setLoadingPay(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")}
            className="h-9 w-9 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
            <ArrowLeft size={15} />
          </button>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Create Split</span>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="mx-auto max-w-xl px-6 py-12">

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">New Split</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your purchase details and let AI optimize the split.
          </p>
        </div>

        {/* ── Main card ── */}
        <div className="glass gradient-border rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="p-7">

            {/* Merchant */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. DoorDash, Amazon…"
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>

            {/* Order Total */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Order Total</label>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <span className="text-muted-foreground text-sm font-medium">$</span>
                <input
                  type="number"
                  value={amount}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  onChange={(e) => {
                    setAmount(e.target.value === "" ? "" : Number(e.target.value));
                    setShowSplit(false);
                    setAiPct(null);
                  }}
                  className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* AI Recommend button — before split shown */}
            {!showSplit && (
              <button
                onClick={getAISplit}
                disabled={loadingSplit || !total || cards.length < 2}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition glow-primary mb-4"
              >
                <Sparkles size={18} />
                {loadingSplit ? "Calculating…" : "AI Recommend"}
              </button>
            )}

            {/* Card chips */}
            {cards.length > 0 && !showSplit && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Using {cards.length} active card{cards.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cards.map((c) => (
                    <span key={c.id} className="px-3 py-1.5 rounded-full border border-border bg-secondary/30 text-xs font-medium text-muted-foreground">
                      {c.name}{c.last_four ? ` •••• ${c.last_four}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── SPLIT UI — shown after AI Recommend ── */}
            {showSplit && cardA && cardB && (
              <>
                {/* Slider header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">Drag to adjust split</span>
                  <button
                    onClick={() => { if (aiPct !== null) setSliderPct(aiPct); }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                      isAiOptimized
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-primary hover:border-primary/40"
                    }`}
                  >
                    <Sparkles size={11} />
                    AI Optimized
                  </button>
                </div>

                {/* Range slider */}
                <div className="relative mb-3">
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={sliderPct}
                    onChange={handleSlider}
                    className="w-full h-2 appearance-none rounded-full outline-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) ${sliderPct}%, hsl(var(--accent)) ${sliderPct}%)`,
                    }}
                  />
                </div>

                {/* Two-color split bar */}
                <div className="h-2 rounded-full overflow-hidden flex mb-6">
                  <div
                    className="h-full bg-primary rounded-l-full transition-all duration-200"
                    style={{ width: `${sliderPct}%` }}
                  />
                  <div
                    className="h-full bg-accent rounded-r-full transition-all duration-200"
                    style={{ width: `${100 - sliderPct}%` }}
                  />
                </div>

                {/* Card boxes */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {/* Card A */}
                  <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary mb-2">
                      <CreditCard size={13} />
                      {cardA.name}
                    </div>
                    <div className="font-display text-2xl font-bold text-primary mb-1">
                      {fmt(amountA)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(bestRewardsRate(cardA) * 100)}% cashback → <span className="text-primary font-semibold">{fmt(cashbackA)} back</span>
                    </div>
                  </div>

                  {/* Card B */}
                  <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-accent mb-2">
                      <CreditCard size={13} />
                      {cardB.name}
                    </div>
                    <div className="font-display text-2xl font-bold text-accent mb-1">
                      {fmt(amountB)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(bestRewardsRate(cardB) * 100)}% cashback → <span className="text-accent font-semibold">{fmt(cashbackB)} back</span>
                    </div>
                  </div>
                </div>

                {/* Fee row */}
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 flex items-center justify-between mb-5">
                  <span className="text-sm text-muted-foreground">PaySplit fee (0.5%)</span>
                  <span className="font-bold text-sm">{fmt(fee)}</span>
                </div>

                {/* Re-optimize + Pay buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={getAISplit}
                    disabled={loadingSplit}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 text-primary px-5 py-3 text-sm font-bold hover:bg-primary/20 disabled:opacity-50 transition"
                  >
                    <Sparkles size={15} />
                    {loadingSplit ? "Recalculating…" : "Re-optimize with AI"}
                  </button>

                  <button
                    onClick={pay}
                    disabled={loadingPay}
                    className="w-full rounded-xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition glow-primary"
                  >
                    {loadingPay ? "Redirecting…" : `Pay ${fmt(total + fee)}`}
                  </button>
                </div>

                {/* Card chips summary */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Using {cards.length} active cards
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cards.map((c) => (
                      <span key={c.id} className="px-3 py-1.5 rounded-full border border-border bg-secondary/30 text-xs font-medium text-muted-foreground">
                        {c.name}{c.last_four ? ` •••• ${c.last_four}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slider thumb styles */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 3px solid hsl(var(--background));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4), 0 0 12px hsl(var(--primary) / 0.5);
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: hsl(var(--primary));
          border: 3px solid hsl(var(--background));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
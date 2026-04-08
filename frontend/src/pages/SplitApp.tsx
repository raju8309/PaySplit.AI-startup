import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Sparkles, ShieldCheck } from "lucide-react";
import { recommendSplit, createCheckout } from "../services/paySplitService";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

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

type Allocation = { card_name: string; amount: number };

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function cardCategory(card: Card): string {
  const entries = Object.entries(card.category_multipliers ?? {});
  if (entries.length > 0) {
    const best = entries.sort((a, b) => b[1] - a[1])[0];
    return `${Math.round(best[1] * 100)}% ${best[0]}`;
  }
  if (card.rewards_rate > 0) return `${Math.round(card.rewards_rate * 100)}% Everything`;
  return "";
}

export default function SplitApp() {
  const navigate = useNavigate();

  const [cards, setCards]               = useState<Card[]>([]);
  const [merchant, setMerchant]         = useState("");
  const [amount, setAmount]             = useState<number | "">("");
  const [allocations, setAllocations]   = useState<Allocation[]>([]);
  const [error, setError]               = useState("");
  const [loadingSplit, setLoadingSplit] = useState(false);
  const [loadingPay, setLoadingPay]     = useState(false);
  const [hasRecommended, setHasRecommended] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE}/api/cards/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setCards(Array.isArray(data) ? data : data.data ?? []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetch_();
  }, []);

  const totalAmount    = Number(amount) || 0;
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

  function pct(cardAmount: number) {
    return totalAmount ? Math.round((cardAmount / totalAmount) * 100) : 0;
  }

  function cardFor(allocation: Allocation): Card | undefined {
    return cards.find((c) => c.name.toLowerCase() === allocation.card_name.toLowerCase());
  }

  async function calculate() {
    setLoadingSplit(true);
    setError("");
    setAllocations([]);

    try {
      const res = await recommendSplit({
        transaction_amount: totalAmount,
        merchant,
        free_trial: true,
        fraud_action: "warn",
        cards: cards.map((c) => ({
          id: c.id,
          name: c.name,
          limit: c.limit,
          balance: c.balance,
          available: c.available,
          rewards_rate: c.rewards_rate,
          last_four: c.last_four,
          category_multipliers: c.category_multipliers,
        })),
      });
      setAllocations(res.data.allocations ?? []);
      setHasRecommended(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Something went wrong.");
    } finally {
      setLoadingSplit(false);
    }
  }

  async function pay() {
    setLoadingPay(true);
    setError("");
    try {
      const res = await createCheckout({
        from_user: localStorage.getItem("username") || "user",
        to_user: merchant,
        amount_cents: Math.max(0, Math.round(totalAmount * 100)),
      });
      if (res?.data?.payment_id)
        localStorage.setItem("paysplit_payment_id", String(res.data.payment_id));
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Payment checkout failed.");
    } finally {
      setLoadingPay(false);
    }
  }

  const canRecommend = !!merchant && totalAmount > 0 && cards.length > 0 && !loadingSplit;

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="h-9 w-9 rounded-xl border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Create Split</span>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="mx-auto max-w-2xl px-6 py-12">

        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight">New Split</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your purchase details and let AI optimize the split.
          </p>
        </div>

        {/* Merchant */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">Merchant</label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => { setMerchant(e.target.value); setHasRecommended(false); setAllocations([]); }}
            placeholder="e.g. DoorDash, Amazon…"
            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Amount ($)</label>
          <input
            type="number"
            value={amount}
            min={0}
            step={0.01}
            placeholder="0.00"
            onChange={(e) => {
              setAmount(e.target.value === "" ? "" : Number(e.target.value));
              setHasRecommended(false);
              setAllocations([]);
            }}
            className="w-full rounded-xl border border-border bg-card/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        {/* AI Recommend */}
        <button
          onClick={calculate}
          disabled={!canRecommend}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition glow-primary mb-6"
        >
          <Sparkles size={18} />
          {loadingSplit ? "Calculating…" : "AI Recommend"}
        </button>

        {/* Card chips before recommend */}
        {cards.length > 0 && !hasRecommended && (
          <div className="mb-6">
            <p className="text-xs text-muted-foreground mb-2">
              Using {cards.length} active card{cards.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {cards.map((c) => (
                <span key={c.id} className="px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs font-medium text-muted-foreground">
                  {c.name}{c.last_four ? ` •••• ${c.last_four}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {/* Recommended Split — only after AI Recommend */}
        {hasRecommended && allocations.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-primary" />
              <h2 className="font-display text-lg font-bold tracking-tight">Recommended Split</h2>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {allocations.map((alloc, i) => {
                const card = cardFor(alloc);
                const p    = pct(alloc.amount);
                return (
                  <div key={i} className="glass gradient-border rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {p}%
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{alloc.card_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {card?.last_four ? `•••• ${card.last_four}` : ""}
                            {card && cardCategory(card) ? ` · ${cardCategory(card)}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-sm">{formatMoney(alloc.amount)}</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={pay}
              disabled={loadingPay}
              className="w-full rounded-xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition glow-primary mb-4"
            >
              {loadingPay ? "Redirecting…" : `Pay ${formatMoney(totalAllocated || totalAmount)}`}
            </button>

            <div className="text-xs text-muted-foreground mb-2">
              Using {allocations.length} active card{allocations.length !== 1 ? "s" : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {allocations.map((a, i) => {
                const card = cardFor(a);
                return (
                  <span key={i} className="px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs font-medium text-muted-foreground">
                    {a.card_name}{card?.last_four ? ` •••• ${card.last_four}` : ""}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
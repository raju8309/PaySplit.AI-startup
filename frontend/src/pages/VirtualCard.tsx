import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Zap, Eye, EyeOff, Copy, CreditCard,
  Snowflake, CheckCircle, AlertTriangle, Plus, Trash2, Lock
} from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type VirtualCardData = {
  card_id: string;
  number?: string;
  cvc?: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  status: string;
};

type UserCard = {
  id: number;
  name: string;
  last_four: string | null;
  limit: number;
  balance: number;
  rewards_rate: number;
};

type Split = {
  card_id: number;
  card_name: string;
  percentage: number;
};

function formatCardNumber(num: string) {
  return num.replace(/(.{4})/g, "$1 ").trim();
}

function copyToClipboard(text: string, setCopied: (v: string) => void, key: string) {
  navigator.clipboard.writeText(text);
  setCopied(key);
  setTimeout(() => setCopied(""), 2000);
}

export default function VirtualCard() {
  const navigate = useNavigate();
  const [card, setCard] = useState<VirtualCardData | null>(null);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [showNumber, setShowNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [savingSplits, setSavingSplits] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [splitError, setSplitError] = useState("");
  const [splitSaved, setSplitSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const h = authHeaders();

      // Load user's real cards
      const cardsRes = await fetch(`${API_BASE}/api/cards/`, { headers: h });
      if (cardsRes.ok) {
        const data = await cardsRes.json();
        const cards = Array.isArray(data) ? data : data.data ?? [];
        setUserCards(cards);
      }

      // Load virtual cards
      const vcRes = await fetch(`${API_BASE}/api/issuing/cards`, { headers: h });
      if (vcRes.ok) {
        const data = await vcRes.json();
        if (data.cards?.length > 0) {
          const firstCard = data.cards[0];
          setCard(firstCard);
          // Load splits for this card
          const splitsRes = await fetch(
            `${API_BASE}/api/issuing/card/${firstCard.card_id}/splits`,
            { headers: h }
          );
          if (splitsRes.ok) {
            const sd = await splitsRes.json();
            setSplits(sd.splits || []);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createCard = async () => {
    setCreating(true);
    setError("");
    try {
      const h = authHeaders();
      const username = localStorage.getItem("username") || "User";
      const email = localStorage.getItem("email") || "user@paysplit.ai";

      // Create cardholder first
      const chRes = await fetch(`${API_BASE}/api/issuing/cardholder/create`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ name: username, email }),
      });
      if (!chRes.ok) throw new Error("Failed to create cardholder");
      const ch = await chRes.json();

      // Create virtual card
      const cardRes = await fetch(`${API_BASE}/api/issuing/card/create`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ cardholder_id: ch.cardholder_id }),
      });
      if (!cardRes.ok) throw new Error("Failed to create virtual card");
      const newCard = await cardRes.json();
      setCard(newCard);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const revealCard = async () => {
    if (showNumber || !card) return;
    try {
      const h = authHeaders();
      const res = await fetch(`${API_BASE}/api/issuing/card/${card.card_id}`, { headers: h });
      if (res.ok) {
        const data = await res.json();
        setCard((prev) => prev ? { ...prev, number: data.number, cvc: data.cvc } : prev);
        setShowNumber(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFreeze = async () => {
    if (!card) return;
    setFreezing(true);
    try {
      const h = authHeaders();
      const endpoint = card.status === "active" ? "freeze" : "unfreeze";
      const res = await fetch(`${API_BASE}/api/issuing/card/${card.card_id}/${endpoint}`, {
        method: "POST", headers: h,
      });
      if (res.ok) {
        const data = await res.json();
        setCard((prev) => prev ? { ...prev, status: data.status } : prev);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFreezing(false);
    }
  };

  const addSplit = (uc: UserCard) => {
    if (splits.find((s) => s.card_id === uc.id)) return;
    const newSplit: Split = {
      card_id: uc.id,
      card_name: uc.name,
      percentage: splits.length === 0 ? 1.0 : 0,
    };
    setSplits([...splits, newSplit]);
    setSplitSaved(false);
  };

  const removeSplit = (cardId: number) => {
    setSplits(splits.filter((s) => s.card_id !== cardId));
    setSplitSaved(false);
  };

  const updatePercentage = (cardId: number, value: number) => {
    setSplits(splits.map((s) => s.card_id === cardId ? { ...s, percentage: value / 100 } : s));
    setSplitSaved(false);
  };

  const saveSplits = async () => {
    if (!card) return;
    setSplitError("");
    const total = splits.reduce((s, x) => s + x.percentage, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      setSplitError(`Percentages must add up to 100%. Currently: ${(total * 100).toFixed(0)}%`);
      return;
    }
    setSavingSplits(true);
    try {
      const h = authHeaders();
      const res = await fetch(`${API_BASE}/api/issuing/card/${card.card_id}/splits`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ virtual_card_id: card.card_id, splits }),
      });
      if (res.ok) {
        setSplitSaved(true);
        setTimeout(() => setSplitSaved(false), 3000);
      }
    } catch (e) {
      setSplitError("Failed to save splits");
    } finally {
      setSavingSplits(false);
    }
  };

  const totalPct = splits.reduce((s, x) => s + x.percentage * 100, 0);
  const isFrozen = card?.status === "inactive";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition">
            <ArrowLeft size={15} />
          </button>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <span className="font-display text-base font-bold">Virtual Card</span>
            <p className="text-xs text-muted-foreground">PaySplit AI · Powered by Stripe Issuing</p>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* No card state */}
        {!card && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <CreditCard size={36} className="text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">Get your PaySplit Virtual Card</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
              One card number to use everywhere. When you pay, we automatically split the charge across your real cards — splitting the charge across your real cards automatically.
            </p>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6 max-w-sm mx-auto">
                {error}
              </div>
            )}
            <button
              onClick={createCard}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              <Plus size={18} />
              {creating ? "Creating..." : "Create My Virtual Card"}
            </button>
          </div>
        )}

        {/* Card exists */}
        {card && (
          <div className="space-y-6">

            {/* ── The Card Visual ── */}
            <div className="relative">
              <div className={`
                relative rounded-3xl p-7 overflow-hidden
                ${isFrozen
                  ? "bg-gradient-to-br from-slate-700 to-slate-900"
                  : "bg-gradient-to-br from-[hsl(138,38%,20%)] to-[hsl(138,38%,10%)]"
                }
              `}
                style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}
              >
                {/* Background pattern */}
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.06,
                  backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }} />

                {isFrozen && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center rounded-3xl z-10">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Snowflake size={24} />
                      <span className="font-bold text-lg">Card Frozen</span>
                    </div>
                  </div>
                )}

                <div className="relative z-0">
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Zap size={14} className="text-white fill-white" />
                      </div>
                      <span className="text-white font-bold text-sm tracking-wide">PaySplit AI</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 rounded-full bg-red-500/80" />
                      <div className="w-8 h-8 rounded-full bg-yellow-400/80 -ml-4" />
                    </div>
                  </div>

                  {/* Card number */}
                  <div className="mb-6">
                    <p className="text-white/50 text-xs font-medium mb-2 tracking-widest uppercase">Card Number</p>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-mono text-xl tracking-[0.2em]">
                        {showNumber && card.number
                          ? formatCardNumber(card.number)
                          : `•••• •••• •••• ${card.last4}`}
                      </p>
                      {showNumber && card.number && (
                        <button
                          onClick={() => copyToClipboard(card.number!, setCopied, "number")}
                          className="text-white/60 hover:text-white transition"
                        >
                          {copied === "number" ? <CheckCircle size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-white/50 text-xs mb-1 tracking-widest uppercase">Expires</p>
                        <p className="text-white font-mono text-sm">
                          {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                        </p>
                      </div>
                      {showNumber && card.cvc && (
                        <div>
                          <p className="text-white/50 text-xs mb-1 tracking-widest uppercase">CVC</p>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-mono text-sm">{card.cvc}</p>
                            <button
                              onClick={() => copyToClipboard(card.cvc!, setCopied, "cvc")}
                              className="text-white/60 hover:text-white transition"
                            >
                              {copied === "cvc" ? <CheckCircle size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-white/70 font-bold text-sm tracking-widest">VISA</p>
                  </div>
                </div>
              </div>

              {/* Card actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={showNumber ? () => setShowNumber(false) : revealCard}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-3 text-sm font-semibold hover:bg-secondary transition"
                >
                  {showNumber ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showNumber ? "Hide Details" : "Reveal Card"}
                </button>
                <button
                  onClick={toggleFreeze}
                  disabled={freezing}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition ${
                    isFrozen
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  }`}
                >
                  {isFrozen ? <CheckCircle size={15} /> : <Snowflake size={15} />}
                  {freezing ? "..." : isFrozen ? "Unfreeze" : "Freeze Card"}
                </button>
              </div>
            </div>

            {/* ── How to use ── */}
            <div className="glass gradient-border rounded-2xl p-5">
              <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <Lock size={14} className="text-primary" />
                How to use your PaySplit card
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                  <p>Reveal your card details and add this card to DoorDash, Amazon, or any merchant</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                  <p>Set your split preferences below — choose which cards get charged and how much</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                  <p>When you pay anywhere, PaySplit automatically splits the charge across your cards</p>
                </div>
              </div>
            </div>

            {/* ── Split Configuration ── */}
            <div className="glass gradient-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-base">Split Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose how charges are split across your cards</p>
                </div>
                <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                  Math.abs(totalPct - 100) < 1
                    ? "bg-primary/10 text-primary"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}>
                  {totalPct.toFixed(0)}% / 100%
                </div>
              </div>

              {/* Active splits */}
              {splits.length > 0 && (
                <div className="space-y-3 mb-5">
                  {splits.map((split) => (
                    <div key={split.card_id} className="bg-secondary/30 border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{split.card_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(split.percentage * 100).toFixed(0)}% of every charge
                          </p>
                        </div>
                        <button
                          onClick={() => removeSplit(split.card_id)}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={Math.round(split.percentage * 100)}
                          onChange={(e) => updatePercentage(split.card_id, Number(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={Math.round(split.percentage * 100)}
                            onChange={(e) => updatePercentage(split.card_id, Number(e.target.value))}
                            className="w-14 bg-background border border-border rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-primary"
                          />
                          <span className="text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add cards */}
              {userCards.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add a card to split</p>
                  <div className="flex flex-wrap gap-2">
                    {userCards
                      .filter((uc) => !splits.find((s) => s.card_id === uc.id))
                      .map((uc) => (
                        <button
                          key={uc.id}
                          onClick={() => addSplit(uc)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary hover:border-primary/40 transition text-sm font-medium"
                        >
                          <Plus size={12} className="text-primary" />
                          {uc.name}
                          {uc.last_four ? ` •••• ${uc.last_four}` : ""}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {userCards.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No cards found. <button onClick={() => navigate("/cards")} className="text-primary underline">Add cards</button> first.
                </div>
              )}

              {splitError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {splitError}
                </div>
              )}

              <button
                onClick={saveSplits}
                disabled={savingSplits || splits.length === 0}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {splitSaved ? (
                  <><CheckCircle size={15} /> Split Preferences Saved!</>
                ) : savingSplits ? (
                  "Saving..."
                ) : (
                  "Save Split Preferences"
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
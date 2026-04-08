import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Eye, EyeOff, Copy, CreditCard,
  Snowflake, CheckCircle, AlertTriangle, Plus, Trash2, Lock,
} from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

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

// ── Card Visual (flippable) ────────────────────────────────────────────────
function CardVisual({
  card,
  showNumber,
  isFrozen,
  copied,
  onCopy,
}: {
  card: VirtualCardData;
  showNumber: boolean;
  isFrozen: boolean;
  copied: string;
  onCopy: (text: string, key: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (showNumber) setFlipped(true);
    else setFlipped(false);
  }, [showNumber]);

  return (
    <div style={{ perspective: "1200px" }} className="w-full">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
        className="w-full"
      >
        {/* ── Front ── */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className={`relative rounded-3xl p-7 overflow-hidden w-full ${
            isFrozen
              ? "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900"
              : "bg-gradient-to-br from-[#1a3a2a] via-[#1f4d34] to-[#0d2218]"
          }`}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
            }}
          />
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <AnimatePresence>
            {isFrozen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10"
              >
                <div className="flex items-center gap-3 text-slate-200">
                  <Snowflake size={22} className="text-blue-300" />
                  <span className="font-bold text-lg tracking-wide">Card Frozen</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-0" style={{ minHeight: 180 }}>
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                  <Zap size={14} className="text-white fill-white" />
                </div>
                <span className="text-white font-bold text-sm tracking-widest uppercase">
                  PaySplit AI
                </span>
              </div>
              {/* Chip */}
              <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-90" />
            </div>

            <div className="mb-6">
              <p className="text-white/40 text-[10px] font-semibold mb-1.5 tracking-[0.2em] uppercase">
                Card Number
              </p>
              <p className="text-white font-mono text-xl tracking-[0.18em]">
                {`•••• •••• •••• ${card.last4}`}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/40 text-[10px] font-semibold mb-1 tracking-[0.2em] uppercase">
                  Expires
                </p>
                <p className="text-white font-mono text-sm tracking-wider">
                  {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <div className="w-8 h-8 rounded-full bg-red-500/90" />
                <div className="w-8 h-8 rounded-full bg-yellow-400/90 -ml-4" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Back (revealed) ── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
          className={`relative rounded-3xl p-7 overflow-hidden ${
            isFrozen
              ? "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900"
              : "bg-gradient-to-br from-[#1a3a2a] via-[#1f4d34] to-[#0d2218]"
          }`}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative z-0" style={{ minHeight: 180 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                  <Zap size={14} className="text-white fill-white" />
                </div>
                <span className="text-white font-bold text-sm tracking-widest uppercase">
                  PaySplit AI
                </span>
              </div>
            </div>

            {/* Full card number */}
            <div className="mb-4">
              <p className="text-white/40 text-[10px] font-semibold mb-1.5 tracking-[0.2em] uppercase">
                Card Number
              </p>
              <div className="flex items-center gap-3">
                <p className="text-white font-mono text-lg tracking-[0.15em]">
                  {card.number ? formatCardNumber(card.number) : `•••• •••• •••• ${card.last4}`}
                </p>
                {card.number && (
                  <button
                    onClick={() => onCopy(card.number!, "number")}
                    className="text-white/50 hover:text-white transition"
                  >
                    {copied === "number" ? (
                      <CheckCircle size={13} className="text-green-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-white/40 text-[10px] font-semibold mb-1 tracking-[0.2em] uppercase">
                    Expires
                  </p>
                  <p className="text-white font-mono text-sm tracking-wider">
                    {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                  </p>
                </div>
                {card.cvc && (
                  <div>
                    <p className="text-white/40 text-[10px] font-semibold mb-1 tracking-[0.2em] uppercase">
                      CVC
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono text-sm tracking-wider">{card.cvc}</p>
                      <button
                        onClick={() => onCopy(card.cvc!, "cvc")}
                        className="text-white/50 hover:text-white transition"
                      >
                        {copied === "cvc" ? (
                          <CheckCircle size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-white/60 font-bold text-sm tracking-widest">VISA</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const h = authHeaders();
      const cardsRes = await fetch(`${API_BASE}/api/cards/`, { headers: h });
      if (cardsRes.ok) {
        const data = await cardsRes.json();
        setUserCards(Array.isArray(data) ? data : data.data ?? []);
      }
      const vcRes = await fetch(`${API_BASE}/api/issuing/cards`, { headers: h });
      if (vcRes.ok) {
        const data = await vcRes.json();
        if (data.cards?.length > 0) {
          const firstCard = data.cards[0];
          setCard(firstCard);
          const splitsRes = await fetch(
            `${API_BASE}/api/issuing/card/${firstCard.card_id}/splits`, { headers: h }
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
    setCreating(true); setError("");
    try {
      const h = authHeaders();
      const username = localStorage.getItem("username") || "User";
      const email = localStorage.getItem("email") || "user@paysplit.ai";
      const chRes = await fetch(`${API_BASE}/api/issuing/cardholder/create`, {
        method: "POST", headers: h,
        body: JSON.stringify({ name: username, email }),
      });
      if (!chRes.ok) throw new Error("Failed to create cardholder");
      const ch = await chRes.json();
      const cardRes = await fetch(`${API_BASE}/api/issuing/card/create`, {
        method: "POST", headers: h,
        body: JSON.stringify({ cardholder_id: ch.cardholder_id }),
      });
      if (!cardRes.ok) throw new Error("Failed to create virtual card");
      setCard(await cardRes.json());
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
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
    finally { setFreezing(false); }
  };

  const addSplit = (uc: UserCard) => {
    if (splits.find((s) => s.card_id === uc.id)) return;
    setSplits([...splits, { card_id: uc.id, card_name: uc.name, percentage: splits.length === 0 ? 1.0 : 0 }]);
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
        method: "POST", headers: h,
        body: JSON.stringify({ virtual_card_id: card.card_id, splits }),
      });
      if (res.ok) { setSplitSaved(true); setTimeout(() => setSplitSaved(false), 3000); }
    } catch { setSplitError("Failed to save splits"); }
    finally { setSavingSplits(false); }
  };

  const totalPct = splits.reduce((s, x) => s + x.percentage * 100, 0);
  const isFrozen = card?.status === "inactive";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/50 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-5 h-15 flex items-center gap-3 py-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate("/dashboard")}
            className="h-9 w-9 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-secondary/60 transition"
          >
            <ArrowLeft size={15} />
          </motion.button>
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap size={15} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-tight">Virtual Card</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Powered by Stripe Issuing</p>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-lg px-5 py-8">

        {/* No card state */}
        {!card && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-24"
          >
            <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/10">
              <CreditCard size={40} className="text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">Your PaySplit Card</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8 leading-relaxed">
              One card to rule them all. Pay anywhere and we split the charge across your real cards automatically.
            </p>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-5 max-w-xs mx-auto">
                {error}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={createCard} disabled={creating}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-50 transition"
            >
              <Plus size={16} />
              {creating ? "Creating…" : "Create My Virtual Card"}
            </motion.button>
          </motion.div>
        )}

        {card && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            {/* Card visual */}
            <CardVisual
              card={card}
              showNumber={showNumber}
              isFrozen={isFrozen}
              copied={copied}
              onCopy={(text, key) => copyToClipboard(text, setCopied, key)}
            />

            {/* Action buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={showNumber ? () => setShowNumber(false) : revealCard}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/20 py-3.5 text-sm font-semibold hover:bg-secondary/50 transition backdrop-blur"
              >
                {showNumber ? <EyeOff size={15} /> : <Eye size={15} />}
                {showNumber ? "Hide Details" : "Reveal Card"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={toggleFreeze} disabled={freezing}
                className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition ${
                  isFrozen
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-blue-500/30 bg-blue-500/8 text-blue-400 hover:bg-blue-500/15"
                }`}
              >
                {isFrozen ? <CheckCircle size={15} /> : <Snowflake size={15} />}
                {freezing ? "…" : isFrozen ? "Unfreeze" : "Freeze Card"}
              </motion.button>
            </div>

            {/* How to use */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5 border border-border/40"
            >
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Lock size={13} className="text-primary" /> How to use your PaySplit card
              </h3>
              <div className="space-y-3">
                {[
                  "Reveal your card details and add it to any merchant — DoorDash, Amazon, wherever.",
                  "Set your split preferences below — choose which cards get charged and how much.",
                  "When you pay, PaySplit automatically splits the charge across your cards in real time.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Split Configuration */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-5 border border-border/40"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-base">Split Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">How charges are divided across your cards</p>
                </div>
                <motion.div
                  animate={{
                    backgroundColor: Math.abs(totalPct - 100) < 1 ? "rgba(34,197,94,0.12)" : "rgba(234,179,8,0.12)",
                    color: Math.abs(totalPct - 100) < 1 ? "rgb(74,222,128)" : "rgb(234,179,8)",
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                >
                  {totalPct.toFixed(0)}%
                </motion.div>
              </div>

              <AnimatePresence>
                {splits.map((split) => (
                  <motion.div
                    key={split.card_id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-secondary/20 border border-border/50 rounded-xl p-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{split.card_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(split.percentage * 100).toFixed(0)}% of every charge
                        </p>
                      </div>
                      <button
                        onClick={() => removeSplit(split.card_id)}
                        className="text-muted-foreground/50 hover:text-destructive transition p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Slider with gradient fill */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            animate={{ width: `${split.percentage * 100}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        </div>
                        <input
                          type="range" min={1} max={100}
                          value={Math.round(split.percentage * 100)}
                          onChange={(e) => updatePercentage(split.card_id, Number(e.target.value))}
                          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={1} max={100}
                          value={Math.round(split.percentage * 100)}
                          onChange={(e) => updatePercentage(split.card_id, Number(e.target.value))}
                          className="w-12 bg-background/60 border border-border/60 rounded-lg px-2 py-1 text-xs text-center outline-none focus:border-primary"
                        />
                        <span className="text-muted-foreground text-xs">%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add cards */}
              {userCards.filter((uc) => !splits.find((s) => s.card_id === uc.id)).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Add a card to split
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {userCards
                      .filter((uc) => !splits.find((s) => s.card_id === uc.id))
                      .map((uc) => (
                        <motion.button
                          key={uc.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addSplit(uc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/50 hover:border-primary/40 transition text-xs font-medium"
                        >
                          <Plus size={11} className="text-primary" />
                          {uc.name}{uc.last_four ? ` ···· ${uc.last_four}` : ""}
                        </motion.button>
                      ))}
                  </div>
                </div>
              )}

              {userCards.length === 0 && (
                <div className="text-center py-5 text-xs text-muted-foreground">
                  No cards yet.{" "}
                  <button onClick={() => navigate("/cards")} className="text-primary underline">
                    Add cards
                  </button>{" "}
                  first.
                </div>
              )}

              <AnimatePresence>
                {splitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive mb-4 flex items-center gap-2"
                  >
                    <AlertTriangle size={13} /> {splitError}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveSplits}
                disabled={savingSplits || splits.length === 0}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <AnimatePresence mode="wait">
                  {splitSaved ? (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle size={15} /> Preferences Saved!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      {savingSplits ? "Saving…" : "Save Split Preferences"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

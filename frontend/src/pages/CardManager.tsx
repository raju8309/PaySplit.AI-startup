import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Plus, Trash2, CreditCard, X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const stripePromise = loadStripe(STRIPE_PK);

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

type Card = {
  id: number;
  name: string;
  card_type: string;
  last_four: string | null;
  limit: number;
  balance: number;
  rewards_rate: number;
};

const TYPE_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#2e77bc",
  discover: "#f76f20",
};

const ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: "14px",
      fontFamily: "system-ui, sans-serif",
      color: "#111827",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

// ── Inner form ────────────────────────────────────────────────────────────────
function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();

  const [nameOnCard, setNameOnCard] = useState("");
  const [zip, setZip] = useState("");
  const [cardBrand, setCardBrand] = useState("unknown");
  const [cardReady, setCardReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    if (!nameOnCard.trim()) { setError("Name on card is required"); return; }

    setSaving(true);
    setError("");

    try {
      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) throw new Error("Card element not ready");

      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumber,
        billing_details: {
          name: nameOnCard,
          address: { postal_code: zip },
        },
      });

      if (stripeError) throw new Error(stripeError.message);
      if (!paymentMethod) throw new Error("Failed to create payment method");

      const res = await fetch(`${API_BASE}/api/cards/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: nameOnCard,
          card_type: paymentMethod.card?.brand ?? "unknown",
          last_four: paymentMethod.card?.last4 ?? null,
          stripe_payment_method_id: paymentMethod.id,
          limit: 10000,
          balance: 0,
          rewards_rate: 0.01,
          category_multipliers: {},
          color: "#2d6a4f",
          icon: "card",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to save card");
      }

      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-600 transition";
  const elementWrap: React.CSSProperties = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px 16px",
    position: "relative",
    zIndex: 1,
    cursor: "text",
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Name on card */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Name on Card
        </label>
        <input
          type="text"
          placeholder="John Doe"
          value={nameOnCard}
          onChange={e => setNameOnCard(e.target.value)}
          autoFocus
          style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Card number */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Card Number
          {cardBrand !== "unknown" && (
            <span style={{ marginLeft: 8, color: "#2d6a4f", fontWeight: 800, textTransform: "capitalize" }}>{cardBrand}</span>
          )}
        </label>
        <div style={elementWrap}>
          <CardNumberElement
            options={ELEMENT_STYLE}
            onReady={() => setCardReady(true)}
            onChange={e => setCardBrand(e.brand ?? "unknown")}
          />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Expiry
          </label>
          <div style={elementWrap}>
            <CardExpiryElement options={ELEMENT_STYLE} />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            CVV
          </label>
          <div style={elementWrap}>
            <CardCvcElement options={ELEMENT_STYLE} />
          </div>
        </div>
      </div>

      {/* ZIP */}
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          ZIP Code
        </label>
        <input
          type="text"
          placeholder="03101"
          maxLength={10}
          value={zip}
          onChange={e => setZip(e.target.value.replace(/\D/g, ""))}
          style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Security note */}
      <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
        🔒 Card details are encrypted by Stripe. PaySplit never stores your raw card number or CVV.
      </p>

      {error && (
        <p style={{ fontSize: 12, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, borderRadius: 12, border: "1px solid #e5e7eb", padding: "12px", fontSize: 14, fontWeight: 600, color: "#6b7280", background: "#fff", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !stripe || !cardReady}
          style={{ flex: 1, borderRadius: 12, border: "none", padding: "12px", fontSize: 14, fontWeight: 600, color: "#fff", background: saving || !stripe || !cardReady ? "#9ca3af" : "#2d6a4f", cursor: saving || !stripe || !cardReady ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving..." : "Add Card"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CardManager() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadCards(); }, []);

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cards/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCards(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const deleteCard = async (id: number) => {
    if (!confirm("Remove this card?")) return;
    try {
      await fetch(`${API_BASE}/api/cards/${id}`, { method: "DELETE", headers: authHeaders() });
      setCards(cards.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleSuccess = async () => {
    setShowModal(false);
    await loadCards();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")}
              className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition">
              <ArrowLeft size={15} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">My Cards</span>
            </div>
          </div>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
            <Plus size={14} /> Add Card
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* Info banner */}
        <div className="mb-6 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground flex items-center gap-3">
          <CreditCard size={15} className="text-primary shrink-0" />
          <span>Add your cards here. Balance & rewards data will sync automatically via Plaid — coming soon.</span>
        </div>

        {/* Empty state */}
        {!loading && cards.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-5">
              <CreditCard size={28} className="text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">No cards yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Add your cards to start splitting payments.</p>
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              <Plus size={15} /> Add Your First Card
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[0,1,2].map(i => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                <div className="h-4 w-40 bg-muted rounded mb-3" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Card list */}
        {!loading && cards.length > 0 && (
          <div className="flex flex-col gap-3">
            {cards.map(card => (
              <div key={card.id} className="glass gradient-border rounded-2xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${TYPE_COLORS[card.card_type] ?? "#2d6a4f"}20`,
                      border: `1px solid ${TYPE_COLORS[card.card_type] ?? "#2d6a4f"}40`,
                    }}
                  >
                    <CreditCard size={16} style={{ color: TYPE_COLORS[card.card_type] ?? "#2d6a4f" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {card.card_type}{card.last_four ? ` •••• ${card.last_four}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteCard(card.id)}
                  className="text-muted-foreground hover:text-destructive transition p-1.5 rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Card Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>Add Card</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={14} />
              </button>
            </div>
            <Elements stripe={stripePromise}>
              <AddCardForm onSuccess={handleSuccess} onCancel={() => setShowModal(false)} />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Home, Zap } from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

type Payment = {
  id: string;
  to_user: string;
  amount_cents: number;
  settlement_ref?: string;
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [animate, setAnimate]   = useState(false);

  useEffect(() => { setTimeout(() => setAnimate(true), 100); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const idsRaw  = localStorage.getItem("paysplit_payment_ids");
        const singleId = params.get("payment_id") || localStorage.getItem("paysplit_payment_id");
        const ids: string[] = idsRaw ? JSON.parse(idsRaw) : singleId ? [singleId] : [];

        if (!ids.length) { setLoading(false); return; }

        const results = await Promise.all(
          ids.map(id => fetch(`${API_BASE}/api/payments/${id}`, { headers }).then(r => r.json()))
        );
        setPayments(results.filter(Boolean));

        // Auto-confirm
        await Promise.all(
          ids.map(id =>
            fetch(`${API_BASE}/api/payments/confirm`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ payment_id: id }),
            })
          )
        );

        localStorage.removeItem("paysplit_payment_ids");
        localStorage.removeItem("paysplit_payment_id");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  const total    = payments.reduce((s, p) => s + p.amount_cents, 0);
  const merchant = payments[0]?.to_user ?? "merchant";

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">PaySplit AI</span>
        </div>
      </nav>

      <div className="mx-auto max-w-lg px-6 py-20">
        <div className={`transition-all duration-700 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <CheckCircle size={36} className="text-primary" />
                </div>
              </div>
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold text-center mb-2">Payment Successful</h1>
          <p className="text-center text-muted-foreground text-sm mb-8 capitalize">
            {total > 0 ? `${fmt(total)} paid to ${merchant}` : `Paid to ${merchant}`}
          </p>

          {/* Split breakdown */}
          {payments.length > 1 && (
            <div className="glass gradient-border rounded-2xl overflow-hidden mb-8">
              <div className="px-5 py-3 border-b border-border/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Split Breakdown</p>
              </div>
              {payments.map((p, i) => {
                const cardName = p.settlement_ref?.replace("split:", "") ?? `Card ${i + 1}`;
                const pct = total > 0 ? Math.round((p.amount_cents / total) * 100) : 0;
                return (
                  <div key={p.id} className={`flex justify-between items-center px-5 py-4 ${i < payments.length - 1 ? "border-b border-border/40" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {pct}%
                      </span>
                      <span className="text-sm font-semibold capitalize">{cardName}</span>
                    </div>
                    <span className="font-bold text-sm">{fmt(p.amount_cents)}</span>
                  </div>
                );
              })}
              {total > 0 && (
                <div className="px-5 py-3 border-t border-border/60 bg-secondary/20">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
                    {payments.map((p, i) => {
                      const pct = Math.round((p.amount_cents / total) * 100);
                      const colors = ["bg-primary", "bg-accent"];
                      return <div key={i} className={`h-full ${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition glow-primary"
            >
              <Home size={15} />
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate("/split")}
              className="flex-1 rounded-xl border border-border bg-secondary/30 px-5 py-3.5 text-sm font-bold text-foreground hover:bg-secondary transition"
            >
              New Split
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
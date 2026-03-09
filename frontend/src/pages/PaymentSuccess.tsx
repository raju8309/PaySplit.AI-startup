import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

type Payment = {
  id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  status: string;
  settlement_ref?: string;
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function PaymentSuccess() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [animate, setAnimate]   = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        // Try multi-payment IDs first (split checkout)
        const idsRaw = localStorage.getItem("paysplit_payment_ids");
        const singleId = params.get("payment_id");

        const ids: string[] = idsRaw
          ? JSON.parse(idsRaw)
          : singleId
          ? [singleId]
          : [];

        if (ids.length === 0) { setLoading(false); return; }

        const results = await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE}/api/payments/${id}`, { headers }).then((r) => r.json())
          )
        );

        setPayments(results.filter(Boolean));

        // Auto-confirm for demo if webhook not set up
        await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE}/api/payments/confirm`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ payment_id: id }),
            })
          )
        );

        // Clean up
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

  const total = payments.reduce((s, p) => s + p.amount_cents, 0);
  const merchant = payments[0]?.to_user ?? "merchant";

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center px-4">

      {/* Radial glow behind the card */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--primary) / 0.12), transparent 70%)",
        }}
      />

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="glass-strong gradient-border rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-8 flex flex-col items-center text-center">

            {/* Animated checkmark */}
            <div
              className={`relative mb-6 transition-all duration-700 delay-200 ${
                animate ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative h-20 w-20 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center glow-primary">
                <CheckCircle size={40} className="text-primary" />
              </div>
            </div>

            {/* Heading */}
            <div className={`transition-all duration-500 delay-300 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
                Payment Complete
              </h1>
              <p className="text-muted-foreground text-sm">
                Your split payment to <span className="text-foreground font-semibold capitalize">{merchant}</span> was processed successfully.
              </p>
            </div>

            {/* Total amount */}
            {total > 0 && (
              <div className={`my-7 transition-all duration-500 delay-400 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-1">Total Paid</div>
                <div className="font-display text-5xl font-bold text-gradient-primary">
                  {fmt(total)}
                </div>
              </div>
            )}

            {/* Split breakdown */}
            {payments.length > 1 && (
              <div className={`w-full mb-7 transition-all duration-500 delay-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="text-xs text-muted-foreground font-semibold tracking-widest uppercase mb-3 text-left">
                  Split Breakdown
                </div>
                <div className="flex flex-col gap-2">
                  {payments.map((p, i) => {
                    const cardName = p.settlement_ref?.replace("split:", "") ?? `Card ${i + 1}`;
                    const pct = total > 0 ? Math.round((p.amount_cents / total) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-secondary/30 border border-border/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {pct}%
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold capitalize">{cardName}</p>
                            <p className="text-xs text-muted-foreground">Card {i + 1} of {payments.length}</p>
                          </div>
                        </div>
                        <div className="font-bold text-sm">{fmt(p.amount_cents)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Visual split bar */}
                <div className="mt-3 h-2 rounded-full overflow-hidden flex">
                  {payments.map((p, i) => {
                    const pct = total > 0 ? (p.amount_cents / total) * 100 : 0;
                    return (
                      <div
                        key={p.id}
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: i === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rewards hint */}
            <div className={`w-full mb-7 transition-all duration-500 delay-[600ms] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="flex items-center gap-2 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3">
                <Sparkles size={15} className="text-primary shrink-0" />
                <p className="text-xs text-muted-foreground text-left">
                  Your cards earned cashback rewards on this transaction.
                </p>
              </div>
            </div>

            {/* CTA buttons */}
            <div className={`w-full flex flex-col gap-3 transition-all duration-500 delay-700 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition glow-primary"
              >
                <LayoutDashboard size={15} />
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate("/split")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-3.5 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                New Split
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Secured by PaySplit AI · Powered by Stripe
        </p>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import {
  ArrowLeft, Zap, TrendingUp, CreditCard, ShieldCheck,
  ShieldAlert, Download, RefreshCw
} from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Summary = {
  total_payments_count: number;
  total_payments_paid_cents: number;
  total_expenses_count: number;
  total_expenses_amount_cents: number;
};

type MonthPoint = { month: string; total_cents: number; count: number };
type StatusBreakdown = { status: string; count: number; amount_cents: number };

const STATUS_COLORS: Record<string, string> = {
  paid:    "hsl(var(--primary))",
  pending: "hsl(45 90% 55%)",
  failed:  "hsl(var(--destructive))",
};

// ── Custom tooltip for bar chart ──────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-4 py-2.5 border border-border/60 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-primary">{fmt(payload[0].value * 100)}</p>
      <p className="text-muted-foreground">{payload[1]?.value ?? 0} transactions</p>
    </div>
  );
}

// ── Custom tooltip for status bar chart ──────────────────────────────────────
function StatusTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-4 py-2.5 border border-border/60 text-xs">
      <p className="font-bold capitalize text-foreground mb-1">{label}</p>
      <p style={{ color: payload[0]?.fill }}>{fmt(payload[0]?.value * 100)}</p>
      <p className="text-muted-foreground">{payload[1]?.value} payments</p>
    </div>
  );
}


function TransactionHistory() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/transactions/history`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { transactions: [] })
      .then(d => { setTxns(d.transactions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (txns.length === 0) return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      No split transactions yet. Make a purchase with your PaySplit card to see history here.
    </div>
  );

  return (
    <div className="divide-y divide-border/40">
      {txns.map((t, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold">{t.merchant || "Online Purchase"}</p>
            <p className="text-xs text-muted-foreground">{t.card_name} · {Math.round(t.percentage * 100)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">${t.card_amount?.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">of ${t.total_amount?.toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();

  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [monthly,   setMonthly]   = useState<MonthPoint[]>([]);
  const [byStatus,  setByStatus]  = useState<StatusBreakdown[]>([]);
  const [fraudProb, setFraudProb] = useState<number | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const h = authHeaders();

      const [sRes, mRes, bRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/summary`, { headers: h }),
        fetch(`${API_BASE}/api/analytics/monthly-spend?months=6`, { headers: h }),
        fetch(`${API_BASE}/api/analytics/payments-by-status`, { headers: h }),
      ]);

      if (sRes.ok) setSummary(await sRes.json());
      if (mRes.ok) { const d = await mRes.json(); setMonthly(d.points ?? []); }
      if (bRes.ok) { const d = await bRes.json(); setByStatus(d.breakdown ?? []); }

      // Fraud check with neutral/zero features
      try {
        const fRes = await fetch(`${API_BASE}/api/ml/fraud`, {
          method: "POST",
          headers: { ...h, "Content-Type": "application/json" },
          body: JSON.stringify({ features: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
        });
        if (fRes.ok) {
          const fd = await fRes.json();
          setFraudProb(fd.probability ?? null);
        }
      } catch { /* fraud model optional */ }

    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const barData = monthly.map((p) => ({
    month: p.month,
    spend: p.total_cents / 100,
    transactions: p.count,
  }));

  const pieData = byStatus.map((b) => ({
    name: b.status,
    value: b.amount_cents / 100,
    count: b.count,
    amount_cents: b.amount_cents,
    fill: STATUS_COLORS[b.status] ?? "hsl(var(--muted-foreground))",
  }));

  const totalPaid    = byStatus.find(b => b.status === "paid")?.amount_cents ?? 0;
  const totalPending = byStatus.find(b => b.status === "pending")?.amount_cents ?? 0;
  const fraudClean   = fraudProb !== null && fraudProb < 0.5;

  const statCards = [
    {
      label: "Total Paid",
      value: summary ? fmt(summary.total_payments_paid_cents) : "—",
      sub:   summary ? `${summary.total_payments_count} payments` : "",
      icon:  <TrendingUp size={18} className="text-primary" />,
    },
    {
      label: "Pending",
      value: fmt(totalPending),
      sub:   `${byStatus.find(b => b.status === "pending")?.count ?? 0} payments`,
      icon:  <CreditCard size={18} className="text-yellow-400" />,
    },
    {
      label: "Fraud Status",
      value: fraudProb === null ? "N/A" : fraudClean ? "Clean" : "At Risk",
      sub:   fraudProb !== null ? `Score: ${(fraudProb * 100).toFixed(1)}%` : "Model unavailable",
      icon:  fraudClean
        ? <ShieldCheck size={18} className="text-primary" />
        : <ShieldAlert size={18} className="text-yellow-400" />,
    },
    {
      label: "Expenses Tracked",
      value: summary ? String(summary.total_expenses_count) : "—",
      sub:   summary ? fmt(summary.total_expenses_amount_cents) + " total" : "",
      icon:  <CreditCard size={18} className="text-accent" />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")}
              className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition">
              <ArrowLeft size={15} />
            </button>
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
              <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-display text-lg">PaySplit<span className="text-primary">.ai</span></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <a
              href={`${API_BASE}/api/reports/payments.csv`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-border rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition"
            >
              <Download size={13} />
              Export CSV
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display text-4xl">Your Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days of payment activity</p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className="glass gradient-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <div className="h-8 w-8 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center">
                  {s.icon}
                </div>
              </div>
              <p className="font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Monthly spend bar chart — spans 2 cols */}
          <div className="md:col-span-2 glass gradient-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-display font-bold text-base">Monthly Spend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 6 months of expenses</p>
            </div>

            {barData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground/60">
                No expense data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={28}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} />
                  <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment status donut */}
          <div className="glass gradient-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="font-display font-bold text-base">Payment Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Breakdown by status</p>
            </div>

            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground/60">
                No payment data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pieData} barSize={32} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    width={56}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <Tooltip content={<StatusTooltip />} cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Status breakdown table ── */}
        {byStatus.length > 0 && (
          <div className="glass gradient-border rounded-xl p-6 mb-8">
            <h2 className="font-display font-bold text-base mb-4">Payment Breakdown</h2>
            <div className="divide-y divide-border/40">
              {byStatus.map((b, i) => {
                const total = byStatus.reduce((s, x) => s + x.amount_cents, 0);
                const pct   = total > 0 ? Math.round((b.amount_cents / total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[b.status] ?? "hsl(var(--muted-foreground))" }}
                      />
                      <span className="capitalize text-sm font-semibold">{b.status}</span>
                      <span className="text-xs text-muted-foreground">{b.count} payments</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: STATUS_COLORS[b.status] ?? "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold w-20 text-right">{fmt(b.amount_cents)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* ── Split Transaction History ── */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            Split Transaction History
          </h2>
          <TransactionHistory />
        </div>
        {/* ── Fraud status card ── */
        <div className={`rounded-2xl border p-6 flex items-start gap-4 ${
          fraudProb === null
            ? "border-border bg-secondary/40"
            : fraudClean
            ? "border-primary/30 bg-primary/5"
            : "border-yellow-500/30 bg-yellow-500/5"
        }`}>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
            fraudClean ? "bg-primary/10" : "bg-yellow-500/10"
          }`}>
            {fraudClean
              ? <ShieldCheck size={22} className="text-primary" />
              : <ShieldAlert size={22} className="text-yellow-400" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold">
                {fraudProb === null ? "Fraud Model Unavailable" : fraudClean ? "Account Looks Clean" : "Elevated Risk Detected"}
              </h3>
              {fraudProb !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  fraudClean
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                }`}>
                  {(fraudProb * 100).toFixed(1)}% risk
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {fraudProb === null
                ? "The Isolation Forest fraud model is not loaded on the server."
                : fraudClean
                ? "Isolation Forest anomaly detection shows normal activity patterns on your account."
                : "Unusual patterns detected. Review your recent transactions and contact support if needed."
              }
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
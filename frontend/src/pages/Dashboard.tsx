import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard, DollarSign, ShieldCheck, ShieldAlert,
  Plus, LogOut, Clock, Zap, TrendingUp, Wallet,
} from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

type AnalyticsSummary = {
  total_cards: number;
  total_balance: number;
  fraud_status: string;
};

type RecentActivityItem = {
  merchant?: string;
  to_user?: string;
  status: string;
  amount?: number;
  amount_cents?: number;
  created_at: string;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function normalizeArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "items", "results", "activity", "payments", "expenses"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary]   = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent]     = useState<RecentActivityItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [username, setUsername] = useState("");

  const token = useMemo(() => localStorage.getItem("access_token"), []);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const [sRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/api/analytics/summary`, { headers }),
          fetch(`${API_BASE}/api/analytics/recent-activity?limit=5`, { headers }),
        ]);

        if (sRes.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/", { replace: true });
          return;
        }
        if (sRes.ok) setSummary(await sRes.json());
        if (rRes.ok) {
          const raw = normalizeArray<RecentActivityItem>(await rRes.json());
          const clean = raw.filter(x => {
            const hasMerchant = !!(x.to_user || x.merchant);
            const hasAmount = (x.amount_cents != null ? x.amount_cents : (x.amount ?? 0) * 100) > 0;
            return hasMerchant && hasAmount;
          });
          setRecent(clean);
        } else {
          setRecent([]);
        }
      } catch (e) {
        console.error("[Dashboard]", e);
        setRecent([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, navigate]);

  const fraudStatus    = summary?.fraud_status ?? "Unknown";
  const fraudIsClean   = fraudStatus.toLowerCase().includes("clean");
  const fraudIsUnknown = fraudStatus.toLowerCase() === "unknown";

  const onLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
              <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              PaySplit <span className="text-primary">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["How It Works", "AI Features", "Pricing"].map((l) => (
              <span key={l} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-default">
                {l}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {username[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium">{username}</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome back{username ? `, ${username}` : ""}
            <span className="text-muted-foreground/40">.</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">Here's your payment overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard loading={loading} icon={<CreditCard size={15} className="text-primary" />} label="Cards" value={String(summary?.total_cards ?? 0)} sub="Connected cards" />
          <StatCard loading={loading} icon={<DollarSign size={15} className="text-primary" />} label="Total Balance" value={formatMoney(summary?.total_balance ?? 0)} sub="Across all cards" />
          <StatCard
            loading={loading}
            icon={
              fraudIsUnknown ? <ShieldAlert size={15} className="text-muted-foreground" /> :
              fraudIsClean   ? <ShieldCheck size={15} className="text-primary" /> :
                               <ShieldAlert size={15} className="text-yellow-500" />
            }
            label="Fraud Status" value={fraudStatus} sub="Real-time protection"
            valueClassName={
              fraudIsUnknown ? "text-muted-foreground" :
              fraudIsClean   ? "text-primary" :
                               "text-yellow-500"
            }
          />
        </div>

        {/* ── Virtual Card Banner ── */}
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Wallet size={16} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">PaySplit Virtual Card</p>
              <p className="text-xs text-muted-foreground mt-0.5">One card. Splits across all your cards automatically.</p>
            </div>
          </div>
          <Link
            to="/virtual-card"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <CreditCard size={14} /> My Virtual Card
          </Link>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Link to="/split" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition glow-primary">
            <Plus size={15} /> Create Split
          </Link>
          <Link to="/cards" className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition">
            <CreditCard size={15} /> Manage Cards
          </Link>
          <Link to="/analytics" className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition">
            <TrendingUp size={15} /> Analytics
          </Link>
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-display text-xl font-bold tracking-tight">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-3">
            {loading
              ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
              : recent.length === 0
              ? <EmptyState />
              : recent.map((x, i) => <ActivityRow key={i} item={x} />)
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ loading, icon, label, value, sub, valueClassName = "text-foreground" }: {
  loading: boolean; icon: React.ReactNode; label: string; value: string; sub: string; valueClassName?: string;
}) {
  return (
    <div className="glass gradient-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center">{icon}</div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <><div className="h-7 w-28 rounded-lg bg-muted animate-pulse" /><div className="h-3 w-20 rounded-lg bg-muted animate-pulse mt-2" /></>
      ) : (
        <><div className={`text-3xl font-display font-bold tracking-tight ${valueClassName}`}>{value}</div><div className="text-xs text-muted-foreground mt-1">{sub}</div></>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const merchant = item.to_user || item.merchant || "Unknown";
  const amount = item.amount_cents != null ? item.amount_cents / 100 : Number(item.amount ?? 0);
  const isCompleted = item.status?.toLowerCase() === "completed";
  const isFailed = item.status?.toLowerCase().includes("fail");
  const statusClass = isCompleted ? "bg-primary/10 text-primary" : isFailed ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-400";
  return (
    <div className="glass rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-card/80 transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <CreditCard size={15} className="text-primary" />
        </div>
        <div>
          <div className="font-semibold text-sm capitalize">{merchant}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}{" · "}{item.created_at ? timeAgo(item.created_at) : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusClass}`}>{item.status || "pending"}</span>
        <span className="font-bold text-sm">{formatMoney(amount)}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3 border-dashed">
      <Clock size={22} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No activity yet.</p>
      <p className="text-xs text-muted-foreground/60">Create your first split to get started.</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="h-4 w-40 rounded-lg bg-muted animate-pulse" />
      <div className="h-3 w-24 rounded-lg bg-muted animate-pulse mt-2" />
    </div>
  );
}
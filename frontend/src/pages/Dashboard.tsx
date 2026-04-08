import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard, DollarSign, ShieldCheck, ShieldAlert,
  Plus, LogOut, Clock, Zap, TrendingUp, Wallet, ArrowUpRight,
} from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

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

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          setRecent(raw.filter((x) => {
            const hasMerchant = !!(x.to_user || x.merchant);
            const hasAmount = (x.amount_cents != null ? x.amount_cents : (x.amount ?? 0) * 100) > 0;
            return hasMerchant && hasAmount;
          }));
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

  const fraudStatus = summary?.fraud_status ?? "Unknown";
  const fraudIsClean = fraudStatus.toLowerCase().includes("clean");
  const fraudIsUnknown = fraudStatus.toLowerCase() === "unknown";

  const onLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    navigate("/", { replace: true });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[700px] h-[500px] rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap size={15} className="text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              PaySplit<span className="text-primary">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {username && (
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                  {username[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium">{username}</span>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/20 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition"
            >
              <LogOut size={13} /> Log out
            </motion.button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10 relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="text-sm text-muted-foreground mb-1">{greeting()}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {username ? username.split(" ")[0] : "Welcome"}
            <span className="text-muted-foreground/30"> ·</span>
          </h1>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          <StatCard
            loading={loading}
            icon={<CreditCard size={16} />}
            label="Connected Cards"
            value={String(summary?.total_cards ?? 0)}
            sub="cards linked"
            accent="primary"
          />
          <StatCard
            loading={loading}
            icon={<DollarSign size={16} />}
            label="Total Balance"
            value={formatMoney(summary?.total_balance ?? 0)}
            sub="across all cards"
            accent="primary"
          />
          <StatCard
            loading={loading}
            icon={
              fraudIsUnknown ? <ShieldAlert size={16} /> :
              fraudIsClean   ? <ShieldCheck size={16} /> :
                               <ShieldAlert size={16} />
            }
            label="Fraud Status"
            value={fraudStatus}
            sub="real-time protection"
            accent={fraudIsUnknown ? "muted" : fraudIsClean ? "primary" : "yellow"}
          />
        </motion.div>

        {/* Virtual card banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 to-primary/4 p-5 mb-4 flex items-center justify-between"
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Wallet size={17} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">PaySplit Virtual Card</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One card · Splits across all your cards automatically
              </p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="relative shrink-0">
            <Link
              to="/virtual-card"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 hover:opacity-90 transition"
            >
              <CreditCard size={14} /> My Card
            </Link>
          </motion.div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2.5 mb-10"
        >
          <ActionBtn to="/split" icon={<Plus size={14} />} primary>
            Create Split
          </ActionBtn>
          <ActionBtn to="/cards" icon={<CreditCard size={14} />}>
            Manage Cards
          </ActionBtn>
          <ActionBtn to="/analytics" icon={<TrendingUp size={14} />}>
            Analytics
          </ActionBtn>
        </motion.div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-muted-foreground" />
            <h2 className="font-display text-lg font-bold">Recent Activity</h2>
          </div>

          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-2.5"
          >
            {loading
              ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
              : recent.length === 0
              ? <EmptyState />
              : recent.map((x, i) => <ActivityRow key={i} item={x} />)
            }
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  loading, icon, label, value, sub, accent,
}: {
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "muted" | "yellow";
}) {
  const colorMap = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    yellow: "text-yellow-400",
  };

  return (
    <motion.div
      variants={stagger.item}
      className="glass rounded-2xl p-5 border border-border/40 hover:border-border/70 transition-colors"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`${colorMap[accent]} opacity-70`}>{icon}</div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <div className={`text-2xl font-display font-bold tracking-tight ${colorMap[accent]}`}>
            {value}
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">{sub}</div>
        </>
      )}
    </motion.div>
  );
}

function ActionBtn({
  to, icon, children, primary,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Link
        to={to}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          primary
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:opacity-90"
            : "border border-border/60 bg-secondary/20 text-foreground hover:bg-secondary/50"
        }`}
      >
        {icon} {children}
      </Link>
    </motion.div>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const merchant = item.to_user || item.merchant || "Unknown";
  const amount = item.amount_cents != null ? item.amount_cents / 100 : Number(item.amount ?? 0);
  const isCompleted = item.status?.toLowerCase() === "completed";
  const isFailed = item.status?.toLowerCase().includes("fail");

  return (
    <motion.div
      variants={stagger.item}
      className="glass rounded-2xl px-5 py-4 flex items-center justify-between border border-border/30 hover:border-border/60 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <CreditCard size={14} className="text-primary" />
        </div>
        <div>
          <div className="font-semibold text-sm capitalize">{merchant}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.created_at
              ? `${new Date(item.created_at).toLocaleDateString()} · ${timeAgo(item.created_at)}`
              : "—"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${
            isCompleted
              ? "bg-primary/10 text-primary"
              : isFailed
              ? "bg-destructive/10 text-destructive"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {item.status || "pending"}
        </span>
        <span className="font-bold text-sm tabular-nums">{formatMoney(amount)}</span>
        <ArrowUpRight size={13} className="text-muted-foreground/40 group-hover:text-muted-foreground transition" />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      variants={stagger.item}
      className="glass rounded-2xl p-12 flex flex-col items-center gap-3 border border-dashed border-border/40"
    >
      <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center mb-1">
        <Clock size={18} className="text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
      <p className="text-xs text-muted-foreground/50">Create your first split to get started.</p>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 border border-border/30">
      <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-2.5 w-20 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-16 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}

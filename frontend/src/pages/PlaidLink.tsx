import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Building2, CheckCircle, RefreshCw, CreditCard, AlertTriangle } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

type Account = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string;
  current_balance: number | null;
  available_balance: number | null;
  credit_limit: number | null;
  currency: string;
};

// ── Plaid Link button ─────────────────────────────────────────────────────────
function PlaidLinkButton({ linkToken, onSuccess }: { linkToken: string; onSuccess: () => void }) {
  const onPlaidSuccess = useCallback(async (public_token: string) => {
    try {
      const token = localStorage.getItem("access_token") || "";
      const userId = token.slice(0, 20) || "default_user";

      await fetch(`${API_BASE}/api/plaid/exchange-token`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ public_token, user_id: userId }),
      });
      onSuccess();
    } catch (e) {
      console.error(e);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
    >
      <Building2 size={16} />
      {ready ? "Connect Your Bank" : "Loading..."}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlaidLink() {
  const navigate = useNavigate();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token") || "";
  const userId = token.slice(0, 20) || "default_user";

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    try {
      // Check if already linked
      const statusRes = await fetch(`${API_BASE}/api/plaid/status/${userId}`, {
        headers: authHeaders(),
      });
      if (statusRes.ok) {
        const status = await statusRes.json();
        setIsLinked(status.is_linked);
        if (status.is_linked) {
          await fetchBalances();
        }
      }

      // Get link token for Plaid UI
      const tokenRes = await fetch(`${API_BASE}/api/plaid/link-token`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (tokenRes.ok) {
        const data = await tokenRes.json();
        setLinkToken(data.link_token);
      }
    } catch (e) {
      setError("Failed to initialize Plaid");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/plaid/balances/${userId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setIsLinked(true);
      }
    } catch (e) {
      setError("Failed to fetch balances");
    } finally {
      setSyncing(false);
    }
  };

  const onLinkSuccess = async () => {
    setIsLinked(true);
    await fetchBalances();
  };

  const creditCards = accounts.filter(a => a.subtype === "credit card" || a.type === "credit");
  const bankAccounts = accounts.filter(a => a.type === "depository");

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
              <div>
                <span className="font-display text-base font-bold">Connect Bank</span>
                <p className="text-xs text-muted-foreground">Powered by Plaid</p>
              </div>
            </div>
          </div>
          {isLinked && (
            <button
              onClick={fetchBalances}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              Sync
            </button>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* Not linked state */}
        {!loading && !isLinked && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Building2 size={36} className="text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">Connect Your Bank</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Securely connect your bank accounts via Plaid. We'll automatically sync your card balances and limits — no manual entry needed.
            </p>

            <div className="flex flex-col items-center gap-4">
              {linkToken ? (
                <PlaidLinkButton linkToken={linkToken} onSuccess={onLinkSuccess} />
              ) : (
                <div className="h-10 w-48 bg-muted animate-pulse rounded-xl" />
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                🔒 Bank-level encryption · Read-only access · Powered by Plaid
              </p>
            </div>

            {/* What we access */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {[
                { icon: "✅", title: "Card Balances", desc: "Real-time balance and available credit" },
                { icon: "✅", title: "Credit Limits", desc: "Automatically pulled from your bank" },
                { icon: "❌", title: "Account Numbers", desc: "We never store your full account number" },
              ].map((item, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-border">
                  <p className="text-lg mb-2">{item.icon}</p>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
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

        {/* Linked — show accounts */}
        {!loading && isLinked && (
          <div className="space-y-6">

            {/* Success banner */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
              <CheckCircle size={16} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary">Bank Connected</p>
                <p className="text-xs text-muted-foreground">Balances sync automatically</p>
              </div>
              {linkToken && (
                <div className="ml-auto">
                  <PlaidLinkButton linkToken={linkToken} onSuccess={onLinkSuccess} />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* Credit cards */}
            {creditCards.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  Credit Cards
                </h3>
                <div className="flex flex-col gap-3">
                  {creditCards.map(account => (
                    <div key={account.account_id} className="glass gradient-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{account.name}</p>
                          {account.official_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">{account.official_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatMoney(account.current_balance)}</p>
                          <p className="text-xs text-muted-foreground">balance</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-secondary/40 rounded-lg px-3 py-2">
                          <p className="text-muted-foreground mb-0.5">Available</p>
                          <p className="font-bold">{formatMoney(account.available_balance)}</p>
                        </div>
                        <div className="bg-secondary/40 rounded-lg px-3 py-2">
                          <p className="text-muted-foreground mb-0.5">Credit Limit</p>
                          <p className="font-bold">{formatMoney(account.credit_limit)}</p>
                        </div>
                      </div>

                      {account.credit_limit && account.current_balance != null && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, (account.current_balance / account.credit_limit) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((account.current_balance / account.credit_limit) * 100)}% utilized
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank accounts */}
            {bankAccounts.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  Bank Accounts
                </h3>
                <div className="flex flex-col gap-3">
                  {bankAccounts.map(account => (
                    <div key={account.account_id} className="glass gradient-border rounded-2xl px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{account.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{account.subtype}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatMoney(account.available_balance ?? account.current_balance)}</p>
                        <p className="text-xs text-muted-foreground">available</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accounts.length === 0 && !syncing && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No accounts found. Try syncing again.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
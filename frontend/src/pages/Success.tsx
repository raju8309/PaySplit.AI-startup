

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

type ConfirmResponse = {
  status?: string;
  payment_status?: string;
  message?: string;
  payment_id?: string;
  session_id?: string;
  amount_cents?: number;
  amount?: number;
  currency?: string;
  [key: string]: any;
};

function getApiBase() {
  // Vite env var (recommended): VITE_API_BASE_URL=http://127.0.0.1:8000
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (fromEnv || "").replace(/\/$/, "");
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    const msg = detail?.detail || detail?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return (await res.json()) as T;
}

export default function Success() {
  const apiBase = useMemo(() => getApiBase(), []);
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmResponse | null>(null);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sessionId = query.get("session_id") || query.get("sessionId") || undefined;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      // If you stored payment_id before redirecting to Stripe, we can read it here.
      const paymentId = localStorage.getItem("paysplit_payment_id") || undefined;

      // Try to confirm using whatever we have.
      // Backend commonly supports confirming by session_id OR payment_id.
      // We try a couple payload shapes to be resilient.
      const candidates: any[] = [];
      if (sessionId) candidates.push({ session_id: sessionId });
      if (paymentId) candidates.push({ payment_id: paymentId });
      if (sessionId && paymentId) candidates.push({ session_id: sessionId, payment_id: paymentId });

      if (candidates.length === 0) {
        throw new Error(
          "Missing Stripe session_id. Please return to checkout and try again (or check that the success URL includes ?session_id=...)."
        );
      }

      let lastErr: any = null;
      for (const payload of candidates) {
        try {
          const resp = await postJson<ConfirmResponse>(`${apiBase}/api/payments/confirm`, payload);
          if (cancelled) return;
          setData(resp);

          // Cleanup stored id after success confirm.
          try {
            localStorage.removeItem("paysplit_payment_id");
          } catch {
            // ignore
          }

          setLoading(false);
          return;
        } catch (e) {
          lastErr = e;
        }
      }

      throw lastErr || new Error("Payment confirmation failed.");
    }

    run().catch((e: any) => {
      if (cancelled) return;
      setError(e?.message || "Something went wrong.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [apiBase, sessionId]);

  const prettyStatus =
    data?.payment_status ||
    data?.status ||
    (data ? "confirmed" : "unknown");

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>✅ Payment Success</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Thanks! We’re confirming your Stripe checkout and updating PaySplit.
      </p>

      {loading && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <p style={{ margin: 0 }}>Confirming payment…</p>
          <p style={{ margin: "8px 0 0", color: "#666", fontSize: 14 }}>
            session_id: <code>{sessionId || "(none)"}</code>
          </p>
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ffdddd",
            background: "#fff5f5",
            borderRadius: 12,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>⚠️ Couldn’t confirm the payment</p>
          <p style={{ margin: "8px 0 0" }}>{error}</p>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/" style={{ textDecoration: "underline" }}>
              Go back home
            </Link>
            <a
              href={`${apiBase}/docs`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline" }}
            >
              Open API docs
            </a>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Payment confirmed ✅</p>
          <p style={{ margin: "8px 0 0", color: "#666" }}>
            Status: <b>{String(prettyStatus)}</b>
          </p>

          <div style={{ marginTop: 12, fontSize: 14, color: "#444" }}>
            {data?.payment_id && (
              <p style={{ margin: "6px 0" }}>
                payment_id: <code>{data.payment_id}</code>
              </p>
            )}
            {data?.session_id && (
              <p style={{ margin: "6px 0" }}>
                session_id: <code>{data.session_id}</code>
              </p>
            )}
            {(data?.amount_cents != null || data?.amount != null) && (
              <p style={{ margin: "6px 0" }}>
                Amount: <code>{data.amount ?? (data.amount_cents! / 100)}</code> {data.currency || ""}
              </p>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              to="/dashboard"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </Link>
            <Link to="/" style={{ padding: "10px 14px", textDecoration: "underline" }}>
              Home
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, color: "#666", fontSize: 13 }}>
        <p style={{ margin: 0 }}>
          Tip: Set <code>VITE_API_BASE_URL</code> in <code>frontend/.env</code> to point to your backend.
        </p>
      </div>
    </div>
  );
}
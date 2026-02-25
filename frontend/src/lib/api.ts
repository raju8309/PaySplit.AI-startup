export async function createCheckoutSession(payload: {
  from_user: string;
  to_user: string;
  amount_cents: number;
  currency?: string;
  group_id?: string;
  settlement_ref?: string;
}) {
  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ url: string; session_id: string; payment_id: string }>;
}

export async function getPayment(payment_id: string) {
  const res = await fetch(`/api/payments/${payment_id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    id: string;
    status: "pending" | "paid" | "failed";
    amount_cents: number;
    from_user: string;
    to_user: string;
  }>;
}

export type AnalyticsSummary = {
  range: { start: string; end: string };
  total_groups: number;
  total_expenses_count: number;
  total_expenses_amount_cents: number;
  total_payments_count: number;
  total_payments_paid_cents: number;
  notes?: string[];
};

export type MonthlySpendPoint = {
  month: string; // YYYY-MM
  total_cents: number;
  count: number;
};

export type MonthlySpend = {
  months: number;
  points: MonthlySpendPoint[];
};

export type PaymentsByStatusItem = {
  status: string; // pending|paid|failed
  count: number;
  amount_cents: number;
};

export type PaymentsByStatus = {
  range: { start: string; end: string };
  group_id: string | null;
  breakdown: PaymentsByStatusItem[];
};

export type ActivityItem = {
  type: "expense" | "payment";
  id: string;
  created_at: string | null;
  title: string;
  amount_cents: number;
  meta?: Record<string, any>;
};

export type RecentActivity = {
  limit: number;
  items: ActivityItem[];
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function getAnalyticsSummary(params?: { start?: string; end?: string; group_id?: string }) {
  const q = new URLSearchParams();
  if (params?.start) q.set("start", params.start);
  if (params?.end) q.set("end", params.end);
  if (params?.group_id) q.set("group_id", params.group_id);
  const qs = q.toString();
  return apiGet<AnalyticsSummary>(`/api/analytics/summary${qs ? `?${qs}` : ""}`);
}

export function getMonthlySpend(months = 6) {
  const q = new URLSearchParams({ months: String(months) });
  return apiGet<MonthlySpend>(`/api/analytics/monthly-spend?${q.toString()}`);
}

export function getPaymentsByStatus(params?: { start?: string; end?: string; group_id?: string }) {
  const q = new URLSearchParams();
  if (params?.start) q.set("start", params.start);
  if (params?.end) q.set("end", params.end);
  if (params?.group_id) q.set("group_id", params.group_id);
  const qs = q.toString();
  return apiGet<PaymentsByStatus>(`/api/analytics/payments-by-status${qs ? `?${qs}` : ""}`);
}

export function getRecentActivity(limit = 10) {
  const q = new URLSearchParams({ limit: String(limit) });
  return apiGet<RecentActivity>(`/api/analytics/recent-activity?${q.toString()}`);
}

// CSV downloads
export function downloadExpensesCsv() {
  window.location.href = "/api/reports/expenses.csv";
}

export function downloadPaymentsCsv(params?: { group_id?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.group_id) q.set("group_id", params.group_id);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  window.location.href = `/api/reports/payments.csv${qs ? `?${qs}` : ""}`;
}
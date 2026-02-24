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
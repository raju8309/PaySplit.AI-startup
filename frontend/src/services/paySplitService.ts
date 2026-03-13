/**
 * paySplitService.ts
 *
 * Tries POST /api/settlements/optimize first.
 * If backend returns a single-card result (not a real split),
 * falls back to client-side rewards-proportional split algorithm.
 */

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

export type Card = {
  id: number;
  name: string;
  limit: number;
  balance: number;
  available: number;
  rewards_rate: number;
  last_four?: string | null;
  category_multipliers?: { [key: string]: number };
};

export type RecommendSplitRequest = {
  transaction_amount: number;
  merchant: string;
  free_trial: boolean;
  fraud_action: "warn" | "block";
  cards: Card[];
};

export type RecommendSplitResponse = {
  data: {
    allocations: { card_name: string; amount: number }[];
    fraud_warning: null | {
      fraud_probability?: number;
      threshold?: number;
      reason?: string;
    };
  };
};

export type CreateCheckoutRequest = {
  from_user: string;
  to_user: string;
  amount_cents: number;
};

export type CreateCheckoutResponse = {
  data: { url: string; payment_id?: string | number };
};

// ─── Client-side rewards-proportional split ───────────────────────────────────
// This is what the reference app does:
// Each card gets a share proportional to its rewards_rate.
// Cards with zero available balance are skipped.
function clientSideSplit(
  totalAmount: number,
  cards: Card[]
): { card_name: string; amount: number }[] {
  const eligible = cards.filter((c) => (c.available ?? c.limit) > 0);
  if (eligible.length === 0) return [];

  const totalRate = eligible.reduce((s, c) => s + c.rewards_rate, 0);

  if (totalRate === 0) {
    // Equal split if all rates are 0
    const each = Math.floor((totalAmount / eligible.length) * 100) / 100;
    const results = eligible.map((c) => ({ card_name: c.name, amount: each }));
    // Fix rounding on last card
    const allocated = results.reduce((s, r) => s + r.amount, 0);
    results[results.length - 1].amount = Math.round((totalAmount - allocated + results[results.length - 1].amount) * 100) / 100;
    return results;
  }

  let remaining = totalAmount;
  const results: { card_name: string; amount: number }[] = [];

  eligible.forEach((card, i) => {
    if (i === eligible.length - 1) {
      // Last card gets the remainder to avoid rounding errors
      results.push({ card_name: card.name, amount: Math.round(remaining * 100) / 100 });
    } else {
      const share = Math.round((card.rewards_rate / totalRate) * totalAmount * 100) / 100;
      results.push({ card_name: card.name, amount: share });
      remaining -= share;
      remaining = Math.round(remaining * 100) / 100;
    }
  });

  return results;
}

// ─── recommendSplit ───────────────────────────────────────────────────────────
export async function recommendSplit(
  req: RecommendSplitRequest
): Promise<RecommendSplitResponse> {
  try {
    const body = {
      total: req.transaction_amount,
      merchant: req.merchant,
      cards: req.cards.map((c) => ({
        name: c.name,
        limit_cents: Math.round(c.limit * 100),
      })),
    };

    const res = await fetch(`${API_BASE}/api/settlements/optimize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      const allocations = normalizeAllocations(json);

      // ── If backend returned only 1 allocation for multiple cards,
      //    it didn't actually split — use client-side fallback instead
      if (allocations.length <= 1 && req.cards.length > 1) {
        return {
          data: {
            allocations: clientSideSplit(req.transaction_amount, req.cards),
            fraud_warning: json.fraud_warning ?? null,
          },
        };
      }

      return {
        data: {
          allocations,
          fraud_warning: json.fraud_warning ?? null,
        },
      };
    }
  } catch (e) {
    console.warn("[paySplitService] backend call failed, using client-side split", e);
  }

  // ── Full fallback: backend unreachable or errored ─────────────────────────
  return {
    data: {
      allocations: clientSideSplit(req.transaction_amount, req.cards),
      fraud_warning: null,
    },
  };
}

// ─── Normalize backend response shapes ───────────────────────────────────────
function normalizeAllocations(json: any): { card_name: string; amount: number }[] {
  if (Array.isArray(json.allocations)) {
    return json.allocations.map((a: any) => ({
      card_name: a.card_name ?? a.card ?? a.name ?? "Card",
      amount: Number(a.amount ?? 0),
    }));
  }
  if (Array.isArray(json.splits)) {
    return json.splits.map((s: any) => ({
      card_name: s.card ?? s.card_name ?? s.name ?? "Card",
      amount: s.amount_cents != null ? s.amount_cents / 100 : Number(s.amount ?? 0),
    }));
  }
  if (json.data) return normalizeAllocations(json.data);
  return [];
}

// ─── createCheckout (single card, unchanged) ─────────────────────────────────
export async function createCheckout(
  req: CreateCheckoutRequest
): Promise<CreateCheckoutResponse> {
  const res = await fetch(`${API_BASE}/api/payments/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(req),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json?.detail || `checkout failed: ${res.status}`) as any;
    err.response = { status: res.status, data: json };
    throw err;
  }

  if (json.data) return json as CreateCheckoutResponse;
  return { data: json };
}

// ─── splitCheckout (multi-card) → POST /api/payments/checkout-split ──────────
// Creates chained Stripe sessions: Card A → pay → Card B → pay → success page.
export type SplitCheckoutRequest = {
  from_user: string;
  to_user: string;
  currency?: string;
  cards: { card_name: string; amount_cents: number }[];
};

export type SplitCheckoutResponse = {
  url: string;           // URL of the first Stripe session
  payment_ids: string[];
};

export async function splitCheckout(
  req: SplitCheckoutRequest
): Promise<SplitCheckoutResponse> {
  const res = await fetch(`${API_BASE}/api/payments/checkout-split`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(req),
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json?.detail || `split checkout failed: ${res.status}`) as any;
    err.response = { status: res.status, data: json };
    throw err;
  }

  return json as SplitCheckoutResponse;
}
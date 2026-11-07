/**
 * Two user caps and one cart.
 * Approve only when the caps sum to the cart. Approval writes two collection
 * lines and one PaySplit authorization for the full cart. Any other total
 * declines the whole cart and writes nothing.
 * This function never calls a bank, an issuer, or a card network, and it
 * never splits the merchant authorization.
 */

export type CapInput = {
  cardId: string;
  label: string;
  capCents: number;
};

export type CollectionLine = {
  cardId: string;
  label: string;
  amountCents: number;
};

export type MerchantAuthorization = {
  cardId: "paysplit";
  amountCents: number;
  split: false;
};

export type ApprovedCheckout = {
  status: "approved";
  cartCents: number;
  merchantAuthorization: MerchantAuthorization;
  collections: [CollectionLine, CollectionLine];
};

export type DeclineReason = "caps_do_not_cover_cart" | "caps_do_not_match_cart";

export type DeclinedCheckout = {
  status: "declined";
  reason: DeclineReason;
  cartCents: number;
  capCents: [number, number];
  capsSumCents: number;
  merchantAuthorization: null;
  collections: [];
};

export type CheckoutDecision = ApprovedCheckout | DeclinedCheckout;

function assertCents(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer number of cents`);
  }
}

export function decideTwoCardCheckout(input: {
  cartCents: number;
  caps: readonly [CapInput, CapInput];
}): CheckoutDecision {
  const [first, second] = input.caps;
  assertCents(input.cartCents, "cartCents");
  assertCents(first.capCents, "caps[0].capCents");
  assertCents(second.capCents, "caps[1].capCents");
  if (!first.cardId || !second.cardId || first.cardId === second.cardId) {
    throw new TypeError("Caps must belong to two different cards");
  }

  const capsSumCents = first.capCents + second.capCents;
  if (capsSumCents !== input.cartCents) {
    return {
      status: "declined",
      reason: capsSumCents < input.cartCents ? "caps_do_not_cover_cart" : "caps_do_not_match_cart",
      cartCents: input.cartCents,
      capCents: [first.capCents, second.capCents],
      capsSumCents,
      merchantAuthorization: null,
      collections: [],
    };
  }

  return {
    status: "approved",
    cartCents: input.cartCents,
    merchantAuthorization: {
      cardId: "paysplit",
      amountCents: input.cartCents,
      split: false,
    },
    collections: [
      { cardId: first.cardId, label: first.label, amountCents: first.capCents },
      { cardId: second.cardId, label: second.label, amountCents: second.capCents },
    ],
  };
}

export function declineHeadline(decision: DeclinedCheckout): string {
  if (decision.reason === "caps_do_not_cover_cart") {
    return "The caps do not cover the cart.";
  }
  return "The caps do not add up to the cart.";
}

/** Collected amounts reduce what is still owed. A decline collects nothing. */
export function remainingToCollectCents(
  cartCents: number,
  decision: CheckoutDecision | null,
): number {
  if (decision?.status === "approved") {
    const collected = decision.collections[0].amountCents + decision.collections[1].amountCents;
    return cartCents - collected;
  }
  return cartCents;
}

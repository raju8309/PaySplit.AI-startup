import assert from "node:assert/strict";
import { test } from "node:test";

import { decideTwoCardCheckout, declineHeadline, remainingToCollectCents } from "./ledger.ts";
import { centsToInput, formatMoney, parseDollars } from "./money.ts";
import { CART_CENTS, cardTitle, fundingCards, orderTotalCents, paysplitCard } from "./sample.ts";

const visa = {
  cardId: fundingCards[0].cardId,
  label: cardTitle(fundingCards[0].label, fundingCards[0].last4),
  capCents: 1500,
};

const mastercard = {
  cardId: fundingCards[1].cardId,
  label: cardTitle(fundingCards[1].label, fundingCards[1].last4),
  capCents: 1000,
};

test("15 + 10 = 25 approves, fronts one card, and writes two collection lines", () => {
  const decision = decideTwoCardCheckout({
    cartCents: 2500,
    caps: [visa, mastercard],
  });

  assert.equal(decision.status, "approved");
  assert.equal(decision.merchantAuthorization?.split, false);
  assert.equal(decision.merchantAuthorization?.cardId, paysplitCard.cardId);
  assert.equal(decision.merchantAuthorization?.amountCents, 2500);
  assert.equal(Array.isArray(decision.merchantAuthorization), false);
  assert.deepEqual(decision.collections, [
    { cardId: visa.cardId, label: visa.label, amountCents: 1500 },
    { cardId: mastercard.cardId, label: mastercard.label, amountCents: 1000 },
  ]);
  const collected = decision.collections[0].amountCents + decision.collections[1].amountCents;
  assert.equal(collected, decision.merchantAuthorization?.amountCents);
  assert.equal(remainingToCollectCents(2500, decision), 0);
  assert.equal(formatMoney(decision.collections[0].amountCents), "$15.00");
  assert.equal(formatMoney(decision.collections[1].amountCents), "$10.00");
});

test("15 + 10 against 26 declines the whole cart", () => {
  const decision = decideTwoCardCheckout({
    cartCents: 2600,
    caps: [visa, mastercard],
  });

  assert.equal(decision.status, "declined");
  assert.equal(decision.reason, "caps_do_not_cover_cart");
  assert.equal(declineHeadline(decision), "The caps do not cover the cart.");
  assert.equal(decision.merchantAuthorization, null);
  assert.deepEqual(decision.collections, []);
  assert.equal(decision.capsSumCents, 2500);
  assert.equal(decision.cartCents, 2600);
  assert.equal(remainingToCollectCents(2600, decision), 2600);
});

test("caps that exceed the cart decline with no collection lines", () => {
  const decision = decideTwoCardCheckout({
    cartCents: 2500,
    caps: [visa, { ...mastercard, capCents: 1100 }],
  });

  assert.equal(decision.status, "declined");
  assert.equal(decision.reason, "caps_do_not_match_cart");
  assert.equal(declineHeadline(decision), "The caps do not add up to the cart.");
  assert.equal(decision.merchantAuthorization, null);
  assert.deepEqual(decision.collections, []);
});

test("caps short of the cart decline even when neither example uses 26", () => {
  const decision = decideTwoCardCheckout({
    cartCents: 2500,
    caps: [visa, { ...mastercard, capCents: 900 }],
  });

  assert.equal(decision.status, "declined");
  assert.equal(decision.reason, "caps_do_not_cover_cart");
  assert.equal(declineHeadline(decision), "The caps do not cover the cart.");
});

test("a zero cap still writes two lines when the caps sum to the cart", () => {
  const decision = decideTwoCardCheckout({
    cartCents: 2500,
    caps: [{ ...visa, capCents: 0 }, { ...mastercard, capCents: 2500 }],
  });

  assert.equal(decision.status, "approved");
  assert.equal(decision.collections.length, 2);
  assert.equal(decision.collections[0].amountCents, 0);
  assert.equal(decision.collections[1].amountCents, 2500);
  assert.equal(decision.merchantAuthorization?.amountCents, 2500);
  assert.equal(decision.merchantAuthorization?.split, false);
});

test("the sample DoorDash order is $25 and the sample caps approve it", () => {
  assert.equal(orderTotalCents(), CART_CENTS);
  assert.equal(CART_CENTS, 2500);
  assert.equal(fundingCards[0].capCents + fundingCards[1].capCents, CART_CENTS);

  const decision = decideTwoCardCheckout({
    cartCents: orderTotalCents(),
    caps: [
      { ...visa, capCents: fundingCards[0].capCents },
      { ...mastercard, capCents: fundingCards[1].capCents },
    ],
  });

  assert.equal(decision.status, "approved");
  assert.equal(decision.merchantAuthorization?.amountCents, orderTotalCents());
});

test("rejects amounts that are not whole cents", () => {
  assert.throws(
    () =>
      decideTwoCardCheckout({
        cartCents: 2500,
        caps: [visa, { ...mastercard, capCents: -1 }],
      }),
    /non-negative integer/,
  );
  assert.throws(
    () =>
      decideTwoCardCheckout({
        cartCents: 25.5,
        caps: [visa, mastercard],
      }),
    /non-negative integer/,
  );
});

test("parses cap fields into cents", () => {
  assert.equal(parseDollars("15"), 1500);
  assert.equal(parseDollars("15.00"), 1500);
  assert.equal(parseDollars("10.5"), 1050);
  assert.equal(parseDollars(" 10.10 "), 1010);
  assert.equal(parseDollars(""), null);
  assert.equal(parseDollars("15.555"), null);
  assert.equal(parseDollars("10.001"), null);
  assert.equal(parseDollars("abc"), null);
  assert.equal(parseDollars("-5"), null);
  assert.equal(centsToInput(1500), "15.00");
  assert.equal(centsToInput(1050), "10.50");
});

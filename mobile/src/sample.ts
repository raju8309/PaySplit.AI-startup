/** DoorDash sample. Line items sum to the $25 cart. Caps are $15 and $10. */

export const CART_CENTS = 2500;

export const order = {
  merchant: "DoorDash",
  place: "Luna Thai",
  lines: [
    { label: "Chicken Bowl", cents: 1285 },
    { label: "Chips & Guacamole", cents: 475 },
    { label: "Mexican Coca-Cola", cents: 335 },
    { label: "Delivery fee", cents: 249 },
    { label: "Tax", cents: 156 },
  ],
} as const;

export function orderTotalCents(): number {
  return order.lines.reduce((sum, line) => sum + line.cents, 0);
}

export const fundingCards = [
  {
    cardId: "visa-4242",
    label: "Everyday Visa",
    last4: "4242",
    capCents: 1500,
  },
  {
    cardId: "mc-8188",
    label: "World Mastercard",
    last4: "8188",
    capCents: 1000,
  },
] as const;

export const paysplitCard = {
  cardId: "paysplit",
  label: "PaySplit",
  last4: "7714",
  exp: "09/28",
} as const;

export function cardTitle(label: string, last4: string): string {
  return `${label} ····${last4}`;
}

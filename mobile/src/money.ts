/** Dollars and cents for the sample checkout. Display only — no payment rails. */

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${fraction}`;
}

export function centsToInput(cents: number): string {
  const whole = Math.floor(Math.abs(cents) / 100);
  const fraction = String(Math.abs(cents) % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** Parse a dollar field into cents. Rejects anything that is not a cent-exact amount. */
export function parseDollars(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isInteger(cents) || cents < 0 || cents > 100_000_000) return null;
  return cents;
}

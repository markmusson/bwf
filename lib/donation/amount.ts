// Donation amount validation. £10 minimum, integer pence.

export const MIN_DONATION_PENCE = 1000;
export const SUGGESTED_AMOUNTS_PENCE = [1000, 2500, 5000] as const;

export function validateAmountPence(pence: number): {
  ok: boolean;
  reason?: "not_integer" | "below_minimum";
} {
  if (!Number.isFinite(pence) || !Number.isInteger(pence)) {
    return { ok: false, reason: "not_integer" };
  }
  if (pence < MIN_DONATION_PENCE) {
    return { ok: false, reason: "below_minimum" };
  }
  return { ok: true };
}

export function poundsToPence(pounds: number): number {
  if (!Number.isFinite(pounds)) return Number.NaN;
  return Math.round(pounds * 100);
}

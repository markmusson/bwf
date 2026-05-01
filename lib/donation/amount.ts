// Donation amount validation. Global floor is £10; individual seats
// can raise the minimum based on their stand's tier price (premium
// seats start at £50, standard at £25, general at £10). The donor can
// always bump UPWARDS — the minimum is just a floor, never a ceiling.

export const MIN_DONATION_PENCE = 1000;
export const SUGGESTED_AMOUNTS_PENCE = [1000, 2500, 5000] as const;

export interface ValidateAmountOpts {
  /** Per-seat minimum (in pence). Defaults to the global £10 floor. */
  minimumPence?: number;
}

export function validateAmountPence(
  pence: number,
  opts: ValidateAmountOpts = {},
): {
  ok: boolean;
  reason?: "not_integer" | "below_minimum";
} {
  if (!Number.isFinite(pence) || !Number.isInteger(pence)) {
    return { ok: false, reason: "not_integer" };
  }
  const minimum = opts.minimumPence ?? MIN_DONATION_PENCE;
  if (pence < minimum) {
    return { ok: false, reason: "below_minimum" };
  }
  return { ok: true };
}

export function poundsToPence(pounds: number): number {
  if (!Number.isFinite(pounds)) return Number.NaN;
  return Math.round(pounds * 100);
}

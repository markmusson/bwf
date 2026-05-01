const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatGbpPence(pence: number): string {
  if (!Number.isFinite(pence) || !Number.isInteger(pence)) {
    throw new TypeError("formatGbpPence expects an integer number of pence");
  }
  return GBP.format(pence / 100);
}

// Compact GBP — no fractional pennies, used for headline stats where
// "£12,345" reads better than "£12,345.00".
const GBP_WHOLE = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatGbpPenceCompact(pence: number): string {
  if (!Number.isFinite(pence) || !Number.isInteger(pence)) {
    throw new TypeError(
      "formatGbpPenceCompact expects an integer number of pence",
    );
  }
  return GBP_WHOLE.format(pence / 100);
}

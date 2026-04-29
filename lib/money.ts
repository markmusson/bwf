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

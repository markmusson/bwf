// Gift Aid export CSV — minimal columns matching what we know about
// the donor at v1. The charity admin completes the HMRC R68 schedule
// fields (Title, address, postcode) externally before submission.
//
// Pence -> GBP is rendered as a 2dp string; HMRC accepts pence-only or
// 2dp pound values, but 2dp pounds is what their CSV examples use.

export interface GiftAidRow {
  donationDate: string; // ISO yyyy-mm-dd
  email: string | null;
  displayName: string | null;
  amountPence: number;
  upliftPence: number;
  stripePaymentIntentId: string | null;
}

export const GIFT_AID_CSV_HEADER = [
  "Donation Date",
  "Email",
  "Display Name",
  "Amount GBP",
  "Gift Aid Uplift GBP",
  "Stripe Payment Intent",
];

export function escapeCsvField(raw: string): string {
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function penceToPounds(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${pounds}.${remainder.toString().padStart(2, "0")}`;
}

export function formatGiftAidCsv(rows: readonly GiftAidRow[]): string {
  const lines: string[] = [GIFT_AID_CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.donationDate,
        row.email ?? "",
        row.displayName ?? "",
        penceToPounds(row.amountPence),
        penceToPounds(row.upliftPence),
        row.stripePaymentIntentId ?? "",
      ]
        .map(escapeCsvField)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function giftAidUplift(amountPence: number, giftAid: boolean): number {
  if (!giftAid) return 0;
  return Math.floor(amountPence / 4);
}

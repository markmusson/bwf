// Marketing-consent CSV — donors who ticked the "stay in touch" box on
// their donation. PECR-compliant: only opt-ins appear. Includes the
// consent timestamp so the charity has the record for their files.

import { escapeCsvField } from "./giftAidCsv";

export interface MarketingRow {
  donationDate: string;
  email: string | null;
  displayName: string | null;
  consentRecordedAt: number | null;
}

export const MARKETING_CSV_HEADER = [
  "Donation Date",
  "Email",
  "Display Name",
  "Consent Recorded At",
];

function isoOrBlank(ms: number | null): string {
  if (ms === null) return "";
  return new Date(ms).toISOString();
}

export function formatMarketingCsv(rows: readonly MarketingRow[]): string {
  const lines: string[] = [MARKETING_CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.donationDate,
        row.email ?? "",
        row.displayName ?? "",
        isoOrBlank(row.consentRecordedAt),
      ]
        .map(escapeCsvField)
        .join(","),
    );
  }
  return lines.join("\n");
}

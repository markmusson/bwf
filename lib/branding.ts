// BWF brand constants. Centralised so footer, receipts, T&Cs all read
// from one place. Match details ("England vs India" etc.) stay
// placeholder until Adam confirms — config-driven swap is one change
// here when each lands.

// Match-day timestamp drives the countdown timer. Tue 14 July 2026, 11:00
// UK time. Update when Adam confirms — single source of truth.
export const MATCH_DAY_ISO = "2026-07-14T10:00:00.000Z"; // 11:00 BST = 10:00 UTC

export const BWF = {
  charityNumber: "1185346",
  administeredBy: "The Talent Fund",
  domain: "bobwillisfund.org",
  fundraisingTargetPence: 20_000_00,
  matchDayIso: MATCH_DAY_ISO,
  campaign: {
    title: "Blue for Bob 2026",
    subtitle: "The Bob Willis Fund · Edgbaston",
    matchPills: [
      "Tue 14 July 2026 · 11:00am",
      "England vs India",
      "Edgbaston · Rothesay ODI",
    ] as const,
  },
} as const;

export const BWF_FOOTER_TEXT =
  `The Bob Willis Fund is administered by ${BWF.administeredBy}, ` +
  `registered charity ${BWF.charityNumber}.`;

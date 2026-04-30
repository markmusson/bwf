// BWF brand constants. Centralised so footer, receipts, T&Cs all read
// from one place. Match details ("England vs India" etc.) stay
// placeholder until Adam confirms — config-driven swap is one change
// here when each lands.

export const BWF = {
  charityNumber: "1185346",
  administeredBy: "The Talent Fund",
  domain: "bobwillisfund.org",
  fundraisingTargetPence: 20_000_00,
  campaign: {
    title: "Blue for Bob 2026",
    subtitle: "The Bob Willis Fund · Edgbaston",
    matchPills: [
      "England vs India (placeholder)",
      "Edgbaston, Birmingham",
      "ODI · Summer 2026 (placeholder)",
    ] as const,
  },
} as const;

export const BWF_FOOTER_TEXT =
  `The Bob Willis Fund is administered by ${BWF.administeredBy}, ` +
  `registered charity ${BWF.charityNumber}.`;

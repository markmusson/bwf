// Marketing consent — PECR / GDPR rules.
//
// Per design/04-enthuse-pattern-findings.md §4: consent must be a
// positive, informed choice. No pre-ticked boxes, no implicit defaults.
// The donor must explicitly opt in or opt out before continuing.
// We capture the answer plus a timestamp for ICO defensibility.

export type MarketingConsent =
  | { state: "unanswered" }
  | { state: "opted-in"; recordedAt: number }
  | { state: "opted-out"; recordedAt: number };

export const UNANSWERED_MARKETING_CONSENT: MarketingConsent = {
  state: "unanswered",
};

export function isMarketingConsentAnswered(c: MarketingConsent): boolean {
  return c.state !== "unanswered";
}

export function recordMarketingChoice(
  optIn: boolean,
  now: number = Date.now(),
): MarketingConsent {
  return optIn
    ? { state: "opted-in", recordedAt: now }
    : { state: "opted-out", recordedAt: now };
}

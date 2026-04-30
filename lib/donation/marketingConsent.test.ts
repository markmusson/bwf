import { describe, expect, it } from "vitest";
import {
  isMarketingConsentAnswered,
  recordMarketingChoice,
  UNANSWERED_MARKETING_CONSENT,
} from "./marketingConsent";

describe("marketing consent", () => {
  it("starts as unanswered (PECR forbids pre-ticked defaults)", () => {
    expect(UNANSWERED_MARKETING_CONSENT.state).toBe("unanswered");
    expect(isMarketingConsentAnswered(UNANSWERED_MARKETING_CONSENT)).toBe(
      false,
    );
  });

  it("records an opt-in with a timestamp", () => {
    const recorded = recordMarketingChoice(true, 1714500000000);
    expect(recorded).toEqual({
      state: "opted-in",
      recordedAt: 1714500000000,
    });
    expect(isMarketingConsentAnswered(recorded)).toBe(true);
  });

  it("records an opt-out with a timestamp", () => {
    const recorded = recordMarketingChoice(false, 1714500000000);
    expect(recorded).toEqual({
      state: "opted-out",
      recordedAt: 1714500000000,
    });
    expect(isMarketingConsentAnswered(recorded)).toBe(true);
  });

  it("defaults the timestamp to now() when one isn't supplied", () => {
    const before = Date.now();
    const recorded = recordMarketingChoice(true);
    const after = Date.now();
    if (recorded.state !== "opted-in") throw new Error("unreachable");
    expect(recorded.recordedAt).toBeGreaterThanOrEqual(before);
    expect(recorded.recordedAt).toBeLessThanOrEqual(after);
  });
});

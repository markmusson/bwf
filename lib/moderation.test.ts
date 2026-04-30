import { describe, expect, it } from "vitest";
import { moderateTribute } from "./moderation";

describe("moderateTribute", () => {
  it("approves a clean tribute", () => {
    const result = moderateTribute(
      "For Bob, who taught me to bowl. Miss you mate.",
    );
    expect(result.decision).toBe("approve");
    expect(result.score).toBe(0);
  });

  it("quarantines an obvious profanity", () => {
    const result = moderateTribute("This is fucking awful");
    expect(result.decision).toBe("quarantine");
    if (result.decision !== "quarantine") return;
    expect(result.reasons).toContain("profanity:f-word");
  });

  it("catches simple obfuscation with punctuation between letters", () => {
    const result = moderateTribute("f.u.c.k off");
    expect(result.decision).toBe("quarantine");
  });

  it("scores slurs higher than soft profanity", () => {
    // Picking the antisemitic-pattern slur which has zero overlap with
    // common English so the test stays clean to read.
    const slur = moderateTribute("kikkkie this");
    const swear = moderateTribute("shit happens");
    expect(slur.decision).toBe("quarantine");
    expect(swear.decision).toBe("quarantine");
    if (slur.decision !== "quarantine" || swear.decision !== "quarantine") {
      return;
    }
    expect(slur.score).toBeGreaterThan(swear.score);
  });

  it("flags URLs as spam", () => {
    const result = moderateTribute("Donate at http://example.com please");
    expect(result.decision).toBe("quarantine");
    if (result.decision !== "quarantine") return;
    expect(result.reasons).toContain("spam:url");
  });

  it("flags email addresses as spam", () => {
    const result = moderateTribute("contact me at bob@example.com");
    expect(result.decision).toBe("quarantine");
    if (result.decision !== "quarantine") return;
    expect(result.reasons).toContain("spam:email");
  });

  it("flags all-caps shouting longer than 11 chars but lets short caps through", () => {
    const longShout = moderateTribute("BLUE FOR BOB FOREVER");
    expect(longShout.decision).toBe("quarantine");
    const shortCaps = moderateTribute("BWF rocks");
    expect(shortCaps.decision).toBe("approve");
  });

  it("flags empty input as quarantine (caller normally enforces this earlier)", () => {
    const result = moderateTribute("   ");
    expect(result.decision).toBe("quarantine");
    if (result.decision !== "quarantine") return;
    expect(result.reasons).toContain("empty");
  });

  it("flags text over 280 chars", () => {
    const result = moderateTribute("x".repeat(281));
    expect(result.decision).toBe("quarantine");
    if (result.decision !== "quarantine") return;
    expect(result.reasons).toContain("too-long");
  });
});

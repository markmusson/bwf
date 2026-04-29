import { describe, expect, it } from "vitest";
import { formatGbpPence } from "./money";

describe("formatGbpPence", () => {
  it("formats a £10 minimum donation", () => {
    expect(formatGbpPence(1000)).toBe("£10.00");
  });

  it("formats sub-pound values", () => {
    expect(formatGbpPence(50)).toBe("£0.50");
  });

  it("formats four-figure amounts with thousands separator", () => {
    expect(formatGbpPence(123_456)).toBe("£1,234.56");
  });

  it("formats zero", () => {
    expect(formatGbpPence(0)).toBe("£0.00");
  });

  it("rejects non-integers", () => {
    expect(() => formatGbpPence(10.5)).toThrow(TypeError);
  });

  it("rejects NaN", () => {
    expect(() => formatGbpPence(Number.NaN)).toThrow(TypeError);
  });
});

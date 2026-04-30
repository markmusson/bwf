import { describe, expect, it } from "vitest";
import { computeCountdown } from "./countdown";

const TARGET = Date.UTC(2026, 6, 14, 10, 0, 0); // 14 Jul 2026, 10:00 UTC

describe("computeCountdown", () => {
  it("breaks down a multi-day remaining duration", () => {
    const now =
      TARGET -
      (3 * 24 * 60 * 60 * 1000 +
        4 * 60 * 60 * 1000 +
        17 * 60 * 1000 +
        42 * 1000);
    expect(computeCountdown(TARGET, now)).toEqual({
      days: 3,
      hours: 4,
      minutes: 17,
      seconds: 42,
      reached: false,
    });
  });

  it("zeroes everything when the target has passed", () => {
    expect(computeCountdown(TARGET, TARGET + 1)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      reached: true,
    });
  });

  it("treats exactly-now as reached", () => {
    expect(computeCountdown(TARGET, TARGET)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      reached: true,
    });
  });
});

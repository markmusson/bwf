import { describe, expect, it } from "vitest";
import {
  MIN_DONATION_PENCE,
  poundsToPence,
  SUGGESTED_AMOUNTS_PENCE,
  validateAmountPence,
} from "./amount";

describe("validateAmountPence", () => {
  it("accepts the £10 minimum", () => {
    expect(validateAmountPence(MIN_DONATION_PENCE)).toEqual({ ok: true });
  });

  it("accepts each suggested tile amount", () => {
    for (const amount of SUGGESTED_AMOUNTS_PENCE) {
      expect(validateAmountPence(amount)).toEqual({ ok: true });
    }
  });

  it("rejects below-minimum amounts with reason 'below_minimum'", () => {
    expect(validateAmountPence(999)).toEqual({
      ok: false,
      reason: "below_minimum",
    });
    expect(validateAmountPence(0)).toEqual({
      ok: false,
      reason: "below_minimum",
    });
  });

  it("rejects non-integer values", () => {
    expect(validateAmountPence(10.5)).toEqual({
      ok: false,
      reason: "not_integer",
    });
    expect(validateAmountPence(Number.NaN)).toEqual({
      ok: false,
      reason: "not_integer",
    });
  });
});

describe("poundsToPence", () => {
  it("converts whole pounds to pence", () => {
    expect(poundsToPence(10)).toBe(1000);
    expect(poundsToPence(25)).toBe(2500);
  });

  it("rounds half-pence to the nearest pence", () => {
    expect(poundsToPence(10.555)).toBe(1056);
    expect(poundsToPence(10.554)).toBe(1055);
  });

  it("returns NaN for non-finite input", () => {
    expect(poundsToPence(Number.POSITIVE_INFINITY)).toBeNaN();
  });
});

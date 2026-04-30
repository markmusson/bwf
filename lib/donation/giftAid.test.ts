import { describe, expect, it } from "vitest";
import {
  calculateGiftAidUpliftPence,
  isGiftAidValid,
  type GiftAidConfirmations,
} from "./giftAid";

describe("calculateGiftAidUpliftPence", () => {
  it("returns 25% on the £10 floor (250p)", () => {
    expect(calculateGiftAidUpliftPence(1000)).toBe(250);
  });

  it("returns 25% on £100 (£25 uplift)", () => {
    expect(calculateGiftAidUpliftPence(10_000)).toBe(2500);
  });

  it("rounds down on amounts that don't divide cleanly", () => {
    expect(calculateGiftAidUpliftPence(1003)).toBe(250); // 250.75 → 250
  });

  it("returns 0 for a £0 donation", () => {
    expect(calculateGiftAidUpliftPence(0)).toBe(0);
  });

  it("rejects non-integer pence values", () => {
    expect(() => calculateGiftAidUpliftPence(10.5)).toThrow(TypeError);
  });

  it("rejects negative amounts", () => {
    expect(() => calculateGiftAidUpliftPence(-1)).toThrow(TypeError);
  });
});

describe("isGiftAidValid", () => {
  const allTrue: GiftAidConfirmations = {
    ukTaxpayer: true,
    ownMoney: true,
    noBenefit: true,
  };

  it("returns true only when all three confirmations are ticked", () => {
    expect(isGiftAidValid(allTrue)).toBe(true);
  });

  it("returns false if any confirmation is missing", () => {
    expect(isGiftAidValid({ ...allTrue, ukTaxpayer: false })).toBe(false);
    expect(isGiftAidValid({ ...allTrue, ownMoney: false })).toBe(false);
    expect(isGiftAidValid({ ...allTrue, noBenefit: false })).toBe(false);
  });
});

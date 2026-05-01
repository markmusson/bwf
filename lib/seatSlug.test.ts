import { describe, expect, it } from "vitest";
import { formatSeatSlug, parseSeatSlug } from "./seatSlug";

describe("parseSeatSlug", () => {
  it("parses a valid slug into 0-indexed row/num", () => {
    expect(parseSeatSlug("hollies-3-12")).toEqual({
      stand: "hollies",
      row: 2,
      num: 11,
    });
  });

  it("returns null for an unknown stand id", () => {
    expect(parseSeatSlug("nope-1-1")).toBeNull();
  });

  it("returns null for non-numeric row or num", () => {
    expect(parseSeatSlug("hollies-a-1")).toBeNull();
    expect(parseSeatSlug("hollies-1-b")).toBeNull();
  });

  it("returns null for zero or negative row/num (1-indexed)", () => {
    expect(parseSeatSlug("hollies-0-1")).toBeNull();
    expect(parseSeatSlug("hollies-1-0")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseSeatSlug("")).toBeNull();
    expect(parseSeatSlug("hollies")).toBeNull();
    expect(parseSeatSlug("hollies-1")).toBeNull();
    expect(parseSeatSlug("24")).toBeNull();
  });
});

describe("formatSeatSlug", () => {
  it("rebuilds a slug from the 0-indexed coord", () => {
    expect(formatSeatSlug({ stand: "wyatt", row: 0, num: 4 })).toBe(
      "wyatt-1-5",
    );
  });

  it("round-trips with parseSeatSlug", () => {
    const slug = "hollies-3-12";
    const parsed = parseSeatSlug(slug);
    expect(parsed).not.toBeNull();
    expect(formatSeatSlug(parsed!)).toBe(slug);
  });
});

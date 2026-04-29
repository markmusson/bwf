import { describe, expect, it } from "vitest";
import { arcSpan, vToRad } from "./geometry";

describe("vToRad", () => {
  it("converts visual 0° (north) to -π/2", () => {
    expect(vToRad(0)).toBeCloseTo(-Math.PI / 2);
  });

  it("converts visual 90° (east) to 0", () => {
    expect(vToRad(90)).toBeCloseTo(0);
  });

  it("converts visual 180° (south) to π/2", () => {
    expect(vToRad(180)).toBeCloseTo(Math.PI / 2);
  });

  it("converts visual 270° (west) to π", () => {
    expect(vToRad(270)).toBeCloseTo(Math.PI);
  });

  it("converts visual 360° back to 3π/2 (= -π/2 mod 2π)", () => {
    expect(vToRad(360)).toBeCloseTo((3 * Math.PI) / 2);
  });
});

describe("arcSpan", () => {
  it("returns the radian span of a non-wrapping arc", () => {
    expect(arcSpan(47, 90)).toBeCloseTo((43 * Math.PI) / 180);
    expect(arcSpan(212, 298)).toBeCloseTo((86 * Math.PI) / 180);
    expect(arcSpan(148, 212)).toBeCloseTo((64 * Math.PI) / 180);
  });

  it("wraps an arc that crosses 0° (e.g. Hollies stand 313°→47°)", () => {
    expect(arcSpan(313, 47)).toBeCloseTo((94 * Math.PI) / 180);
    expect(arcSpan(298, 313)).toBeCloseTo((15 * Math.PI) / 180);
  });

  it("treats vEnd === vStart as a full 360° arc, not a zero arc", () => {
    expect(arcSpan(90, 90)).toBeCloseTo(2 * Math.PI);
  });
});

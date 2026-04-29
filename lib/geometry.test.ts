import { describe, expect, it } from "vitest";
import { vToRad } from "./geometry";

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

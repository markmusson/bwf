import { describe, expect, it } from "vitest";
import { STANDS } from "./stands";

describe("STANDS", () => {
  it("has six stands", () => {
    expect(STANDS).toHaveLength(6);
  });

  it("uses unique stand ids", () => {
    const ids = STANDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only valid tiers", () => {
    const allowed = new Set(["premium", "standard", "general"]);
    for (const s of STANDS) {
      expect(allowed.has(s.tier)).toBe(true);
    }
  });

  it("has innerR > 0 and rows > 0 for every stand", () => {
    for (const s of STANDS) {
      expect(s.innerR).toBeGreaterThan(0);
      expect(s.rows).toBeGreaterThan(0);
    }
  });

  it("forms a continuous ring — each stand's vEnd equals the next's vStart", () => {
    for (let i = 0; i < STANDS.length; i++) {
      const current = STANDS[i]!;
      const next = STANDS[(i + 1) % STANDS.length]!;
      expect(current.vEnd).toBe(next.vStart);
    }
  });
});

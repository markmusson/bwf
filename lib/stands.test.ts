import { describe, expect, it } from "vitest";
import { STANDS } from "./stands";

describe("STANDS", () => {
  it("has the six post-redevelopment Edgbaston stands (clockwise from Pavilion)", () => {
    // The 2025 redevelopment replaced Priory and Raglan with a hotel
    // build; their arcs are absorbed into West and Wyatt so the ring
    // stays continuous.
    expect(STANDS).toHaveLength(6);
    expect(STANDS.map((s) => s.id)).toEqual([
      "south",
      "west",
      "wyatt",
      "scrivens",
      "stanley",
      "hollies",
    ]);
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

  it("forms a continuous ring — each stand's vEnd equals the next's vStart (mod 360)", () => {
    for (let i = 0; i < STANDS.length; i++) {
      const current = STANDS[i]!;
      const next = STANDS[(i + 1) % STANDS.length]!;
      expect(current.vEnd % 360).toBe(next.vStart % 360);
    }
  });
});

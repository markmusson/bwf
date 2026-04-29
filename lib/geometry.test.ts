import { describe, expect, it } from "vitest";
import {
  arcSpan,
  buildAllSeats,
  buildStandSeats,
  CENTER_X,
  CENTER_Y,
  vToRad,
  type Stand,
} from "./geometry";
import { STANDS } from "./stands";

const HOLLIES: Stand = {
  id: "hollies",
  name: "Eric Hollies Stand",
  sub: "The Famous Stand",
  tier: "standard",
  vStart: 313,
  vEnd: 47,
  innerR: 133,
  rows: 13,
};

const SINGLE_SEAT_STAND: Stand = {
  id: "tiny",
  name: "Tiny Stand",
  sub: "",
  tier: "general",
  vStart: 0,
  vEnd: 1,
  innerR: 1,
  rows: 1,
};

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

describe("buildStandSeats", () => {
  it("emits seats with the canonical id format standId_R_row_col", () => {
    const seats = buildStandSeats(HOLLIES);
    for (const seat of seats) {
      expect(seat.id).toBe(
        `${seat.standId}_R_${seat.rowIndex}_${seat.colIndex}`,
      );
      expect(seat.standId).toBe("hollies");
    }
  });

  it("places the first inner row of Hollies as 24 seats (r=133, 94° span)", () => {
    const seats = buildStandSeats(HOLLIES);
    const innerRow = seats.filter((s) => s.rowIndex === 0);
    expect(innerRow).toHaveLength(24);
  });

  it("uses successive col indices [0..n-1] within each row", () => {
    const seats = buildStandSeats(HOLLIES);
    const row0 = seats
      .filter((s) => s.rowIndex === 0)
      .map((s) => s.colIndex)
      .sort((a, b) => a - b);
    expect(row0).toEqual([...row0.keys()]);
  });

  it("sets every seat's tier and basePricePence to the v1 £10 floor", () => {
    const seats = buildStandSeats(HOLLIES);
    for (const seat of seats) {
      expect(seat.tier).toBe("standard");
      expect(seat.basePricePence).toBe(1000);
    }
  });

  it("positions every seat at the row's radius from the stadium centre", () => {
    const seats = buildStandSeats(HOLLIES);
    for (const seat of seats) {
      const dx = seat.x - CENTER_X;
      const dy = seat.y - CENTER_Y;
      const radius = Math.hypot(dx, dy);
      const expected = HOLLIES.innerR + seat.rowIndex * 10;
      expect(radius).toBeCloseTo(expected);
    }
  });

  it("places a single-seat row at the midpoint of the usable arc", () => {
    const seats = buildStandSeats(SINGLE_SEAT_STAND);
    expect(seats).toHaveLength(1);
    const [seat] = seats;
    const midAngle = vToRad(0.5);
    expect(seat!.x).toBeCloseTo(CENTER_X + 1 * Math.cos(midAngle));
    expect(seat!.y).toBeCloseTo(CENTER_Y + 1 * Math.sin(midAngle));
  });
});

describe("buildAllSeats", () => {
  it("emits seats for every stand", () => {
    const seats = buildAllSeats(STANDS);
    for (const stand of STANDS) {
      const standSeats = seats.filter((s) => s.standId === stand.id);
      expect(standSeats.length).toBeGreaterThan(0);
    }
  });

  it("emits between 1200 and 1400 seats with the mock geometry", () => {
    // PRD §7 estimated ~3500. The mock's geometry (SEAT_SPACING=9,
    // ROW_SPACING=10, the six-stand layout) actually yields ~1280. Flagged
    // for product decision in BWF-1ew.10 — ramifications for the £20k
    // target at the £10 floor (need ≥2000 donors to hit it on minimums
    // alone).
    const seats = buildAllSeats(STANDS);
    expect(seats.length).toBeGreaterThanOrEqual(1200);
    expect(seats.length).toBeLessThanOrEqual(1400);
  });

  it("emits globally unique seat ids", () => {
    const seats = buildAllSeats(STANDS);
    const ids = seats.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is deterministic — repeated calls produce identical seat ids", () => {
    const a = buildAllSeats(STANDS).map((s) => s.id);
    const b = buildAllSeats(STANDS).map((s) => s.id);
    expect(a).toEqual(b);
  });
});

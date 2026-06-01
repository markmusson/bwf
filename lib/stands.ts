import type { Stand } from "./geometry";

// Edgbaston layout (2025 redevelopment), clockwise from the south.
//
// Sources: Adam's reference + edgbaston.com 2025 stadium map.
// Compass orientation has north (City End) up and the Pavilion at
// the south. The 2025 redevelopment replaced the old Priory and
// Raglan stands on the north-west with a hotel build; their arc is
// now absorbed by Wyatt and West so the perimeter remains seated
// all the way round rather than leaving a dead gap on the canvas.
//
// All stands are £10 minimum (donor can bump). Row counts are tuned
// to real-world capacity ratios — Hollies is the giant, Stanley
// Barnes the boutique scoreboard stand. Total virtual capacity
// lands around 1,300 seats.
//
// vToRad maps v=0 to north (top), increasing clockwise.
export const STANDS: readonly Stand[] = [
  // Pavilion (South Stand) — south of the canvas, on the wicket.
  {
    id: "south",
    name: "Pavilion (South Stand)",
    sub: "Pavilion End",
    tier: "premium",
    vStart: 160,
    vEnd: 210,
    innerR: 133,
    rows: 10,
    pricePence: 1_000,
  },
  // West Stand — west side, Family Friendly. Wider in the 2025
  // layout than the old map because the Priory slot has been
  // absorbed into West's arc.
  {
    id: "west",
    name: "West Stand",
    sub: "Family Friendly",
    tier: "standard",
    vStart: 210,
    vEnd: 305,
    innerR: 133,
    rows: 10,
    pricePence: 1_000,
  },
  // R.E.S. Wyatt Stand — City End (north). Spans the top of the
  // canvas. The old Raglan arc folds in here so the north stand
  // is wider than the original map suggested.
  {
    id: "wyatt",
    name: "R.E.S. Wyatt Stand",
    sub: "City End",
    tier: "standard",
    vStart: 305,
    vEnd: 405, // wraps past 360
    innerR: 133,
    rows: 12,
    pricePence: 1_000,
  },
  // Scrivens Stand — north-east of the City End. Alcohol-free zone
  // on the 2025 Edgbaston map.
  {
    id: "scrivens",
    name: "Scrivens Stand",
    sub: "Alcohol Free",
    tier: "standard",
    vStart: 45,
    vEnd: 75,
    innerR: 133,
    rows: 8,
    pricePence: 1_000,
  },
  // Stanley Barnes Stand — small east-side stand in front of the
  // scoreboard.
  {
    id: "stanley",
    name: "Stanley Barnes Stand",
    sub: "Scoreboard",
    tier: "standard",
    vStart: 75,
    vEnd: 95,
    innerR: 131,
    rows: 6,
    pricePence: 1_000,
  },
  // Eric Hollies Stand — east / south-east. The famous one. Wide
  // arc and the deepest row count so it dominates the stadium
  // visually the way it does in real life.
  {
    id: "hollies",
    name: "Eric Hollies Stand",
    sub: "The Famous Stand",
    tier: "standard",
    vStart: 95,
    vEnd: 160,
    innerR: 133,
    rows: 14,
    pricePence: 1_000,
  },
];

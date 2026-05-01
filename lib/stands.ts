import type { Stand } from "./geometry";

// Edgbaston layout, clockwise around the pitch.
//
// Sources: Wikipedia (Edgbaston Cricket Ground) and the official
// edgbaston.com layout. Compass orientation has north (City End) up
// and the Pavilion at the south. Hollies sits on the east side
// behind the River Rea, opposite the Raglan / West side.
//
// Tier prices are the seat MINIMUM (donor can bump upwards):
//   £50 premium  – South / Pavilion (best view, on the wicket)
//   £25 standard – Hollies, Wyatt (City End), Raglan, West, Stanley
//   £10 general  – Priory / Drayton Manor Family Stand
//
// vToRad maps v=0 to north (top), increasing clockwise.
export const STANDS: readonly Stand[] = [
  // South — Pavilion End. Bottom of the canvas. Wide arc, premium.
  {
    id: "south",
    name: "Pavilion (South Stand)",
    sub: "Pavilion End",
    tier: "premium",
    vStart: 148,
    vEnd: 212,
    innerR: 133,
    rows: 10,
    pricePence: 5_000,
  },
  // West Stand — large two-tier west side, between Pavilion and Priory.
  {
    id: "west",
    name: "West Stand",
    sub: "",
    tier: "standard",
    vStart: 212,
    vEnd: 265,
    innerR: 133,
    rows: 11,
    pricePence: 2_500,
  },
  // Priory / Drayton Manor Family Stand — small, between West and Raglan.
  {
    id: "priory",
    name: "Priory Stand",
    sub: "Drayton Manor Family",
    tier: "general",
    vStart: 265,
    vEnd: 290,
    innerR: 131,
    rows: 5,
    pricePence: 1_000,
  },
  // Raglan Stand — north-west, parallel to the wicket, opposite Hollies.
  {
    id: "raglan",
    name: "Raglan Stand",
    sub: "",
    tier: "standard",
    vStart: 290,
    vEnd: 330,
    innerR: 132,
    rows: 8,
    pricePence: 2_500,
  },
  // R.E.S. Wyatt Stand — City End (north). vStart wraps past 360.
  {
    id: "wyatt",
    name: "R.E.S. Wyatt Stand",
    sub: "City End",
    tier: "general",
    vStart: 330,
    vEnd: 405,
    innerR: 133,
    rows: 8,
    pricePence: 1_000,
  },
  // Stanley Barnes — small north-east stand in front of the scoreboard.
  {
    id: "stanley",
    name: "Stanley Barnes Stand",
    sub: "Scoreboard",
    tier: "standard",
    vStart: 45,
    vEnd: 70,
    innerR: 131,
    rows: 6,
    pricePence: 2_500,
  },
  // Eric Hollies Stand — east side behind the River Rea. The biggest,
  // most atmospheric stand at Edgbaston. Wide arc, bumped row count.
  {
    id: "hollies",
    name: "Eric Hollies Stand",
    sub: "The Famous Stand",
    tier: "standard",
    vStart: 70,
    vEnd: 148,
    innerR: 133,
    rows: 13,
    pricePence: 2_500,
  },
];

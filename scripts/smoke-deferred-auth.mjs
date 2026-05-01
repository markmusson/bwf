// Real-data end-to-end smoke against the live (deployed) Convex backend.
// No mocks. Drives the deferred-auth flow: claim with clientHoldId,
// verify ownership, release. No Stripe roundtrip — that's manual.

// Run with:  node --env-file=.env.local scripts/smoke-deferred-auth.mjs
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
  console.error("NEXT_PUBLIC_CONVEX_URL missing — set it in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(url);
const clientHoldId = `smoke-${Date.now()}-${Math.random().toString(16).slice(2)}`;

console.log("== BWF deferred-auth smoke ==");
console.log("Convex URL:    ", url);
console.log("clientHoldId:  ", clientHoldId);

const seats = await client.query(api.seats.list, {});
const free = seats.find((s) => s.status === "available");
if (!free) {
  console.error("no available seats — run convex seedSeats first");
  process.exit(1);
}
const slug = `${free.stand}-${free.row + 1}-${free.num + 1}`;
console.log(`\n[1] picked free seat: ${slug} (${free._id})`);

const holdId = await client.mutation(api.holds.claim, {
  seatId: free._id,
  clientHoldId,
});
console.log(`[2] claim ok — holdId: ${holdId}`);

const mine = await client.query(api.holds.getMine, { clientHoldId });
const stranger = await client.query(api.holds.getMine, {
  clientHoldId: "client-zzzzzzzzzzzz",
});
const ok1 = mine?.seatId === free._id;
const ok2 = stranger === null;
console.log(`[3] getMine(ours).seatId === claimed: ${ok1}`);
console.log(`    getMine(stranger) === null:        ${ok2}`);
if (!ok1 || !ok2) {
  console.error("FAIL: ownership leak detected");
  process.exit(1);
}

const activeIds = await client.query(api.holds.activeSeatIds, {});
const ok3 = activeIds.includes(free._id);
console.log(`[4] activeSeatIds includes ours:       ${ok3}`);

await client.mutation(api.holds.release, { holdId, clientHoldId });
console.log("[5] release ok");

const after = await client.query(api.holds.getMine, { clientHoldId });
const ok4 = after === null;
console.log(`[6] getMine after release === null:    ${ok4}`);
if (!ok4) {
  console.error("FAIL: hold not released");
  process.exit(1);
}

const card = await client.query(api.seats.getCardBySlug, { slug });
const ok5 = card?.seat.stand === free.stand;
console.log(`[7] getCardBySlug round-trip:          ${ok5}`);
if (!ok5) {
  console.error("FAIL: slug round-trip");
  process.exit(1);
}

console.log("\n✓ deferred-auth flow verified end-to-end against live Convex.");

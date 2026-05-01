import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) { console.error("NEXT_PUBLIC_CONVEX_URL missing"); process.exit(1); }
const client = new ConvexHttpClient(url);

console.log("== BWF data snapshot ==");
console.log("Convex URL:", url);

const [seats, stats, standCounts] = await Promise.all([
  client.query(api.seats.list, {}),
  client.query(api.donations.aggregateStats, {}),
  client.query(api.seats.standCounts, {}),
]);

console.log("\n[seats]");
console.log("  total seats in DB:", seats.length);
const stands = new Map();
for (const s of seats) {
  const v = stands.get(s.stand) ?? { total: 0, taken: 0, count: 0 };
  v.total++;
  if (s.status === "taken") v.taken++;
  v.count += s.claimedCount ?? 0;
  stands.set(s.stand, v);
}
for (const [id, v] of stands) {
  console.log(`  ${id.padEnd(10)} total=${v.total}  taken=${v.taken}  donors=${v.count}`);
}
const orphans = seats.filter((s) => !["south","west","priory","raglan","wyatt","stanley","hollies"].includes(s.stand));
console.log("  orphan stand ids (not in current STANDS):", orphans.length);
if (orphans.length > 0) {
  const orphanIds = new Set(orphans.map(o => o.stand));
  console.log("    -", [...orphanIds].join(", "));
}

console.log("\n[aggregateStats]");
console.log("  raisedPence:", stats.raisedPence, `(£${(stats.raisedPence/100).toFixed(2)})`);
console.log("  seatsBlue: ", stats.seatsBlue);
console.log("  supporters:", stats.supporters);
console.log("  totalSeats:", stats.totalSeats);

console.log("\n[standCounts (queryable surface)]");
for (const [id, v] of Object.entries(standCounts)) {
  console.log(`  ${id.padEnd(10)} taken=${v.taken}/${v.total}`);
}

console.log("\n[wall groups (approved tributes)]");
const wall = await client.query(api.tributes.listApproved, {});
console.log("  seat groups with at-least-one approved tribute:", wall.length);
for (const g of wall.slice(0, 5)) {
  console.log(`  - ${g.seat.slug}  donors=${g.donors}  tributes=${g.tributes.length}`);
}

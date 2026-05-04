import { v } from "convex/values";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { buildAllSeats } from "../lib/geometry";
import { parseSeatSlug } from "../lib/seatSlug";
import { STANDS } from "../lib/stands";

// Public read for the stadium canvas. Convex keeps this reactive — no
// polling needed. Bounded by the count of seeded seats (~1280) plus
// safety headroom.
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("seats").take(2000);
  },
});

// Idempotent seed. Reads existing seats once, builds a key set on
// (stand, row, num), then inserts only the missing ones. Safe to run
// multiple times; second invocation does nothing if seats are already
// in place. Bumping STANDS rows or geometry constants will produce new
// rows on the next run; pruning would need its own action.
export const seedSeats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("seats").take(2000);
    const existingKeys = new Set(
      existing.map((s) => `${s.stand}:${s.row}:${s.num}`),
    );

    const seats = buildAllSeats(STANDS);
    let inserted = 0;

    for (const seat of seats) {
      const key = `${seat.standId}:${seat.rowIndex}:${seat.colIndex}`;
      if (existingKeys.has(key)) continue;

      await ctx.db.insert("seats", {
        stand: seat.standId,
        row: seat.rowIndex,
        num: seat.colIndex,
        status: "available",
      });
      inserted += 1;
    }

    return {
      inserted,
      skipped: seats.length - inserted,
      total: seats.length,
    };
  },
});

// Wipe seats + holds and re-insert the geometry from scratch. Run when
// STANDS changes shape so the canvas geometry and the DB rows agree on
// every (stand, row, num). DESTRUCTIVE: existing donations.seatId
// references are orphaned and any held seats are released. Use:
//   npx convex run seats:reseedAll
export const reseedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deletedSeats = 0;
    let deletedHolds = 0;
    for (const hold of await ctx.db.query("holds").take(5000)) {
      await ctx.db.delete(hold._id);
      deletedHolds += 1;
    }
    for (const seat of await ctx.db.query("seats").take(5000)) {
      await ctx.db.delete(seat._id);
      deletedSeats += 1;
    }
    const seats = buildAllSeats(STANDS);
    for (const seat of seats) {
      await ctx.db.insert("seats", {
        stand: seat.standId,
        row: seat.rowIndex,
        num: seat.colIndex,
        status: "available",
      });
    }
    return {
      deletedSeats,
      deletedHolds,
      inserted: seats.length,
    };
  },
});

// Admin-callable counter so we can verify the seed without dumping rows.
export const count = query({
  args: {
    status: v.optional(v.union(v.literal("available"), v.literal("taken"))),
  },
  handler: async (ctx, { status }) => {
    if (status === undefined) {
      const rows = await ctx.db.query("seats").take(2000);
      return rows.length;
    }
    const rows = await ctx.db
      .query("seats")
      .withIndex("by_status", (q) => q.eq("status", status))
      .take(2000);
    return rows.length;
  },
});

// Internal: look up a seat's minimum donation (in pence) for the
// stripe action's pre-checkout validation. Returns null if the seat
// doesn't exist; the caller treats that as a hard error.
export const getMinimumPenceForSeat = query({
  args: { seatId: v.id("seats") },
  handler: async (ctx, { seatId }) => {
    const seat = await ctx.db.get(seatId);
    if (!seat) return null;
    const stand = STANDS.find((s) => s.id === seat.stand);
    return stand?.pricePence ?? 1000;
  },
});

// Public read for /seat/<slug> share cards. Returns the seat plus
// EVERY approved tribute attached to its paid donations, newest first,
// each annotated with display name and amount unless the donor opted
// out via hideName / hideAmount. Empty-tribute donations contribute to
// the donor count + raisedPence but don't surface as cards.
async function buildSeatCard(ctx: QueryCtx, seat: Doc<"seats">) {
  const seatPublic = {
    stand: seat.stand,
    row: seat.row,
    num: seat.num,
    status: seat.status,
    slug: `${seat.stand}-${seat.row + 1}-${seat.num + 1}`,
    // Single-claim: a taken seat has exactly 1 donor; available is 0.
    donors: seat.status === "taken" ? 1 : 0,
  };

  // Pull every paid donation attached to this seat, then attach
  // approved tributes inline.
  const donations = await ctx.db
    .query("donations")
    .filter((q) => q.eq(q.field("seatId"), seat._id))
    .collect();
  const paid = donations.filter((d) => d.status === "paid");

  let raisedPence = 0;
  const tributes: Array<{
    tributeId: string;
    text: string;
    createdAt: number;
    displayName: string | null;
    amountPence: number | null;
    giftAid: boolean;
  }> = [];

  for (const donation of paid) {
    raisedPence += donation.amountPence;
    const tribute = await ctx.db
      .query("tributes")
      .filter((q) => q.eq(q.field("donationId"), donation._id))
      .first();
    if (tribute && tribute.status === "approved") {
      tributes.push({
        tributeId: tribute._id,
        text: tribute.text,
        createdAt: tribute._creationTime,
        displayName: donation.hideName ? null : (donation.displayName ?? null),
        amountPence: donation.hideAmount ? null : donation.amountPence,
        giftAid: donation.giftAid,
      });
    }
  }

  tributes.sort((a, b) => b.createdAt - a.createdAt);

  return {
    seat: seatPublic,
    donors: paid.length,
    raisedPence,
    tributes,
  };
}

export const getCard = query({
  args: { seatId: v.id("seats") },
  handler: async (ctx, { seatId }) => {
    const seat = await ctx.db.get(seatId);
    if (!seat) return null;
    return await buildSeatCard(ctx, seat);
  },
});

// Slug form for /seat/<stand>-<row>-<num>. Slug is 1-indexed for
// humans; lib/seatSlug parses it. Invalid slugs and unknown coords
// return null so the page renders the not-found state.
export const getCardBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const coord = parseSeatSlug(slug);
    if (!coord) return null;
    const seat = await ctx.db
      .query("seats")
      .withIndex("by_coord", (q) =>
        q.eq("stand", coord.stand).eq("row", coord.row).eq("num", coord.num),
      )
      .first();
    if (!seat) return null;
    return await buildSeatCard(ctx, seat);
  },
});

// Per-stand totals + taken counts for the legend tile row.
export const standCounts = query({
  args: {},
  handler: async (ctx) => {
    const seats = await ctx.db.query("seats").take(2000);
    const counts: Record<string, { taken: number; total: number }> = {};
    for (const seat of seats) {
      const entry = counts[seat.stand] ?? { taken: 0, total: 0 };
      entry.total += 1;
      if (seat.status === "taken") entry.taken += 1;
      counts[seat.stand] = entry;
    }
    return counts;
  },
});

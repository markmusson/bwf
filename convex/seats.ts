import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { buildAllSeats } from "../lib/geometry";
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

// Public read for /seat/[id] share cards. Returns a deliberately
// narrow shape — the donor's display name, amount, and Gift Aid flag
// are exposed only when the donor has not opted out via hideName /
// hideAmount, and tributes are only returned once moderation has
// approved them. Pending donations (paid via webhook race) and
// non-existent seats both return safely.
export const getCard = query({
  args: { seatId: v.id("seats") },
  handler: async (ctx, { seatId }) => {
    const seat = await ctx.db.get(seatId);
    if (!seat) return null;

    const seatPublic = {
      stand: seat.stand,
      row: seat.row,
      num: seat.num,
      status: seat.status,
    };

    if (!seat.donationId) {
      return { seat: seatPublic, donation: null, tribute: null };
    }

    const donation = await ctx.db.get(seat.donationId);
    if (!donation || donation.status !== "paid") {
      return { seat: seatPublic, donation: null, tribute: null };
    }

    const donationPublic = {
      displayName: donation.hideName ? null : (donation.displayName ?? null),
      amountPence: donation.hideAmount ? null : donation.amountPence,
      giftAid: donation.giftAid,
    };

    const tribute = await ctx.db
      .query("tributes")
      .filter((q) => q.eq(q.field("donationId"), donation._id))
      .first();

    const tributePublic =
      tribute && tribute.status === "approved" ? { text: tribute.text } : null;

    return {
      seat: seatPublic,
      donation: donationPublic,
      tribute: tributePublic,
    };
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

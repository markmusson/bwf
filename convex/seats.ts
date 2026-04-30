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

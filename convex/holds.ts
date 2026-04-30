import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";

const HOLD_TTL_MS = 10 * 60 * 1000;

// Public: take a seat for 10 minutes. Per 07 §7, exactly one of two
// concurrent claims for the same seat wins; the other gets seat_held.
export const claim = mutation({
  args: { seatId: v.id("seats") },
  handler: async (ctx, { seatId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");

    const seat = await ctx.db.get(seatId);
    if (!seat || seat.status !== "available") {
      throw new ConvexError("seat_unavailable");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("holds")
      .withIndex("by_seat", (q) => q.eq("seatId", seatId))
      .first();

    if (existing) {
      if (existing.expiresAt > now && existing.userId !== userId) {
        throw new ConvexError("seat_held");
      }
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("holds", {
      seatId,
      userId,
      expiresAt: now + HOLD_TTL_MS,
    });
  },
});

// Public: donor explicitly releases their hold (e.g. cancel button).
// Idempotent — releasing someone else's hold or a missing one throws.
export const release = mutation({
  args: { holdId: v.id("holds") },
  handler: async (ctx, { holdId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");

    const hold = await ctx.db.get(holdId);
    if (!hold) return null;
    if (hold.userId !== userId) throw new ConvexError("forbidden");

    await ctx.db.delete(holdId);
    return null;
  },
});

// Public: the wizard reads this on mount to recover the donor's active
// hold (e.g. after a magic-link round-trip).
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const hold = await ctx.db
      .query("holds")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!hold) return null;
    if (hold.expiresAt <= Date.now()) return null;
    return hold;
  },
});

// Internal: cron-driven sweep. The active-hold uniqueness is enforced
// at claim time, but expired rows pile up if we don't prune them.
export const expireHolds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("holds")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .take(500);

    for (const hold of expired) {
      await ctx.db.delete(hold._id);
    }
    return { deleted: expired.length };
  },
});

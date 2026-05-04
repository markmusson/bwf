import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { consumeRateLimit, RATE_LIMITS } from "./rateLimit";

const HOLD_TTL_MS = 10 * 60 * 1000;

interface ClaimArgs {
  seatId: Id<"seats">;
  clientHoldId: string;
}

// Serialisable seat-claim core. Keyed by clientHoldId so unauthenticated
// visitors can hold a seat while they fill in the donate modal. The
// concurrency guarantee ("exactly one of two simultaneous claims wins")
// still holds because Convex serialises mutation execution per-document.
export async function _claimSeatForTest(
  ctx: MutationCtx,
  args: ClaimArgs,
): Promise<Id<"holds">> {
  const seat = await ctx.db.get(args.seatId);
  // Single-claim: a taken seat is off the table. The hold mechanism
  // ALSO serialises in-flight payments so two donors clicking the
  // same available seat at the same time get exactly one winner —
  // see the concurrency test in holds.test.ts.
  if (!seat || seat.status !== "available") {
    throw new ConvexError("seat_unavailable");
  }

  const now = Date.now();
  const existing = await ctx.db
    .query("holds")
    .withIndex("by_seat", (q) => q.eq("seatId", args.seatId))
    .first();

  if (existing) {
    if (
      existing.expiresAt > now &&
      existing.clientHoldId !== args.clientHoldId
    ) {
      throw new ConvexError("seat_held");
    }
    await ctx.db.delete(existing._id);
  }

  return await ctx.db.insert("holds", {
    seatId: args.seatId,
    clientHoldId: args.clientHoldId,
    expiresAt: now + HOLD_TTL_MS,
  });
}

// Public: take a seat for 10 minutes. clientHoldId comes from the
// browser (a UUID stashed in localStorage). No auth required.
export const claim = mutation({
  args: {
    seatId: v.id("seats"),
    clientHoldId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.clientHoldId.length < 8) {
      throw new ConvexError("invalid_client_hold_id");
    }
    await consumeRateLimit(
      ctx,
      `holdClaim:${args.clientHoldId}`,
      RATE_LIMITS.holdClaim,
    );
    return await _claimSeatForTest(ctx, args);
  },
});

// Public: donor explicitly releases their hold. Idempotent — releasing
// a missing one is a no-op. Mismatched clientHoldId is rejected.
export const release = mutation({
  args: {
    holdId: v.id("holds"),
    clientHoldId: v.string(),
  },
  handler: async (ctx, { holdId, clientHoldId }) => {
    const hold = await ctx.db.get(holdId);
    if (!hold) return null;
    if (hold.clientHoldId !== clientHoldId) {
      throw new ConvexError("forbidden");
    }
    await ctx.db.delete(holdId);
    return null;
  },
});

// Public: the donate modal reads this on mount to recover the visitor's
// active hold (e.g. after a Stripe redirect or a page refresh). Keyed
// by the browser's clientHoldId, no auth required.
export const getMine = query({
  args: { clientHoldId: v.string() },
  handler: async (ctx, { clientHoldId }) => {
    if (clientHoldId.length < 8) return null;
    const hold = await ctx.db
      .query("holds")
      .withIndex("by_client", (q) => q.eq("clientHoldId", clientHoldId))
      .first();
    if (!hold) return null;
    if (hold.expiresAt <= Date.now()) return null;
    return hold;
  },
});

// Public reactive list of seat ids currently held (non-expired). The
// stadium canvas joins this client-side with seats.list so held seats
// show in their amber state without an extra round trip.
export const activeSeatIds = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const holds = await ctx.db
      .query("holds")
      .withIndex("by_expiry", (q) => q.gt("expiresAt", now))
      .take(2000);
    return holds.map((h) => h.seatId);
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

import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";

// Fixed-window counter. windowMs ago + capacity calls per key. Throws
// ConvexError("rate_limited") on exceedance. Re-resets the window on
// the first call after the window expires. Reads + writes one row.
//
// For v1 charity scale this is fine. If we outgrow it the @convex-dev/
// rate-limiter component is a drop-in upgrade — same call site.

export interface RateLimitOpts {
  capacity: number;
  windowMs: number;
}

export async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  opts: RateLimitOpts,
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!existing) {
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStartAt: now,
    });
    return;
  }

  if (now - existing.windowStartAt >= opts.windowMs) {
    await ctx.db.patch(existing._id, { count: 1, windowStartAt: now });
    return;
  }

  if (existing.count >= opts.capacity) {
    throw new ConvexError("rate_limited");
  }

  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

// Limits — central so it's clear what we throttle and why.
export const RATE_LIMITS = {
  // Donation draft creation — keyed by user. Once we cap at 10 per
  // minute the bot has to be patient AND authenticated.
  createDraft: { capacity: 10, windowMs: 60_000 },
  // Seat hold — keyed by user. They might bounce around, give them
  // headroom but cap.
  holdClaim: { capacity: 60, windowMs: 60_000 },
  // Tribute edits — keyed by donation. Anti-spam on the wall.
  tributeUpdate: { capacity: 10, windowMs: 60_000 },
  // Prize-draw opt-in — keyed by donation. Idempotent so repeats are
  // harmless, but no point letting a runaway client hammer.
  prizeOptIn: { capacity: 20, windowMs: 60_000 },
} as const;

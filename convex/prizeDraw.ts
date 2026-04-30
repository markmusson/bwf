import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

// Per 07 §10: prizeEntries are NEVER inserted from a donation flow.
// This mutation is the only path that adds a row to the table. Donor
// must (a) be authenticated, (b) own the donation, (c) the donation
// must be paid. Idempotent — re-clicking returns the existing entry id.

export interface OptInArgs {
  donationId: Id<"donations">;
  userId: Id<"users">;
}

export interface OptInResult {
  entryId: Id<"prizeEntries">;
  alreadyEntered: boolean;
}

export async function _optInForTest(
  ctx: MutationCtx,
  args: OptInArgs,
): Promise<OptInResult> {
  const donation = await ctx.db.get(args.donationId);
  if (!donation) throw new ConvexError("donation_not_found");
  if (donation.userId !== args.userId) throw new ConvexError("forbidden");
  if (donation.status !== "paid") throw new ConvexError("donation_not_paid");

  const existing = await ctx.db
    .query("prizeEntries")
    .withIndex("by_donation", (q) => q.eq("donationId", args.donationId))
    .first();
  if (existing) {
    return { entryId: existing._id, alreadyEntered: true };
  }

  const entryId = await ctx.db.insert("prizeEntries", {
    donationId: args.donationId,
    userId: args.userId,
    method: "online" as const,
  });
  return { entryId, alreadyEntered: false };
}

export const optIn = mutation({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");
    return await _optInForTest(ctx, { donationId, userId });
  },
});

// Read-only check used by the success page to decide which button copy
// to render: "Enter the prize draw (free)" vs "You're entered".
export const isEntered = query({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    const existing = await ctx.db
      .query("prizeEntries")
      .withIndex("by_donation", (q) => q.eq("donationId", donationId))
      .first();
    return existing !== null;
  },
});

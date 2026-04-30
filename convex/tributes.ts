import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { moderateTribute } from "../lib/moderation";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";

const TRIBUTE_MAX_LENGTH = 280;

interface UpdateArgs {
  userId: Id<"users">;
  donationId: Id<"donations">;
  text: string;
}

// Donor edits their tribute via /manage. Auth + ownership-via-donation
// is enforced. Editing flips the tribute back to pending so the
// profanity worker re-checks it before it shows on the wall.
export async function _updateForTest(
  ctx: MutationCtx,
  args: UpdateArgs,
): Promise<{ tributeId: Id<"tributes"> }> {
  const donation = await ctx.db.get(args.donationId);
  if (!donation) throw new ConvexError("donation_not_found");
  if (donation.userId !== args.userId) throw new ConvexError("forbidden");

  const trimmed = args.text.trim();
  if (trimmed.length > TRIBUTE_MAX_LENGTH) {
    throw new ConvexError("tribute_too_long");
  }

  const existing = await ctx.db
    .query("tributes")
    .withIndex("by_status")
    .filter((q) => q.eq(q.field("donationId"), args.donationId))
    .first();

  const moderation = moderateTribute(trimmed);
  const status =
    moderation.decision === "approve"
      ? ("approved" as const)
      : ("pending" as const);

  if (existing) {
    await ctx.db.patch(existing._id, {
      text: trimmed,
      status,
      profanityScore: moderation.score,
    });
    return { tributeId: existing._id };
  }

  if (trimmed.length === 0) {
    throw new ConvexError("tribute_empty");
  }

  const tributeId = await ctx.db.insert("tributes", {
    donationId: args.donationId,
    text: trimmed,
    status,
    profanityScore: moderation.score,
  });
  return { tributeId };
}

export const update = mutation({
  args: { donationId: v.id("donations"), text: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");
    return await _updateForTest(ctx, { ...args, userId });
  },
});

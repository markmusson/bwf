import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { moderateTribute } from "../lib/moderation";
import { requireAdmin } from "./admin";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

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

// Public — approved tributes for the /wall page. Bounded at 200 most
// recent; pagination lands when we outgrow that.
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const tributes = await ctx.db
      .query("tributes")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .take(200);

    const result: Array<{
      tributeId: Id<"tributes">;
      text: string;
      createdAt: number;
      displayName: string | null;
      seat: { stand: string; row: number; num: number } | null;
    }> = [];

    for (const tribute of tributes) {
      const donation = await ctx.db.get(tribute.donationId);
      if (!donation || donation.status !== "paid") continue;
      const seat = donation.seatId ? await ctx.db.get(donation.seatId) : null;
      result.push({
        tributeId: tribute._id,
        text: tribute.text,
        createdAt: tribute._creationTime,
        displayName: donation.hideName ? null : (donation.displayName ?? null),
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    return result;
  },
});

// Admin moderation queue. Returns pending and rejected tributes with
// donation context and the donor's display name. Worst-first by
// profanityScore so the human sees slurs and spam at the top.
export const listForModeration = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pending = await ctx.db
      .query("tributes")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(200);
    const rejected = await ctx.db
      .query("tributes")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .take(50);

    const sorted = [...pending, ...rejected].sort(
      (a, b) => (b.profanityScore ?? 0) - (a.profanityScore ?? 0),
    );

    const result = [] as Array<{
      tributeId: Id<"tributes">;
      donationId: Id<"donations">;
      text: string;
      status: string;
      profanityScore: number;
      displayName: string | null;
      seat: { stand: string; row: number; num: number } | null;
    }>;

    for (const tribute of sorted) {
      const donation = await ctx.db.get(tribute.donationId);
      const seat = donation?.seatId ? await ctx.db.get(donation.seatId) : null;
      result.push({
        tributeId: tribute._id,
        donationId: tribute.donationId,
        text: tribute.text,
        status: tribute.status,
        profanityScore: tribute.profanityScore ?? 0,
        displayName: donation?.displayName ?? null,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    return result;
  },
});

export const adminApprove = mutation({
  args: { tributeId: v.id("tributes") },
  handler: async (ctx, { tributeId }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(tributeId, { status: "approved" as const });
    return { approvedBy: admin.email };
  },
});

export const adminReject = mutation({
  args: { tributeId: v.id("tributes") },
  handler: async (ctx, { tributeId }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(tributeId, { status: "rejected" as const });
    return { rejectedBy: admin.email };
  },
});

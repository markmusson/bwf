import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { moderateTribute } from "../lib/moderation";
import { logAdminAction, requireAdmin } from "./admin";
import { consumeRateLimit, RATE_LIMITS } from "./rateLimit";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

const TRIBUTE_MAX_LENGTH = 280;

interface UpdateArgs {
  userId: Id<"users"> | null;
  clientHoldId?: string;
  donationId: Id<"donations">;
  text: string;
}

// Donor edits their tribute via /manage. Auth-by-userId OR
// ownership-by-clientHoldId is sufficient — matches donations.update
// so a donor who paid without ever signing in via magic-link can still
// edit from the same browser. Editing flips the tribute back to
// pending so the profanity worker re-checks it before it shows on
// the wall.
export async function _updateForTest(
  ctx: MutationCtx,
  args: UpdateArgs,
): Promise<{ tributeId: Id<"tributes"> }> {
  const donation = await ctx.db.get(args.donationId);
  if (!donation) throw new ConvexError("donation_not_found");

  const userMatches = args.userId && donation.userId === args.userId;
  const clientMatches =
    args.clientHoldId &&
    args.clientHoldId.length >= 8 &&
    donation.clientHoldId === args.clientHoldId;
  if (!userMatches && !clientMatches) {
    throw new ConvexError(args.userId ? "forbidden" : "unauthenticated");
  }

  const trimmed = args.text.trim();
  if (trimmed.length > TRIBUTE_MAX_LENGTH) {
    throw new ConvexError("tribute_too_long");
  }

  await consumeRateLimit(
    ctx,
    `tributeUpdate:${args.donationId}`,
    RATE_LIMITS.tributeUpdate,
  );

  const existing = await ctx.db
    .query("tributes")
    .withIndex("by_donation", (q) => q.eq("donationId", args.donationId))
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
  args: {
    donationId: v.id("donations"),
    clientHoldId: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await _updateForTest(ctx, { ...args, userId });
  },
});

// Public — every paid seat for the /wall page, grouped one row per
// seat (single-claim). Donations WITHOUT an approved tribute appear
// as a synthetic entry with text="" so the wall populates from
// donation #1 rather than waiting on the moderation queue. Bounded
// at 1000 most recent paid donations; pagination lands when we
// outgrow that.
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .order("desc")
      .take(1000);

    type TributeEntry = {
      tributeId: Id<"tributes"> | string;
      text: string;
      createdAt: number;
      displayName: string | null;
      recipientName: string | null;
    };
    type SeatGroup = {
      seatId: Id<"seats">;
      seat: { stand: string; row: number; num: number; slug: string };
      donors: number;
      raisedPence: number;
      tributes: TributeEntry[];
      latestAt: number;
    };

    // Batch the per-donation lookups up front so wall load is O(1)
    // round-trips to Convex instead of O(N) — at 1000 paid donations
    // the N+1 version was hammering the DB per refresh.
    const seatIds = Array.from(
      new Set(paid.map((d) => d.seatId).filter((id): id is Id<"seats"> => !!id)),
    );
    const seatById = new Map<Id<"seats">, Doc<"seats">>();
    await Promise.all(
      seatIds.map(async (id) => {
        const row = await ctx.db.get(id);
        if (row) seatById.set(id, row);
      }),
    );
    const tributeByDonation = new Map<Id<"donations">, Doc<"tributes">>();
    await Promise.all(
      paid.map(async (d) => {
        const t = await ctx.db
          .query("tributes")
          .withIndex("by_donation", (q) => q.eq("donationId", d._id))
          .first();
        if (t) tributeByDonation.set(d._id, t);
      }),
    );

    const groups = new Map<Id<"seats">, SeatGroup>();

    for (const donation of paid) {
      if (!donation.seatId) continue;
      const seatRow = seatById.get(donation.seatId);
      if (!seatRow) continue;

      let group = groups.get(donation.seatId);
      if (!group) {
        group = {
          seatId: seatRow._id,
          seat: {
            stand: seatRow.stand,
            row: seatRow.row,
            num: seatRow.num,
            slug: `${seatRow.stand}-${seatRow.row + 1}-${seatRow.num + 1}`,
          },
          donors: seatRow.status === "taken" ? 1 : 0,
          raisedPence: 0,
          tributes: [],
          latestAt: 0,
        };
        groups.set(donation.seatId, group);
      }
      group.raisedPence += donation.amountPence;

      const tribute = tributeByDonation.get(donation._id);

      // Approved tribute → carry the text. No tribute (or one still
      // pending / rejected) → synthetic entry with empty text so the
      // donor's dedication still appears on the wall, just sans words.
      const entry: TributeEntry =
        tribute && tribute.status === "approved"
          ? {
              tributeId: tribute._id,
              text: tribute.text,
              createdAt: tribute._creationTime,
              displayName: donation.hideName
                ? null
                : (donation.displayName ?? null),
              recipientName: donation.recipientName ?? null,
            }
          : {
              // Use the donation id as a stable key so React rendering
              // and the search filter both have something to hash.
              tributeId: `donation:${donation._id}`,
              text: "",
              createdAt: donation._creationTime,
              displayName: donation.hideName
                ? null
                : (donation.displayName ?? null),
              recipientName: donation.recipientName ?? null,
            };
      group.tributes.push(entry);
      if (entry.createdAt > group.latestAt) {
        group.latestAt = entry.createdAt;
      }
    }

    // Sort each group's tributes newest-first, then sort groups by
    // their most recent activity.
    const result = Array.from(groups.values());
    for (const group of result) {
      group.tributes.sort((a, b) => b.createdAt - a.createdAt);
    }
    result.sort((a, b) => b.latestAt - a.latestAt);
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
    await logAdminAction(ctx, admin, {
      action: "tribute.approve",
      targetType: "tribute",
      targetId: tributeId,
    });
    return { approvedBy: admin.email };
  },
});

// Admin override: rewrite a tribute's text. Use when the donor
// snuck something through (e.g. "James Bond" jokes) and we'd rather
// edit than reject. Logged to the audit trail.
export const adminEditText = mutation({
  args: { tributeId: v.id("tributes"), text: v.string() },
  handler: async (ctx, { tributeId, text }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(tributeId, { text: text.trim() });
    await logAdminAction(ctx, admin, {
      action: "tribute.adminEditText",
      targetType: "tribute",
      targetId: tributeId,
    });
    return { editedBy: admin.email };
  },
});

export const adminReject = mutation({
  args: { tributeId: v.id("tributes") },
  handler: async (ctx, { tributeId }) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(tributeId, { status: "rejected" as const });
    await logAdminAction(ctx, admin, {
      action: "tribute.reject",
      targetType: "tribute",
      targetId: tributeId,
    });
    return { rejectedBy: admin.email };
  },
});

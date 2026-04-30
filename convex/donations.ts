import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { moderateTribute } from "../lib/moderation";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";

const MIN_DONATION_PENCE = 1000;

const giftAidConfirmationsValidator = v.object({
  ukTaxpayer: v.boolean(),
  ownMoney: v.boolean(),
  noBenefit: v.boolean(),
  declaredAt: v.number(),
});

export interface CreateDraftArgs {
  userId: Id<"users">;
  seatId: Id<"seats">;
  amountPence: number;
  giftAid: boolean;
  giftAidConfirmations?: {
    ukTaxpayer: boolean;
    ownMoney: boolean;
    noBenefit: boolean;
    declaredAt: number;
  };
  hideName: boolean;
  hideAmount: boolean;
  displayName?: string;
  avatarConfig?: string;
  marketingOptIn?: boolean;
  marketingConsentRecordedAt?: number;
  tag?: string;
  stripeSessionId: string;
  tributeText?: string;
}

export interface CreateDraftResult {
  donationId: Id<"donations">;
  tributeId: Id<"tributes"> | null;
}

// Serialisable draft creation. Verifies the donor still holds the seat,
// inserts donations(status=pending) and (if a tribute was supplied)
// tributes(status=pending). Webhook flips both on payment success
// (07 §8). Tested directly via convex-test through this export.
export async function _createDraftForTest(
  ctx: MutationCtx,
  args: CreateDraftArgs,
): Promise<CreateDraftResult> {
  if (
    !Number.isInteger(args.amountPence) ||
    args.amountPence < MIN_DONATION_PENCE
  ) {
    throw new ConvexError("amount_below_minimum");
  }

  const hold = await ctx.db
    .query("holds")
    .withIndex("by_seat", (q) => q.eq("seatId", args.seatId))
    .first();
  if (!hold || hold.userId !== args.userId) {
    throw new ConvexError("hold_required");
  }
  if (hold.expiresAt <= Date.now()) {
    throw new ConvexError("hold_expired");
  }

  const donationId = await ctx.db.insert("donations", {
    userId: args.userId,
    seatId: args.seatId,
    amountPence: args.amountPence,
    currency: "GBP" as const,
    giftAid: args.giftAid,
    giftAidConfirmations: args.giftAidConfirmations,
    hideName: args.hideName,
    hideAmount: args.hideAmount,
    displayName: args.displayName,
    avatarConfig: args.avatarConfig,
    marketingOptIn: args.marketingOptIn,
    marketingConsentRecordedAt: args.marketingConsentRecordedAt,
    tag: args.tag,
    stripeSessionId: args.stripeSessionId,
    status: "pending" as const,
  });

  let tributeId: Id<"tributes"> | null = null;
  if (args.tributeText && args.tributeText.trim().length > 0) {
    const trimmed = args.tributeText.trim();
    const moderation = moderateTribute(trimmed);
    tributeId = await ctx.db.insert("tributes", {
      donationId,
      text: trimmed,
      status:
        moderation.decision === "approve"
          ? ("approved" as const)
          : ("pending" as const),
      profanityScore: moderation.score,
    });
  }

  return { donationId, tributeId };
}

// Internal — called from the createSession action after Stripe returns
// the Checkout Session id. Public donate flow always reaches here.
export const createDraft = internalMutation({
  args: {
    userId: v.id("users"),
    seatId: v.id("seats"),
    amountPence: v.number(),
    giftAid: v.boolean(),
    giftAidConfirmations: v.optional(giftAidConfirmationsValidator),
    hideName: v.boolean(),
    hideAmount: v.boolean(),
    displayName: v.optional(v.string()),
    avatarConfig: v.optional(v.string()),
    marketingOptIn: v.optional(v.boolean()),
    marketingConsentRecordedAt: v.optional(v.number()),
    tag: v.optional(v.string()),
    stripeSessionId: v.string(),
    tributeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await _createDraftForTest(ctx, args);
  },
});

// Public — read on the success page, keyed by Stripe session id from
// the return URL. Auth-gated: returns the full donation only to the
// donor who created it. Other callers (or anonymous) get null.
//
// This stops a leaked session_id (browser history, screenshots,
// referrer headers) from exposing the donor's name + Gift Aid status
// + amount + tribute references to a third party.
export const getBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const donation = await ctx.db
      .query("donations")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();
    if (!donation) return null;
    if (donation.userId !== userId) return null;
    return donation;
  },
});

// Public reactive aggregate for the campaign header. Numbers update
// live as webhooks complete. Bounded reads — at v1 scale (~1280 seats,
// few thousand donations) one pass is fine; if we outgrow this we
// denormalise into a counter doc per the Convex guidelines.
export const aggregateStats = query({
  args: {},
  handler: async (ctx) => {
    const seats = await ctx.db.query("seats").take(2000);
    const totalSeats = seats.length;
    const seatsBlue = seats.filter((s) => s.status === "taken").length;

    const paid = await ctx.db
      .query("donations")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .take(5000);

    const supporters = paid.length;
    const raisedPence = paid.reduce((sum, d) => {
      const uplift = d.giftAid ? Math.floor(d.amountPence / 4) : 0;
      return sum + d.amountPence + uplift;
    }, 0);

    return { raisedPence, seatsBlue, supporters, totalSeats };
  },
});

interface MarkPaidArgs {
  stripeSessionId: string;
  paymentIntentId?: string;
}

interface MarkPaidResult {
  donationId: Id<"donations"> | null;
  alreadyPaid: boolean;
}

// Serialisable webhook fan-out: flip donation to paid, mark seat taken,
// release the hold. Idempotent on second call (returns alreadyPaid:true).
// Receipt email is fired by a separate scheduled action so we keep the
// webhook fast (07 §8). Tested directly via convex-test.
export async function _markPaidForTest(
  ctx: MutationCtx,
  args: MarkPaidArgs,
): Promise<MarkPaidResult> {
  const donation = await ctx.db
    .query("donations")
    .withIndex("by_session", (q) =>
      q.eq("stripeSessionId", args.stripeSessionId),
    )
    .first();
  if (!donation) {
    return { donationId: null, alreadyPaid: false };
  }
  if (donation.status === "paid") {
    return { donationId: donation._id, alreadyPaid: true };
  }

  await ctx.db.patch(donation._id, {
    status: "paid" as const,
    stripePaymentIntentId: args.paymentIntentId,
  });

  if (donation.seatId) {
    const seat = await ctx.db.get(donation.seatId);
    if (seat && seat.status !== "taken") {
      await ctx.db.patch(seat._id, {
        status: "taken" as const,
        donationId: donation._id,
      });
    }
    const hold = await ctx.db
      .query("holds")
      .withIndex("by_seat", (q) => q.eq("seatId", donation.seatId!))
      .first();
    if (hold) {
      await ctx.db.delete(hold._id);
    }
  }

  return { donationId: donation._id, alreadyPaid: false };
}

export const markPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await _markPaidForTest(ctx, args);
    // Schedule the receipt email after the transaction commits. The
    // action checks receiptSentAt and bails on second invocation, so a
    // webhook replay won't double-send.
    if (result.donationId && !result.alreadyPaid) {
      await ctx.scheduler.runAfter(0, internal.email.sendReceipt, {
        donationId: result.donationId,
      });
    }
    return result;
  },
});

// Internal — used by the receipt email action to look up the donation.
export const getByIdInternal = internalQuery({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    return await ctx.db.get(donationId);
  },
});

// Internal — flag a donation's receipt as sent. Idempotent set.
export const markReceiptSent = internalMutation({
  args: { donationId: v.id("donations") },
  handler: async (ctx, { donationId }) => {
    await ctx.db.patch(donationId, { receiptSentAt: Date.now() });
  },
});

// Public — donor's own paid donations + linked tribute + seat
// coordinate. Used by /manage to show what they've claimed.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const donations = await ctx.db
      .query("donations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const result: Array<{
      donation: (typeof donations)[number];
      tribute: { _id: Id<"tributes">; text: string; status: string } | null;
      seat: { stand: string; row: number; num: number } | null;
    }> = [];

    for (const donation of donations) {
      const tribute = await ctx.db
        .query("tributes")
        .withIndex("by_status")
        .filter((q) => q.eq(q.field("donationId"), donation._id))
        .first();
      const seat = donation.seatId ? await ctx.db.get(donation.seatId) : null;
      result.push({
        donation,
        tribute: tribute
          ? { _id: tribute._id, text: tribute.text, status: tribute.status }
          : null,
        seat: seat ? { stand: seat.stand, row: seat.row, num: seat.num } : null,
      });
    }

    return result;
  },
});

// Public — donor edits their own donation. Auth + ownership enforced;
// status / amount / stripe ids stay immutable.
export const update = mutation({
  args: {
    donationId: v.id("donations"),
    displayName: v.optional(v.string()),
    hideName: v.optional(v.boolean()),
    hideAmount: v.optional(v.boolean()),
    avatarConfig: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");

    const donation = await ctx.db.get(args.donationId);
    if (!donation) throw new ConvexError("not_found");
    if (donation.userId !== userId) throw new ConvexError("forbidden");

    const patch: {
      displayName?: string;
      hideName?: boolean;
      hideAmount?: boolean;
      avatarConfig?: string;
    } = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.hideName !== undefined) patch.hideName = args.hideName;
    if (args.hideAmount !== undefined) patch.hideAmount = args.hideAmount;
    if (args.avatarConfig !== undefined) patch.avatarConfig = args.avatarConfig;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.donationId, patch);
    }
    return null;
  },
});

// Stripe webhook idempotency log. The unique-on-eventId behaviour is
// implemented as check-then-insert inside this mutation: a second
// insert with the same id throws event_already_processed, which the
// webhook httpAction translates into a clean 200. Tested directly.
export async function _recordEventForTest(
  ctx: MutationCtx,
  eventId: string,
): Promise<Id<"stripeEvents">> {
  const existing = await ctx.db
    .query("stripeEvents")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .first();
  if (existing) {
    throw new ConvexError("event_already_processed");
  }
  return await ctx.db.insert("stripeEvents", {
    eventId,
    receivedAt: Date.now(),
  });
}

export const recordEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    return await _recordEventForTest(ctx, eventId);
  },
});

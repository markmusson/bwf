import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, query, type MutationCtx } from "./_generated/server";

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
    tributeId = await ctx.db.insert("tributes", {
      donationId,
      text: args.tributeText.trim(),
      status: "pending" as const,
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
// the return URL.
export const getBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, { stripeSessionId }) => {
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();
    return donation;
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
    return await _markPaidForTest(ctx, args);
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

"use node";

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

interface CreateDraftResult {
  donationId: Id<"donations">;
  tributeId: Id<"tributes"> | null;
}

interface CreateSessionResult {
  clientSecret: string;
  donationId: Id<"donations">;
}

const MIN_DONATION_PENCE = 1000;
const TRIBUTE_MAX_LENGTH = 280;

const giftAidConfirmationsValidator = v.object({
  ukTaxpayer: v.boolean(),
  ownMoney: v.boolean(),
  noBenefit: v.boolean(),
  declaredAt: v.number(),
});

function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new ConvexError("stripe_secret_missing");
  }
  return new Stripe(secret);
}

function getProductId(): string {
  const id = process.env.STRIPE_PRODUCT_ID;
  if (!id) {
    throw new ConvexError("stripe_product_missing");
  }
  return id;
}

function getReturnUrl(): string {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  return `${site}/donate/complete?session_id={CHECKOUT_SESSION_ID}`;
}

// Public action: takes the wizard payload, creates a Stripe Embedded
// Checkout session against the BWF product, then atomically writes
// donations(pending) + tributes(pending) via the createDraft internal
// mutation. Returns the Stripe client_secret for the frontend to mount
// EmbeddedCheckout, plus the donationId for the success page.
export const createSession = action({
  args: {
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
    tributeText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CreateSessionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");

    if (
      !Number.isInteger(args.amountPence) ||
      args.amountPence < MIN_DONATION_PENCE
    ) {
      throw new ConvexError("amount_below_minimum");
    }

    if (
      args.tributeText !== undefined &&
      args.tributeText.length > TRIBUTE_MAX_LENGTH
    ) {
      throw new ConvexError("tribute_too_long");
    }

    if (args.giftAid && !args.giftAidConfirmations) {
      throw new ConvexError("gift_aid_confirmations_required");
    }

    const stripe = getStripe();
    // The Stripe Node SDK 22 types narrow ui_mode to a renamed enum
    // that doesn't include "embedded", but the live REST API still
    // accepts "embedded" for Embedded Checkout. Casting until upstream
    // catches up.
    const sessionParams = {
      mode: "payment" as const,
      ui_mode: "embedded",
      payment_method_types: ["card"],
      currency: "gbp",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product: getProductId(),
            unit_amount: args.amountPence,
          },
          quantity: 1,
        },
      ],
      return_url: getReturnUrl(),
    } as unknown as Stripe.Checkout.SessionCreateParams;

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.id || !session.client_secret) {
      throw new ConvexError("stripe_session_failed");
    }

    const draft: CreateDraftResult = await ctx.runMutation(
      internal.donations.createDraft,
      {
        userId,
        seatId: args.seatId,
        amountPence: args.amountPence,
        giftAid: args.giftAid,
        giftAidConfirmations: args.giftAidConfirmations,
        hideName: args.hideName,
        hideAmount: args.hideAmount,
        displayName: args.displayName,
        avatarConfig: args.avatarConfig,
        marketingOptIn: args.marketingOptIn,
        marketingConsentRecordedAt: args.marketingConsentRecordedAt,
        tag: args.tag,
        stripeSessionId: session.id,
        tributeText: args.tributeText,
      },
    );

    return {
      clientSecret: session.client_secret,
      donationId: draft.donationId,
    };
  },
});

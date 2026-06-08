"use node";

import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";

interface CreateDraftResult {
  donationId: Id<"donations">;
  tributeId: Id<"tributes"> | null;
}

interface CreateSessionResult {
  clientSecret: string;
  donationId: Id<"donations">;
}

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
  // Strip any path off SITE_URL so a mis-set value like
  //   SITE_URL=https://example.com/stadium
  // doesn't redirect the donor to /stadium/thanks (which 404s and
  // dumps them back at the seat selector). Matches the same defensive
  // normalize in convex/email.ts.
  const raw = process.env.SITE_URL ?? "http://localhost:3000";
  const site = raw.match(/^https?:\/\/[^/]+/)?.[0] ?? raw.replace(/\/$/, "");
  return `${site}/thanks?session_id={CHECKOUT_SESSION_ID}`;
}

// Public action: takes the wizard payload, creates a Stripe Embedded
// Checkout session against the BWF product, then atomically writes
// donations(pending) + tributes(pending) via the createDraft internal
// mutation. Returns the Stripe client_secret for the frontend to mount
// EmbeddedCheckout, plus the donationId for the success page.
export const createSession = action({
  args: {
    clientHoldId: v.string(),
    seatId: v.id("seats"),
    amountPence: v.number(),
    giftAid: v.boolean(),
    giftAidConfirmations: v.optional(giftAidConfirmationsValidator),
    hideName: v.boolean(),
    hideAmount: v.boolean(),
    displayName: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    avatarConfig: v.optional(v.string()),
    marketingOptIn: v.optional(v.boolean()),
    marketingConsentRecordedAt: v.optional(v.number()),
    tag: v.optional(v.string()),
    tributeText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CreateSessionResult> => {
    if (args.clientHoldId.length < 8) {
      throw new ConvexError("invalid_client_hold_id");
    }

    if (!Number.isInteger(args.amountPence)) {
      throw new ConvexError("amount_below_minimum");
    }

    // Per-seat tier minimum — premium seats start at £50, etc. The
    // donor can always bump UPWARDS but never below.
    const seatMinimum: number | null = await ctx.runQuery(
      api.seats.getMinimumPenceForSeat,
      { seatId: args.seatId },
    );
    if (seatMinimum === null) {
      throw new ConvexError("hold_required");
    }
    if (args.amountPence < seatMinimum) {
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
    // No payment_method_types: when omitted, Checkout pulls the live
    // method list from the Stripe dashboard, which lets Apple Pay,
    // Google Pay, Link and any future wallets surface dynamically.
    // Hard-coding ["card"] was capping the funnel to keyed entry only.
    // Apple Pay also needs the domain registered separately at
    // Settings -> Payment methods -> Apple Pay -> Web domains.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
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
    });

    if (!session.id || !session.client_secret) {
      throw new ConvexError("stripe_session_failed");
    }

    const draft: CreateDraftResult = await ctx.runMutation(
      internal.donations.createDraft,
      {
        clientHoldId: args.clientHoldId,
        seatId: args.seatId,
        amountPence: args.amountPence,
        giftAid: args.giftAid,
        giftAidConfirmations: args.giftAidConfirmations,
        hideName: args.hideName,
        hideAmount: args.hideAmount,
        displayName: args.displayName,
        recipientName: args.recipientName,
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

// One-shot setup: idempotently create the BWF Stripe Product so the
// donor's Checkout Session can reference it. Run with:
//   npx convex run stripe:setupProduct
// Output includes the productId — paste into:
//   npx convex env set STRIPE_PRODUCT_ID <productId>
export const setupProduct = internalAction({
  args: { name: v.optional(v.string()) },
  handler: async (
    _ctx,
    { name },
  ): Promise<{ productId: string; created: boolean; name: string }> => {
    const productName = name ?? "BWF Virtual Seat — Blue for Bob";
    const stripe = getStripe();

    const escaped = productName.replace(/'/g, "\\'");
    const existing = await stripe.products.search({
      query: `name:'${escaped}' AND active:'true'`,
    });
    if (existing.data.length > 0) {
      return {
        productId: existing.data[0]!.id,
        created: false,
        name: productName,
      };
    }

    const product = await stripe.products.create({
      name: productName,
      description: "Donate to the Bob Willis Fund — pick a seat at Edgbaston.",
    });
    return { productId: product.id, created: true, name: productName };
  },
});

// Recovery action: walk every Stripe checkout session created in the
// last N hours, find the ones Stripe says are `complete` but the
// corresponding donation in Convex is still `pending`, and re-fire
// markPaid for each. Use this to mop up donors whose webhook delivery
// silently failed (the bug fixed in webhooks.ts on 8 Jun) — they
// paid, Stripe took the money, but their seat never turned blue.
// Idempotent end-to-end; safe to run multiple times.
//
// Run with:
//   npx convex run --prod stripe:reconcileStuckDonations '{"hoursBack":72}'
export const reconcileStuckDonations = internalAction({
  args: { hoursBack: v.number() },
  handler: async (
    ctx,
    { hoursBack },
  ): Promise<{
    scanned: number;
    completedOnStripe: number;
    markedPaid: number;
    sessionIds: string[];
  }> => {
    const stripe = getStripe();
    const since = Math.floor(Date.now() / 1000 - hoursBack * 3600);
    let scanned = 0;
    let completedOnStripe = 0;
    let markedPaid = 0;
    const repaired: string[] = [];
    for await (const session of stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100,
    })) {
      scanned += 1;
      if (session.status !== "complete") continue;
      if (session.payment_status !== "paid") continue;
      completedOnStripe += 1;
      const donorEmail =
        session.customer_details?.email ?? session.customer_email ?? undefined;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : undefined;
      const result: { donationId: string | null; alreadyPaid: boolean } =
        await ctx.runMutation(internal.donations.markPaid, {
          stripeSessionId: session.id,
          paymentIntentId,
          donorEmail,
        });
      if (result.donationId && !result.alreadyPaid) {
        markedPaid += 1;
        repaired.push(session.id);
      }
    }
    return {
      scanned,
      completedOnStripe,
      markedPaid,
      sessionIds: repaired,
    };
  },
});

// stripeWebhook httpAction lives in convex/webhooks.ts so it can run
// in Convex's V8 runtime (httpActions can't be defined in "use node"
// files). It calls back into the recordEvent + markPaid internal
// mutations defined in convex/donations.ts.

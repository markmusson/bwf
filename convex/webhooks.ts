import { ConvexError } from "convex/values";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

// Stripe Webhook — receives events at
//   https://<deployment>.convex.site/stripe/webhook
// Per 07 §8: verify signature, record the event id for idempotency,
// then fan out to markPaid on checkout.session.completed. Receipt
// email is scheduled separately to keep this handler fast.
//
// This file deliberately does NOT use "use node" — Convex doesn't
// allow httpActions in Node-runtime files. The Stripe SDK's worker
// build (loaded automatically in non-Node environments) supports the
// async signature verifier we need.
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeSecret) {
    return new Response("not configured", { status: 500 });
  }

  const body = await request.text();
  const stripe = new Stripe(stripeSecret);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  try {
    await ctx.runMutation(internal.donations.recordEvent, {
      eventId: event.id,
    });
  } catch (err) {
    if (err instanceof ConvexError && err.data === "event_already_processed") {
      return new Response("ok", { status: 200 });
    }
    throw err;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (typeof session.id === "string") {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : undefined;
      const donorEmail =
        session.customer_details?.email ?? session.customer_email ?? undefined;
      await ctx.runMutation(internal.donations.markPaid, {
        stripeSessionId: session.id,
        paymentIntentId,
        donorEmail: donorEmail ?? undefined,
      });
    }
  }

  return new Response("ok", { status: 200 });
});

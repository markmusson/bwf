import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./webhooks";

const http = httpRouter();

// Convex Auth's magic-link verification routes (POST /api/auth/signin,
// GET /api/auth/callback/resend, etc.) — required for the Resend
// provider to complete the round-trip.
auth.addHttpRoutes(http);

// Stripe webhook endpoint. Stripe is configured to deliver to
// https://<deployment>.convex.site/stripe/webhook with the secret in
// STRIPE_WEBHOOK_SECRET (Convex env).
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;

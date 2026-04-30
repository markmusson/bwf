# 07 — Convex Pivot (supersedes Supabase parts of 03 and 05)

This doc replaces the Supabase pieces of `03-claude-code-prd.md` and `05-setup-checklist.md`. Where this doc and earlier docs disagree, this doc wins. Geometry, UX, Stripe Checkout, Resend, the prize-draw separation, the £10 floor, magic-link-only, the avatar approach — all unchanged.

Claude Code: read this doc fully before writing or deleting code. Do not relitigate the database choice — it has moved to Convex. Do not propose Prisma, Drizzle, Postgres, or Supabase variants.

## 1. What to stop

Stop any work that adds Supabase clients, RLS policies, SQL migrations, PostgREST calls, `@supabase/ssr` middleware, or service-role keys.

Pause any in-flight PR that touches `src/lib/supabase*`, `supabase/migrations/*`, or auth wiring built on Supabase.

If a PR is purely UI / geometry / avatar / Stripe Checkout client / email template / static pages — keep going. Those layers are framework-agnostic and survive the swap.

## 2. New locked stack

- Next.js 15 App Router, TS strict, Tailwind v4 — unchanged
- **Convex** for database, server functions, scheduled jobs, HTTP actions
- **Convex Auth** with the Resend (magic link) provider — only auth method
- **Stripe Embedded Checkout** — unchanged
- **Resend** for transactional email — unchanged
- **Vercel** for the Next app — unchanged
- Convex deployment region: **EU**. Set at project creation. Non-negotiable, donor data + Gift Aid.

No Prisma. No Drizzle. No Postgres. No Supabase. No NextAuth. No Clerk.

## 3. Rip list

Delete from the repo:

- `supabase/` directory (migrations, config, seed)
- `src/lib/supabase/*`, `src/lib/db.ts` if it wraps Supabase
- Any `createServerClient`, `createBrowserClient`, `createRouteHandlerClient` imports
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from `.env*`, `.env.example`, Vercel config
- Webhook route at `app/api/stripe/webhook/route.ts` if it uses the Supabase service role client (the route is moving to a Convex httpAction)
- Any RLS docs or policies in `design/`

Keep but expect to rewrite the data calls inside:

- `app/seats/page.tsx` and any seat-map client code (swap fetch for `useQuery(api.seats.list)`)
- Tribute submit form (swap to `useMutation(api.tributes.submit)`)
- Donation success page (read by `stripeSessionId` from Convex)

## 4. New project layout

```
convex/
  schema.ts
  auth.ts                 # Convex Auth config, Resend provider
  auth.config.ts
  seats.ts                # queries: list, getByCoord
  holds.ts                # mutations: claim, release; cron: expire
  tributes.ts             # mutations: submit; queries: listApproved
  donations.ts            # mutations: createSession (action), recordPaid
  stripe.ts               # httpAction: webhook
  prizeDraw.ts            # mutation: optIn (post-donation only)
  http.ts                 # router for httpActions
  crons.ts                # scheduled hold expiry
  _generated/             # gitignored

src/
  app/                    # Next.js App Router, unchanged shape
  components/
  lib/
    convex.ts             # ConvexReactClient
    stripe.ts             # client-side helpers only
```

## 5. Convex schema (`convex/schema.ts`)

Source of truth. Mirrors the entities in PRD §6 but in Convex shapes. Use `v.id()` for refs.

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  seats: defineTable({
    stand: v.string(),       // e.g. "Hollies", "Pavilion"
    row: v.number(),
    num: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("taken"),
    ),
    donationId: v.optional(v.id("donations")),
  })
    .index("by_coord", ["stand", "row", "num"])
    .index("by_status", ["status"]),

  holds: defineTable({
    seatId: v.id("seats"),
    userId: v.id("users"),
    expiresAt: v.number(),   // ms epoch
  })
    .index("by_seat", ["seatId"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  tributes: defineTable({
    donationId: v.id("donations"),
    text: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    profanityScore: v.optional(v.number()),
  }).index("by_status", ["status"]),

  donations: defineTable({
    userId: v.id("users"),
    seatId: v.optional(v.id("seats")),
    amountPence: v.number(),
    currency: v.literal("GBP"),
    giftAid: v.boolean(),
    hideName: v.boolean(),
    hideAmount: v.boolean(),
    displayName: v.optional(v.string()),
    avatarConfig: v.optional(v.string()),    // JSON string
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
  })
    .index("by_session", ["stripeSessionId"])
    .index("by_user", ["userId"]),

  prizeEntries: defineTable({
    donationId: v.id("donations"),
    userId: v.id("users"),
    method: v.union(v.literal("online"), v.literal("postal")),
    address: v.optional(v.string()),
  }).index("by_donation", ["donationId"]),

  stripeEvents: defineTable({         // idempotency log
    eventId: v.string(),
    receivedAt: v.number(),
  }).index("by_event", ["eventId"]),
});
```

Notes:
- Money is integer pence. No floats.
- `prizeEntries` is its own table, only ever written by `prizeDraw.optIn`. Never bundled with donation creation. This is the Gift Aid firewall from `04-enthuse-pattern-findings.md` §1.
- `hideName` and `hideAmount` are independent — keep both, don't collapse.

## 6. Auth (`convex/auth.ts`)

Use `@convex-dev/auth` with the Resend provider. Magic link only. No passwords, no OAuth. Match PRD §5.

Email sender domain: read from env, placeholder until Adam confirms (per `06-locked-from-adam.md`).

Store nothing on the user beyond what `authTables` gives you plus a `displayName` if needed at signup.

## 7. Hold / claim flow (`convex/holds.ts`)

The whole reason this swap is worth doing. Convex mutations are serializable; no race windows.

```ts
export const claim = mutation({
  args: { seatId: v.id("seats") },
  handler: async (ctx, { seatId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("unauthenticated");

    const seat = await ctx.db.get(seatId);
    if (!seat || seat.status !== "available") {
      throw new ConvexError("seat_unavailable");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("holds")
      .withIndex("by_seat", q => q.eq("seatId", seatId))
      .first();

    if (existing) {
      if (existing.expiresAt > now && existing.userId !== userId) {
        throw new ConvexError("seat_held");
      }
      await ctx.db.delete(existing._id);
    }

    const TEN_MIN = 10 * 60 * 1000;
    return await ctx.db.insert("holds", {
      seatId,
      userId,
      expiresAt: now + TEN_MIN,
    });
  },
});
```

A cron in `convex/crons.ts` runs every minute to delete expired holds. No need for hold release on tab close — TTL handles it.

Test (required, per PRD §10): two clients call `claim` for the same seat in the same tick. Exactly one succeeds. Assert that.

## 8. Stripe webhook (`convex/stripe.ts` + `convex/http.ts`)

The webhook is a Convex `httpAction`, not a Next.js route. Stripe points to `https://<deployment>.convex.site/stripe/webhook`.

Flow on `checkout.session.completed`:

1. Verify signature with `STRIPE_WEBHOOK_SECRET`.
2. Try `ctx.runMutation(internal.stripe.recordEvent, { eventId })`. The mutation inserts into `stripeEvents` with the event id. If the event already exists, throw and the action returns 200 without doing more — that is the idempotency guarantee.
3. Run `internal.donations.markPaid` mutation in a single transaction:
   - Update `donations` row to `status: "paid"`, set `stripePaymentIntentId`.
   - Find the user's active hold for that seat. Convert: set `seats.status = "taken"`, set `seats.donationId`, delete the hold row.
   - If a tribute was submitted as `pending` linked to this donation, leave it for the profanity worker — do not auto-approve.
4. Return 200.

Test (required): post the same event twice. Second call is a no-op. Assert no double seat update, no double email.

Email receipt fires from a separate scheduled function triggered by `markPaid`, not inline in the webhook — keeps the webhook fast.

## 9. Tributes & profanity

`tributes.submit` writes `status: "pending"`. A scheduled action runs the profanity check (whatever vendor or local list — same as `03-claude-code-prd.md` §6.5) and flips to `approved` or `rejected`. The seat-map UI only reads `approved`.

Do not display pending tributes. Do not auto-approve without the filter wired.

## 10. Prize draw

`prizeDraw.optIn` is callable only from the donation success page after `donations.status === "paid"`. It creates a `prizeEntries` row. Free postal entry stays available regardless — see `06-locked-from-adam.md` for the address.

Never insert a `prizeEntries` row from `donations.markPaid`. Never link the Stripe Checkout to the prize draw. The donor must take a separate action. This is non-negotiable; the Gift Aid claim depends on it.

## 11. Realtime seat map

Replace anything that previously polled or used Supabase channels with `useQuery(api.seats.list)`. Convex keeps it live. The "someone took your seat while you were picking" UX is now a free side-effect of the reactive query plus the `claim` mutation throwing `seat_held`.

## 12. Env vars

Replace Supabase block with:

```
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
CONVEX_DEPLOY_KEY=          # CI only
AUTH_RESEND_KEY=
JWT_PRIVATE_KEY=            # generated by Convex Auth setup
SITE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=             # if separate from Convex Auth's Resend key
EMAIL_FROM=                 # placeholder until Adam confirms
```

Update `.env.example` and Vercel project settings to match. Remove all `SUPABASE_*` keys.

## 13. Updated setup checklist (replaces `05-setup-checklist.md` §§ on Supabase)

1. `npm create convex@latest` in a scratch dir, then port `convex/` into the BWF repo. Pick **EU** region.
2. `npx @convex-dev/auth` to scaffold auth tables and helpers.
3. Configure Resend in Convex Auth. Sender domain = placeholder until Adam confirms.
4. `npx convex dev` for local, `npx convex deploy` from CI.
5. Set Stripe webhook endpoint to `https://<deployment>.convex.site/stripe/webhook`. Save the signing secret into Convex env (`npx convex env set STRIPE_WEBHOOK_SECRET ...`).
6. Vercel: set `NEXT_PUBLIC_CONVEX_URL` to the prod Convex URL. Connect Vercel→Convex via deploy hook so `vercel build` pushes the latest schema.

## 14. Updated build sequence (replaces PRD §8)

1. Convex project + Auth + Resend wiring; bare-bones magic-link login working end-to-end.
2. `convex/schema.ts` committed. Seed script for stadium seats from geometry.
3. Seat map page reads `api.seats.list`. No interactivity yet.
4. `holds.claim` + UI hold flow. Concurrency test passes.
5. Donation flow: tribute draft + privacy toggles + avatar config in client state, then `donations.createSession` action that creates a Stripe Checkout Session and returns `client_secret`.
6. Stripe Embedded Checkout mounted. Success page reads donation by session id.
7. `httpAction` webhook + idempotency + `markPaid` mutation. Webhook test (signature + double-delivery) passes.
8. Receipt email via Resend, scheduled by `markPaid`.
9. Tribute profanity worker. Approved tributes appear on map.
10. Prize draw opt-in page (post-donation only) + free postal entry copy.
11. Counters: total raised, seats sold. Reactive queries.
12. Hardening: rate limit on `claim` and `tributes.submit`. Lighthouse pass. Accessibility pass. Mobile pass.

Each step ships behind a Vercel preview. Open a PR even if Mark is the only reviewer.

## 15. Updated "don't do"

Carry forward everything from `CLAUDE.md` except the Supabase line. Add:

- Don't bypass `getAuthUserId(ctx)` checks by using `internalMutation` for user-triggered flows. `internalMutation` is for cron and webhook fan-out only.
- Don't store Convex `_id` values as strings in your own fields. Always type them with `v.id("table")`.
- Don't stuff multi-step flows into a single mutation when one step is an external call (Stripe, Resend). Mutations must be deterministic — use `action` for I/O, then call mutations from the action.
- Don't use Convex file storage for avatars. Still render from JSON config on the client.
- Don't write a custom session cookie layer. Convex Auth owns it.

## 16. Acceptance criteria delta

PRD §9 + `04-enthuse-pattern-findings.md` §11 still apply. Add:

- Seat hold concurrency test: two simultaneous `claim` calls for the same seat — exactly one wins.
- Webhook idempotency test: same `checkout.session.completed` delivered twice — one seat update, one email.
- Auth: magic-link login round-trips on Vercel preview using a real Resend send.
- Region: Convex deployment confirmed EU in dashboard before go-live.
- No `SUPABASE_*` env var or import remains in the repo at v1 cut.

## 17. Open items, unchanged

- Email sender domain (Mark/Adam)
- Final domain (Mark)
- Prize details and closing date (Adam)

Use placeholders + flags. One env var swap when each lands.

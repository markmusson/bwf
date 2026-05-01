# Blue for Bob — Virtual Seats Platform: Functional Design

> **NOTE:** Sections §2 (stack), §3 (seat layout), §8 (stack table) and §9
> (data model) on this page are SUPERSEDED. Database, auth and realtime
> moved from Supabase to Convex on 2026-04-30 — see `07-convex-pivot.md`.
> Seat layout updated 2026-05-01 to the real Edgbaston geometry (7 stands,
> see `lib/stands.ts`). Multi-claim model (any number of donors per seat)
> replaces the original exclusivity. Wizard sub-steps and prize-draw
> separation in §4 + §6 were locked in `04-enthuse-pattern-findings.md`
> and ARE still current.

**Author:** Mark Musson
**Date:** 29 April 2026
**Status:** Draft v1 — for review with Adam Askew (BWF) before development handoff
**Target launch:** 30 May 2026 ("Blue for Bob Day", Edgbaston)

---

## 1. Product summary

A web app that turns a stylised 2D plan of Edgbaston into a fundraising mechanic: supporters pick a seat, leave a tribute, build an avatar, donate (£10 minimum), and get a shareable seat card. Every donation enters a prize draw. The stadium fills up live as donations come in, creating a visible "we did this together" moment for Blue for Bob Day.

Inspiration: McGrath Foundation Pink Test. Same emotional mechanic, our charity, our event, our seat map.

## 2. Locked-in decisions (post-review with Mark)

| Decision | Choice | Rationale |
|---|---|---|
| Pricing | £10 floor + optional bump (£25 / £50 / custom) | Honours brief intent; lifts AOV without forcing tier choice |
| Identity model | Enthuse pattern: identify yourself OR donate anonymously, both valid | Industry-standard for UK charity giving. Two independent privacy toggles: hide amount, hide name |
| Avatar builder | Full builder in v1 | Approved by Mark — emotional payoff worth the build cost |
| Prize draw | Full draw engine with audit log | Approved by Mark — needed for governance & repeatability |
| Hosting | Build for both standalone and iframe | App must run at `seats.bobwillisfund.org` and inside the existing WordPress iframe pattern |
| Gift Aid | In v1 — full HMRC declaration step | Charity cannot afford to skip 25% uplift |
| Repo | `markmusson/bwf-virtual-seats` (transferable) | Fastest path; transfer to BWF org if/when they want it |
| Timeline | Full v1 by 30 May | Tight. Coding starts week of 4 May. No buffer for unknowns |

## 3. The stadium

The mockup at `bobwillisfund.org/virtualseats` defines our model. It is a 2D top-down rendering of Edgbaston, six stands, drawn as concentric arcs on an HTML5 canvas. Stands and seat counts (from the source):

| Stand | Sub | Tier (mock) | Rows |
|---|---|---|---|
| Eric Hollies Stand | The Famous Stand | Standard | 13 |
| Wyatt Stand | RES Wyatt | General | 7 |
| Stanley Barnes | East Side | Standard | 8 |
| South Stand | Pavilion End | Premium | 10 |
| West Stand | — | Standard | 11 |
| Priory Stand | Family Stand | General | 5 |

Total seats land in the low thousands once seats-per-row is computed by arc length. We keep this geometry — it works, it loads fast, and Adam's team has signed off on the look.

**Brief vs. mock divergence:** The brief says "3D digital version of Edgbaston". The mock is 2D top-down. **Recommendation: keep the 2D plan.** It's faster to render, mobile-friendly, accessible, and it's what Adam's team has already iterated on. A 3D fly-through stadium is a v2 wow-factor, not a launch requirement. I'll flag this back to Adam to confirm.

### 3.1 Seat states

- **Empty** — light blue, claimable
- **Claimed** — dark blue or filled with avatar
- **Held** — yellow (someone else has it in checkout)
- **Selected** — gold pulse (this user)
- **Disabled** — grey (admin-locked, e.g., reserved for a campaign sponsor)

### 3.2 Live filling

Supabase Realtime broadcasts each new claim. Other browsers see the stadium fill up live without refresh. This is the single biggest "feel" moment of the product — when donors see the room around their seat fill while they're paying, the whole thing comes alive.

## 4. User journeys

### 4.1 Primary journey: anonymous supporter donates

1. Land on `/` — hero image, Bob's story snippet, live progress bar (£X raised, N seats filled, M to go), big "Find your seat" CTA.
2. Stadium loads. Pan/zoom on mobile. Tap any empty seat.
3. Modal opens with **6-step wizard** (Enthuse pattern):
   1. **Amount** — £10 default tile, plus £25 / £50 / custom; two privacy toggles ("Hide my donation amount" / "Donate anonymously").
   2. **Details** — name, email; if anonymous: just email for receipt.
   3. **Tribute** — display name (defaults to first name), optional dedication message (max 140 chars), in-memory toggle.
   4. **Avatar** — build it: skin, hair, cap colour, shirt (cricket whites / blue jersey / hoodie), accessory. Or skip and use a default Blue dot.
   5. **Gift Aid** — UK taxpayer? Yes/no. If yes: full HMRC declaration text + address fields + tickbox.
   6. **Pay** — Stripe Embedded Checkout. Apple Pay / Google Pay / card. £10 + bumps + Gift Aid info shown.
4. Stripe processes. Webhook fires. Seat is claimed. User redirected to `/seat/[id]`.
5. Confirmation page: their avatar in their seat, share buttons (X, WhatsApp, Facebook, copy link), prize draw entry confirmation, "donate again" / "find another seat" CTA.

### 4.2 Returning donor (magic link)

The receipt email contains a magic link to `/manage`. Clicking it logs them in (Supabase magic-link auth). They can:
- See all their claimed seats
- Edit display name / tribute (within 24 hours of donation, or always for non-anonymous donors)
- Re-download their seat card
- Re-share

### 4.3 Tribute wall

`/wall` — a chronological feed of all non-anonymous tributes. Each card shows seat, avatar, name, message. Helps SEO, helps emotional pull, drives more conversions. Anonymous tributes show as "A friend" with no avatar identity.

### 4.4 Admin (BWF staff)

`/admin` — basic auth, separate role. Adam, Ricky, Mark.
- Live counters (raised, claimed, gift-aid-eligible, prize entries)
- Per-stand breakdown
- Recent transactions table
- Tribute moderation queue (auto-flagged by profanity filter; manual approve/reject)
- Disable a seat (e.g., refund triggered)
- Run prize draw
- Export donor CSV (Stripe customer ID, email, name, address, gift aid Y/N, amount, seat) for thank-you flows
- Pricing controls (premium/standard/general overrides — already prototyped in mock)

## 5. Avatar system

**Goal:** every claimed seat becomes a tiny human in cricket-day kit.

**Tech approach:** SVG sprite atlas, configuration stored as JSON, rendered client-side. Do **not** store rendered PNGs — too much storage, too slow.

```json
{
  "skin": 2,
  "hair": "buzz-cut",
  "hairColor": "#3a2a18",
  "top": "cricket-whites",
  "topColor": "#ffffff",
  "cap": "navy",
  "accessory": "sunglasses"
}
```

**Builder UI:** wheel-pickers / horizontal scroll on mobile, side-by-side panels on desktop. Live preview to the right. Should feel like Apple's Memoji-lite — fast, fun, ~30 seconds of joy.

**Render cost:** at 12px on the seat map, you can't see fine detail. We render simplified avatars on the canvas (just skin + top + cap), then the full sprite on the seat card and confirmation screen.

**Library options:**
- DiceBear (open source, multiple styles, can self-host) — recommended starting point
- Custom SVG kit by BWF designer — better brand fit but adds a week+

**Recommendation:** start with DiceBear "lorelei" or "pixel-art" tweaked to BWF colours, swap to custom kit in v1.1 if budget allows.

## 6. Prize draw engine

UK prize-draw rules require either skill-based entry, free entry route, or full lottery licence. Charities sidestep this if there's a free entry route. **Hard requirement: free entry route by post must exist.** Adam to provide the postal address for the T&Cs page.

### 6.1 Mechanic

- Every paid donation = 1 entry. Bumps up donations don't grant extra entries (keep it simple, defensible, fair).
- Free entries (postal) are added manually via the admin panel.
- One prize, one winner. Toyota car or whatever Adam confirms.

### 6.2 Draw process

1. Campaign closes. Admin clicks "Run draw".
2. Server-side: pull all `prize_entries` where `eligible = true`. Use a CSPRNG (Node `crypto.randomInt`) to pick one. Persist `prize_draw_results` row with seed, timestamp, winning entry, total entry count.
3. Email the winner. Display public proof (entry count, draw timestamp, winning seat ID — not PII) on the T&Cs page.

### 6.3 T&Cs page

`/prize-terms` — Adam writes copy, we host. Includes:
- Prize details
- Eligibility (UK residents 18+, no employees)
- Free entry route
- Closing date / draw date
- How winner is contacted
- Promoter (BWF charity number)

## 7. Share cards

Every claimed seat gets a unique URL: `/seat/[id]`.

### 7.1 OG image

Generated dynamically by `@vercel/og` (React-based PNG generator). Includes:
- BWF logo
- Donor's avatar (or anonymous placeholder)
- Seat tag ("Eric Hollies Stand · Row 3, Seat 17")
- Tribute message if non-private
- "I'm at Blue for Bob Day. Are you?" overlay
- Edgbaston silhouette

### 7.2 Share buttons

Native Web Share API on mobile (one-tap to anywhere installed). Fallback buttons for desktop: X, WhatsApp, Facebook, Copy link.

### 7.3 Downloadable seat card

PNG export of the same image, slightly higher res, suitable for printing or saving to camera roll.

## 8. Architecture (high level)

```
[ Browser ]
   |
   | (HTTPS, optional iframe parent)
   v
[ Vercel Edge / Next.js App Router ]
   |  pages/* (server components, SSR for /, /wall)
   |  api/* (route handlers — checkout, webhook, admin actions)
   |  /seat/[id]/og.png (Vercel OG dynamic image)
   |
   +-- [ Stripe Checkout ] (hosted/embedded)
   |       webhook --> /api/stripe/webhook
   |
   +-- [ Supabase ]
   |       Postgres (seats, claims, donors, holds, entries, audit)
   |       Auth (magic link for /manage and /admin)
   |       Realtime (broadcast new claims)
   |       Storage (avatar sprite atlas, BWF assets)
   |
   +-- [ Resend / Postmark ] (transactional email)
```

Stack:
- **Next.js 15** (App Router, Server Components, Edge runtime where possible)
- **TypeScript** strict
- **Tailwind v4** + a tiny set of primitives — no UI library bloat
- **Supabase** Postgres + Auth + Realtime
- **Stripe** Embedded Checkout + Webhooks
- **Resend** for transactional email
- **Plausible** (or Vercel Analytics) for funnel
- **Sentry** for error tracking

## 9. Data model (logical)

| Table | Purpose |
|---|---|
| `seats` | One row per seat: id, stand, row, col, x_coord, y_coord, tier, base_price_pence, status |
| `donors` | One per email: id, email, full_name, address fields (for Gift Aid), is_uk_taxpayer, marketing_opt_in, created_at |
| `claims` | The canonical "this seat belongs to this donor": seat_id, donor_id, donation_id, display_name, tribute_message, is_anonymous, is_amount_private, avatar_config (jsonb), claimed_at |
| `donations` | Stripe payment record: id, donor_id, amount_pence, gift_aid, gift_aid_amount_pence, stripe_payment_intent_id, status, created_at |
| `seat_holds` | Soft-lock during checkout: seat_id, session_id, expires_at (10 min) |
| `prize_entries` | One per paid donation + one per postal entry: id, donation_id (nullable for postal), donor_id, source, eligible, created_at |
| `prize_draw_results` | id, drawn_at, winning_entry_id, seed, total_entries |
| `tribute_moderation` | claim_id, status (pending/approved/rejected), flagged_by, reviewed_by, reviewed_at |
| `audit_log` | Generic admin-action log |

Full SQL is in `03-claude-code-prd.md`.

## 10. Concurrency: the seat-locking problem

Two donors hit the same seat at the same time. We must not double-charge or double-claim.

**Pattern:**
1. User clicks seat → `POST /api/holds` creates a `seat_holds` row with `expires_at = now() + 10 minutes`. Postgres unique constraint on `(seat_id) WHERE expires_at > now() AND released = false` enforces single-holder.
2. If the constraint fails (someone else has it), the API returns 409 and the UI says "just gone — try another".
3. User completes Stripe Checkout. Webhook (`checkout.session.completed`) consumes the hold, creates the `claim` and `donation`, releases the hold.
4. If user abandons, the hold expires automatically. A nightly cron sweeps expired holds (cosmetic — the constraint already ignores them).

**Idempotency:** Stripe webhook events are idempotent by `event.id`. We persist seen event IDs and refuse duplicates.

## 11. Mobile-first design

90%+ of donors will be on mobile (Pink Test data backs this). Every screen must work in portrait, one-handed, on a £100 Android.

- Stadium canvas: pinch to zoom, pan with finger; double-tap to zoom into a stand.
- Wizard: full-bleed cards, big tap targets, system keyboard for inputs, no modals-in-modals.
- Avatar builder: swipe between options, no drag-and-drop.
- Stripe Embedded Checkout natively handles Apple Pay / Google Pay — critical for conversion.

## 12. Accessibility

- Stadium has a **list view fallback** (`/seats?view=list`) showing stand → row → seat selectors with screen-reader labels. Same data, no canvas.
- All interactive elements meet WCAG 2.1 AA contrast (BWF blue + white passes).
- Avatar builder has labelled options, not just colour swatches.
- Tribute messages support unicode (emoji, accented characters).

## 13. Open questions for Adam

1. **3D vs 2D** — confirm we keep the 2D top-down plan from the mock. (Recommendation: yes.)
2. **Prize details** — what's the actual prize? Toyota? When confirmed?
3. **Total donation target** — what's the £ goal we display in the progress bar?
4. **Promotional code support** — do we need any (e.g., partner clubs)?
5. **Tribute moderation** — auto-publish with retroactive moderation, or hold for review? (Recommendation: auto-publish with profanity filter, manual review queue for flagged.)
6. **Postal address for free prize entry route** — required for legal compliance.
7. **BWF charity number** — needed for footer + T&Cs.
8. **Final domain decision** — `seats.bobwillisfund.org` or iframe at `/virtualseats`?
9. **Email sender** — `seats@bobwillisfund.org` or different? Need DKIM/SPF set up.
10. **Existing Stripe account** — Mark already invited per Adam's email. Confirm test/live mode access and whether we use a dedicated product/price or just one-shot Payment Intents (recommendation: Payment Intents — simpler).
11. **Sponsor seats** — does BWF want to give a block of seats to a sponsor (e.g., a brand pays £5k for 50 seats with their logo)?

## 14. What this design deliberately leaves out

- 3D rendering of the stadium
- Native mobile apps (web-only)
- Recurring donations (the brief is event-based)
- Donor-to-donor messaging
- Live video or stream integration
- NFTs, blockchain, or any other 2022 nonsense

These could be v2. They will not slip into v1.

---

See `02-brief-evaluation.md` for what's missing from the original brief, and `03-claude-code-prd.md` for the implementation spec ready to feed to Claude Code.

# 07b — Pivot Audit (Supabase → Convex)

Inventory of every Supabase touchpoint in the repo as of `main` HEAD plus
the in-flight stash. Each line cites the section of `07-convex-pivot.md`
that justifies the call. **No code changes made yet** — awaiting your
confirmation per `07-convex-pivot.md` action 2.

## 1. Files importing `@supabase/*`

None on `main`. The Supabase client modules were stashed before they
were ever committed.

In the stash (`stash@{0}` on the abandoned `feat/bwf-1ew-5-supabase-client`
branch):

- `lib/supabase/server.ts` — **DELETE**. 07 §3 ("rip list").
- `lib/supabase/browser.ts` — **DELETE**. 07 §3.
- `lib/supabase/admin.ts` — **DELETE**. 07 §3.

## 2. Files referencing `SUPABASE_` env vars

None in source code on `main`. Documentation references only:

- `design/03-claude-code-prd.md` lines 110–117 (the old `.env.example`
  block). **REWRITE** — replace with the Convex env block from 07 §12, or
  add a header note saying "superseded by 07 §12 for env vars and §5 for
  schema". 07 §13 explicitly replaces the §§ on Supabase. Don't delete
  the file: API copy, build sequence, layout, and acceptance criteria
  outside of Supabase still apply.
- `design/07a-reprompt-for-claude-code.md` and `design/07-convex-pivot.md`
  — the pivot docs themselves; **KEEP**, they're the source of truth.

In the stash:

- `.env.example` — **DELETE the stashed copy**. **REWRITE from scratch**
  using the Convex env block from 07 §12 (`NEXT_PUBLIC_CONVEX_URL`,
  `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, `AUTH_RESEND_KEY`,
  `JWT_PRIVATE_KEY`, `SITE_URL`, Stripe keys, `RESEND_API_KEY`,
  `EMAIL_FROM`).
- `lib/env.ts` and `lib/env.test.ts` — **REWRITE**. The pattern (Zod
  schema + parsed env) is sound and survives, but every Supabase key
  must come out and the Convex keys must come in. Keep zod (still in the
  locked stack and useful here).

## 3. SQL migration files

All three are committed to `main` and pushed to GitHub:

- `supabase/migrations/0001_init.sql` (commit `5012604`) — **DELETE the file**. 07 §3 (rip list, "supabase/ directory") and §5 (Convex schema replaces SQL schema).
- `supabase/migrations/0002_atomic_claim.sql` (commit `d7a71fb`) — **DELETE**. The atomic claim is now `holds.claim` mutation in Convex (07 §7) plus `donations.markPaid` for the webhook fan-out (07 §8).
- `supabase/migrations/0003_enthuse_delta.sql` (commit `18a423a`) — **DELETE**. The marketing-consent timestamp, gift-aid-confirmations JSONB, and claim tag move into the Convex schema in 07 §5 (or are added there if missing — see "Conflicts" below).

All three should disappear in the same delete-PR. Tombstone is the git
history. 07 §3 calls out the whole `supabase/` directory.

## 4. Route handlers / server actions touching Supabase

None on `main`. The repo never had `app/api/stripe/webhook/route.ts` or
any other Supabase-coupled route. Donation wizard at `app/donate/` is
mock UI only — no DB calls.

For Stage 2 work the build sequence changed:

- The webhook becomes a Convex `httpAction` at
  `https://<deployment>.convex.site/stripe/webhook` (07 §8). **Do not**
  build it as a Next.js route handler.
- `GET /api/seats` and PATCH-style seat APIs replaced by Convex queries
  and mutations: `useQuery(api.seats.list)`, `useMutation(api.holds.claim)`,
  etc. (07 §11).

## 5. PRs / branches / stashes in flight

- Branch `feat/bwf-1ew-5-supabase-client` — local only, no commits, no
  remote tracking. **DELETE** the branch.
- `stash@{0}` "WIP T1.5 Supabase client + .env.example" — **DROP**. The
  stash carries `package.json` adding `@supabase/supabase-js` and
  `@supabase/ssr`, plus the four Supabase client files and the
  Supabase-shaped `.env.example`. None survive.
- `package.json` on `main` — clean. The supabase deps were only ever in
  the stash.
- No open PRs on the GitHub repo.

## 6. Beads issues (units of work) Supabase-shaped

Open issues that need rewrite or close-as-superseded under 07 §14:

| ID | Current title | Action | Citation |
|---|---|---|---|
| BWF-yr3.2 | Supabase project bwf-virtual-seats in eu-west-2 | **REWRITE** → "Convex project, EU region, Auth + Resend wired" | 07 §13 step 1, §2 (region) |
| BWF-1ew.5 | Supabase client wiring (server + browser) + .env.example seeded | **REWRITE** → "Convex client wiring (`ConvexReactClient` + `ConvexProvider`) + .env.example with Convex block" | 07 §4, §12 |
| BWF-1ew.9 | RLS policies + smoke tests | **CLOSE-as-superseded**. RLS doesn't exist in Convex; auth lives in `getAuthUserId(ctx)` checks inside mutations. Replace with "Auth-gating tests for public mutations". | 07 §5, §15 |
| BWF-1ew.11 | Seed script — generate ~3500 seats from geometry | **REWRITE** → "Convex seed action that bulk-inserts seats from `buildAllSeats`. Idempotent: skip rows where seat already exists by `(stand, row, num)`." | 07 §5, §14 step 2 |
| BWF-1ew.12 | v_seat_status + v_campaign_stats views applied + read smoke test | **CLOSE-as-superseded**. No views in Convex. Replace with "Convex query `seats.list` returns seat + status; counters are reactive queries" | 07 §11, §14 step 11 |
| BWF-1ew.13 | GET /api/seats endpoint (cached, revalidate=2) | **CLOSE-as-superseded**. Replaced by `useQuery(api.seats.list)` — Convex keeps it live. | 07 §11 |
| BWF-1ew.14 | StadiumCanvas component renders empty seats from v_seat_status | **REWRITE** title only — same component, new data source (`api.seats.list`). | 07 §11 |
| BWF-f2o.x (Stage 2 cluster) | Holds API, webhook, idempotency, fn_complete_claim, etc. | **REWRITE** — all of these become Convex shapes (mutations, httpAction, scheduled functions). The build sequence in 07 §14 reorganises Stage 2 entirely. Best path: close all the Stage 2 tasks and re-create from the new build sequence. | 07 §7, §8, §14 |
| BWF-jsa.13 | Database backup verified (Supabase Pro) | **REWRITE** → "Convex point-in-time recovery / scheduled snapshots verified." | (not in 07; Convex docs cover it) |

Closed issues — for the record, do not reopen:

- BWF-1ew.6, BWF-1ew.7, BWF-1ew.8 (the three SQL migrations) — kept
  closed; the artifacts they produced get deleted by the rip-list PR. No
  re-issue needed; their replacement is `convex/schema.ts` (one task,
  rewritten under BWF-yr3.2 / new Stage 1).

## 7. Code that survives the pivot

For completeness, these were touched in this session and **KEEP**
unchanged:

- `lib/geometry.ts`, `lib/stands.ts`, `lib/geometry.test.ts`,
  `lib/stands.test.ts` — pure math + data, no DB or auth coupling.
- `lib/money.ts`, `lib/money.test.ts` — integer-pence formatter, matches
  07's "money is integer pence everywhere".
- `app/donate/DonationWizard.tsx`, `.test.tsx`, `app/donate/page.tsx` —
  mock UI, no DB calls. Will swap to `useMutation`/`useQuery` when Stage
  2 lands.
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — UI / Tailwind
  tokens.
- `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`,
  `.prettierrc.json`, `.prettierignore`, `tsconfig.json`, `eslint.config.mjs`.
- `.github/workflows/ci.yml` — keeps lint/typecheck/test/build. Will add
  a `convex deploy` step later (07 §13 step 4).
- `tests/e2e/smoke.spec.ts` — survives.
- `AGENTS.md`, `CLAUDE.md` (with caveat below).
- `BWF-fx2` (the seat-count flag) — still relevant.

## 8. Conflicts — please resolve before I act

These are the spots where the pivot doc looks underspecified or
inconsistent with the design pack. Flagging per your action 2.

1. **Convex schema vs the Enthuse-pattern delta from `04` §4–§5.**
   `07-convex-pivot.md` §5 defines `donations` with `giftAid: boolean`
   only. `04` §5 mandates recording the three HMRC confirmations
   (`uk_taxpayer`, `own_money`, `no_benefit`) in a JSONB so we can
   reproduce the declaration if HMRC asks. `04` is locked. **Should I
   add `giftAidConfirmations` (object with three booleans + declaredAt)
   to `donations` in the Convex schema?** I think yes, but the pivot
   doc didn't restate the requirement.

2. **Marketing consent timestamp.** `04` §4 requires
   `marketing_consent_recorded_at` plus a tri-state opt-in (yes / no /
   not-asked). `07-convex-pivot.md` §5 doesn't define a `users` /
   `donors` table — auth tables come from `authTables`, and the
   donation row is the only donor-shaped record. **Where does
   `marketingOptIn` and its timestamp live?** Two candidates: extend
   `users` via `authTables` overrides, or attach to `donations` per
   donation. The donation site is cleaner since consent is captured at
   donate-time; flag your preference.

3. **Sponsor / memorial tag.** `06-locked-from-adam.md` keeps a `tag`
   column open on claims for sponsor blocks. `07-convex-pivot.md` §5
   doesn't carry it. The locked decision in `06` is "one column, ten
   minutes". Suggest adding `tag: v.optional(v.string())` to either
   `donations` or a future `claims` table. **Confirm.**

4. **`claims` table absence.** `07-convex-pivot.md` §5 has no `claims`
   table — claims-shaped data is folded into `donations.seatId` and
   `donations.displayName`. PRD §4 had a separate `claims` table. The
   fold-in is fine, but it means `tributes.donationId` is the join
   anchor for tribute-on-seat lookups, and "edit my tribute later"
   becomes "update tribute row by donation". **Confirm this is the
   intended shape.** If yes, the donor edit flow drops; if no,
   reintroduce a `claims` table.

5. **Tribute storage.** `07-convex-pivot.md` §5 puts `tributes` in its
   own table and §9 says profanity check flips status. That's fine for
   moderation, but the wizard currently captures tribute text in the
   donation step (PRD §4 wizard order, kept by `04` §2). When does
   `tributes.submit` fire — before payment (pending, no donation yet)
   or after? §8 says "If a tribute was submitted as `pending` linked to
   this donation, leave it for the profanity worker." That implies
   tribute is submitted before payment with a linkable id. The schema
   has `tributes.donationId` as required. **Pre-payment, do we create
   the donation row with `status: "pending"` first, write the tribute
   referencing it, then update on webhook? Or attach tribute to the
   donation post-payment?** I lean towards the former (create
   `donations: pending` at hold-time so the tribute can reference it),
   but want your call before I build it.

6. **`hideName` vs `is_anonymous`.** `07-convex-pivot.md` §5 has
   `hideName`. `04` §6 says two independent toggles: hide name, hide
   amount. The schema already has `hideName` and `hideAmount`. Naming
   delta only. **OK to use 07's names everywhere.**

7. **CLAUDE.md.** Lines 22, 42, 44, 54, 56 reference Supabase / RLS.
   You said "re-read CLAUDE.md" but didn't say "rewrite". I think
   CLAUDE.md needs a small edit: drop the "RLS enabled" line, replace
   "Supabase typed client and raw SQL" with "Convex schema and
   queries", swap "Supabase" for "Convex" in the locked-stack line.
   **Want me to do that as part of the rip-list PR, or hold off?**

## 9. Proposed first PR (the rip)

If you confirm 1–6 above, the first PR after this audit lands as a
single delete-and-rewrite-docs commit:

- Delete `supabase/` (3 files).
- Delete the stash and the dead branch.
- (Optional, on your call) Patch `CLAUDE.md` and `design/03-claude-code-prd.md`
  with "superseded by 07" notes on the relevant sections.
- Update `.env.example` to the Convex block.
- Rewrite the Supabase-shaped beads issues per the table in §6.

That clears the deck. Subsequent PRs follow `07-convex-pivot.md` §14
step 1 onwards.

## 10. What I won't touch in this audit

- The stash and branch stay until you confirm.
- No code edits anywhere — only this document.
- No beads rewrites — only the proposal above.

## 11. Decisions (2026-04-30, signed off by Mark with "go")

Concrete calls on the conflicts in §8. These now bind the schema and
the rip-list PR.

1. **`giftAidConfirmations` on `donations`.**
   `v.optional(v.object({ ukTaxpayer: v.boolean(), ownMoney: v.boolean(),
   noBenefit: v.boolean(), declaredAt: v.number() }))`. Kept optional so
   non-Gift-Aid donations leave it unset. Set when the donor ticks the
   Gift Aid path in the wizard. Source: `04 §5`.

2. **Marketing consent on `donations`.** Two new optional fields:
   `marketingOptIn: v.optional(v.boolean())` (tri-state via optional —
   absence = "not asked", false = explicit no, true = explicit yes) and
   `marketingConsentRecordedAt: v.optional(v.number())`. Captured at
   wizard step 3 (Personal info). Source: `04 §4`, ICO defensibility.

3. **`tag` on `donations`.** `tag: v.optional(v.string())`. Sponsor and
   memorial flagging without a separate table. Source: `06`.

4. **No `claims` table.** Confirmed. Seat ownership lives on
   `donations.seatId` + `donations.displayName`. Donor edits update the
   `donations` row directly (display name, hide flags, avatar config)
   and the linked `tributes` row (text — re-triggers the profanity
   worker). Source: `07 §5`.

5. **Tribute pre-payment, written via `donations.createSession`.** The
   Convex action that creates the Stripe Checkout Session also creates
   a `donations` row with `status: "pending"` and a `tributes` row with
   `status: "pending"` linked to it, both in a single mutation called
   from the action. Webhook flips donation to `paid` on
   `checkout.session.completed`. Profanity worker scans pending
   tributes on a schedule. Magic-link auth gate is at the wizard's
   email step (07 §14 step 1) — donor is authenticated before any
   write. Source: `07 §8`.

6. **CLAUDE.md.** Rewritten on 2026-04-30 to drop Supabase / RLS, add
   Convex / Convex Auth, add the 07-specific don't-do's.

These plus 07 §5 give the final `donations` shape:

```ts
donations: defineTable({
  userId: v.id("users"),
  seatId: v.optional(v.id("seats")),
  amountPence: v.number(),
  currency: v.literal("GBP"),
  giftAid: v.boolean(),
  giftAidConfirmations: v.optional(v.object({
    ukTaxpayer: v.boolean(),
    ownMoney: v.boolean(),
    noBenefit: v.boolean(),
    declaredAt: v.number(),
  })),
  hideName: v.boolean(),
  hideAmount: v.boolean(),
  displayName: v.optional(v.string()),
  avatarConfig: v.optional(v.string()),
  marketingOptIn: v.optional(v.boolean()),
  marketingConsentRecordedAt: v.optional(v.number()),
  tag: v.optional(v.string()),
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
```

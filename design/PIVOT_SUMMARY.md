# BWF Virtual Seats — design pack reading order (2026-05-01)

This pack was written before and during a stack pivot. Read in this order
to avoid bouncing between superseded sections:

## What's still current (read first)
1. **`README.md`** — index of the pack
2. **`01-functional-design.md`** §1, §4, §5, §6, §7 — what we're building, who it's for, the wizard, avatar, prize draw. *(Skip §2/§3/§8/§9 — superseded.)*
3. **`02-brief-evaluation.md`** — what was missing from the original brief. Still load-bearing.
4. **`04-enthuse-pattern-findings.md`** — Gift Aid, marketing consent, prize-draw separation. All implemented.
5. **`06-locked-from-adam.md`** — confirmed values from the client (charity number, target, postal address).
6. **`07-convex-pivot.md`** — the database / auth / realtime layer. **This is the current spec for the data tier.** Read before any code change in `convex/`.
7. **`07b-pivot-audit.md`** — schema additions locked into `convex/schema.ts`. Reference for marketing consent + Gift Aid confirmation fields.

## What you can skim or skip
- **`03-claude-code-prd.md`** — most sections superseded by 07. The header banner on the file lists which subsections to skip. Still useful for §6 (Stripe webhook semantics), §10–§12 (architectural rules).
- **`05-setup-checklist.md`** §2–§7 — Supabase setup, archived. §1, §8, §9, §10 still valid.

## Archived (do not follow)
- **`design/archive/07a-reprompt-for-claude-code.md`** — one-shot prompt used to brief Claude Code on the pivot.

## Source-of-truth files in code
- `convex/schema.ts` — data model
- `convex/{seats,donations,holds,tributes,prizeDraw,webhooks,stripe}.ts` — core flows
- `lib/stands.ts` — Edgbaston seat geometry (real layout, 7 stands)
- `app/{stadium,wall,seat/[slug],thanks,manage,admin}` — UI flows
- `docs/qa-status-2026-05-01.md` — most recent QA pass

## What changed in the pivot
- **Database & realtime:** Supabase Postgres → Convex.
- **Auth:** Supabase magic-link → Convex Auth's Resend provider; deferred so
  visitors can claim and donate without signing in (Stripe email creates
  the user via webhook find-or-create).
- **Rate limiting:** Upstash Ratelimit → Convex `rateLimit.ts` (fixed-window
  table-driven counter).
- **Seat model:** one-donor-per-seat exclusivity → multi-claim
  (`seats.claimedCount`); the wall groups tributes by seat.
- **Geometry:** mock v4 6-stand layout → real Edgbaston 7 stands (added
  Raglan; moved Hollies east behind the River Rea; Wyatt is City End north).

## What did NOT change
- Stack: Next.js 15 App Router, TypeScript strict, Tailwind v4, Stripe
  Embedded Checkout, Resend (transactional), Vercel.
- The donor wizard order, avatar JSON config approach, prize-draw
  separation, Gift Aid HMRC fields, marketing-consent tri-state,
  privacy toggles (hide name / hide amount).
- 2D top-down stadium plan rendered on canvas.
- £10 minimum donation in pence everywhere; per-tier minimums (£25
  standard / £50 premium) enforced at the Stripe action and at the
  donations.createDraft mutation.

## Anything not in code yet
See `docs/qa-status-2026-05-01.md` §7 for the acceptance-criteria scoreboard.
Headline gaps: OG share images per seat (in flight), Lighthouse audit
(not started), admin refund tool (manual via Stripe dashboard for now),
real Resend send on preview (gated on Adam confirming sender domain).

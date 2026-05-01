# Setup Checklist — GitHub, Vercel, Supabase, Stripe, Resend

> **STATUS NOTICE:** §2–§7 (Supabase project, migrations, RLS, seed) are
> ARCHIVED. The Convex setup replaces them — follow `07-convex-pivot.md`
> §13 instead. §1 (accounts), §8 (Stripe), §9 (CI/CD) and §10 (smoke test)
> on this page remain valid.

> **Partial supersession.** The Supabase project + RLS sections in `§2` and the deploy steps that referenced Supabase env vars in `§8` are replaced by `07-convex-pivot.md §13`. Convex deployment region is **EU** — set at project creation. Stripe webhook now points at `https://<deployment>.convex.site/stripe/webhook`. Sentry was dropped earlier. Upstash is dropped — Convex's own rate limiter component handles per-user limits if we need them. Everything else (GitHub, Vercel, Stripe, Resend, getaddress.io, the smoke-test card flow) still applies.

Run through this before kicking Claude Code at the codebase. ~90 minutes if everything goes smoothly.

## 0. Pre-flight (10 min)

- [ ] Confirm Stripe account access — log into the BWF Stripe dashboard with the invite Adam sent
- [ ] Confirm domain ownership / who controls DNS for `bobwillisfund.org` (Adam? Ricky?)
- [ ] Confirm BWF charity number (footer + T&Cs)
- [ ] Decide repo name: `bwf-virtual-seats` (recommended)

## 1. GitHub repo (10 min)

```bash
# Local
mkdir bwf-virtual-seats && cd bwf-virtual-seats
git init -b main
gh repo create markmusson/bwf-virtual-seats --private --source=. --description "Blue for Bob virtual seats fundraising platform"
```

- [ ] Repo created (private)
- [ ] Add `.gitignore` (Node template + `.env*` + `.vercel`)
- [ ] First commit: `chore: scaffold` with the design folder + a minimal `README.md` pointing at the design docs
- [ ] Add Adam (`adam@bobwillisfund.org`) and Ricky (`ricky@bobwillisfund.org`) as collaborators with read access — they don't need to push but they should be able to track issues
- [ ] Branch protection on `main`: require PR, require status checks (set up after CI is wired)

## 2. Supabase project (15 min)

Create at [database.new](https://database.new) (Vercel-Supabase integration shortcut).

- [ ] New project: `bwf-virtual-seats`, region `eu-west-2` (London) for GDPR / latency
- [ ] Save the project ref + service role key + anon key to a password manager
- [ ] Enable email auth (magic link only)
- [ ] Disable signup if you want to lock the magic-link to known emails — leave open for v1, donors need it
- [ ] In SQL editor, run the migrations from `03-claude-code-prd.md` §4 in order:
  - `0001_init.sql`
  - `0002_atomic_claim.sql`
  - migration delta from `04-enthuse-pattern-findings.md` §4–5
- [ ] Run the seed script (once Claude Code has scaffolded `supabase/seed.ts`)
- [ ] Verify ~3500 rows in `seats`
- [ ] Set up daily database backup (Supabase Pro tier)

## 3. Stripe configuration (15 min)

In **test mode** first.

- [ ] Get test API keys (Publishable + Secret). Save to password manager.
- [ ] Create webhook endpoint pointing at `https://YOUR_VERCEL_PREVIEW.vercel.app/api/stripe/webhook`. Save the signing secret.
- [ ] Subscribe webhook to events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] In Branding, upload BWF logo + accent colour (`#0085CA`) — applied to Stripe-hosted Checkout fallback
- [ ] In Public details, set business name "The Bob Willis Fund", description, support email
- [ ] **Live mode:** repeat after a successful end-to-end test in test mode. Different keys, different webhook, separate from test data.

## 4. Resend (transactional email) (10 min)

- [ ] Create Resend account, free tier OK for v1
- [ ] Add sending domain — start with `bobwillisfund.org` (need DNS access from Ricky) or use a subdomain like `mail.bobwillisfund.org`
- [ ] Set up DKIM, SPF, DMARC records in DNS — Resend gives you the exact records
- [ ] Verify domain (can take up to 24h to propagate)
- [ ] Get API key, save to password manager
- [ ] Create email templates: receipt, magic-link login, prize-draw winner notification
- [ ] Test send to your own inbox

## 5. Address lookup (5 min)

- [ ] Sign up at getaddress.io
- [ ] Get an API key (free tier covers 30 calls/day; £15/month for 1000/day — go straight to paid)
- [ ] Save key — server-side use only

## 6. Sentry (5 min)

- [ ] Create Sentry project: `bwf-virtual-seats`
- [ ] Get DSN
- [ ] Save auth token (for source maps in deploy)

## 7. Upstash Redis (rate limiting) (5 min)

- [ ] Create Upstash Redis database — Vercel integration is the easiest path
- [ ] Auto-syncs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into Vercel env vars

## 8. Vercel project (15 min)

- [ ] `vercel link` from the local repo, or import via Vercel dashboard
- [ ] Project name: `bwf-virtual-seats`
- [ ] Connect GitHub repo (auto-deploy on push to `main`, preview on PRs)
- [ ] Add all env vars from `.env.example` (paste in production values for live keys; preview keys are OK for previews)
- [ ] Enable Vercel Analytics
- [ ] Set up Edge Config for runtime feature flags (optional for v1)

### Domain options

**Option 1 (recommended): subdomain.**
- Add `seats.bobwillisfund.org` in Vercel domains
- Vercel gives you a CNAME — Ricky adds it to the DNS provider
- Wait for SSL provisioning (~5 min)

**Option 2: iframe at `/virtualseats`.**
- Keep WordPress page as is (already iframes a static HTML)
- Update the `src=` to the Vercel URL or subdomain
- Test resize via postMessage works inside the iframe
- Ensure cookies use `SameSite=None; Secure`

Build for both. Decide on launch which is the public face.

## 9. CI / CD on the repo (10 min)

Add `.github/workflows/ci.yml`:

- [ ] On PR: lint, typecheck, test (unit + integration), build
- [ ] Vercel handles deploy preview automatically

Optional but cheap:
- [ ] Snyk or GitHub Dependabot for dependency scanning
- [ ] CodeQL for security scanning

## 10. Test card flow before handing off

End-to-end smoke test using Stripe test card `4242 4242 4242 4242`:

- [ ] Pick a seat
- [ ] Complete the wizard (with Gift Aid)
- [ ] Land on confirmation page
- [ ] Receive email receipt
- [ ] Verify claim row in DB
- [ ] Verify donation row with `gift_aid_amount_pence = 25%` of donation
- [ ] Verify NO prize_entry row (created on opt-in only)
- [ ] Click "Enter the prize draw (free)" — verify prize_entry row created
- [ ] Click magic link in receipt — verify `/manage` works and tribute is editable

If all checks pass, the platform is ready to switch from test to live.

## 11. Pre-launch (the day before 30 May)

- [ ] Stripe live keys swapped in
- [ ] DNS propagated
- [ ] Lighthouse audit (mobile) ≥ 85 perf, ≥ 95 a11y
- [ ] Privacy / Terms / Prize Terms pages live with Adam's final copy
- [ ] BWF charity number in footer
- [ ] Real donation test by Adam with a real card (then refund it)
- [ ] On-call rotation for launch day: Mark + Adam + Ricky reachable
- [ ] Sentry alert thresholds set (>5 errors/min triggers a phone call)
- [ ] Database backup verified

## 12. Launch day (30 May)

- [ ] Soft launch in the morning to a small list (Adam's team, maybe friends)
- [ ] Watch first 10 transactions: receipts arriving, claims appearing, prize entries opt-in flow working
- [ ] Public launch by lunchtime
- [ ] Monitor Sentry, Stripe dashboard, Supabase metrics through the day

## 13. Post-launch (week of 1 June)

- [ ] Send first donor thank-you batch (Adam owns)
- [ ] Run prize draw at campaign end (admin button)
- [ ] Notify winner
- [ ] Export final donor CSV for BWF CRM
- [ ] Retro: what worked, what didn't, what's the v2 backlog

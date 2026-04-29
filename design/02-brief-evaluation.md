# Brief Evaluation: What's Missing

Adam's brief is sound on intent — the emotional mechanic, the inspiration, the user journey. But it's a marketing brief, not a build spec. Here's what would have bitten us if we'd taken it at face value and started coding.

## What the brief got right

- The Pink Test analogy is the right reference point. It's a proven mass-participation mechanic with the same emotional logic.
- The 6-step user journey (land → select → tribute → donate → enter draw → share) is clean and correct.
- The £10 anchor price is the right floor.
- "Simple, scalable, emotional" is the right north star.
- Identifying the avatar layer as **optional** showed sensible scope discipline (which Mark has overridden — fine, but worth flagging that the brief writer was right to question it).

## What the brief left out — and why each matters

### Compliance and legal

- **Gift Aid.** UK charity. Donors who tick a box generate +25% from HMRC at no cost to the donor. Not having this in v1 means leaving £25k on the table per £100k raised. **Critical.**
- **Prize draw legal compliance.** UK rules require a free entry route, T&Cs, named promoter, draw audit. Without these the draw is illegal as a lottery. **Critical.**
- **GDPR.** Privacy notice, lawful basis for processing, data retention policy, right to erasure, donor data export on request. The mock has none of this. **Critical.**
- **PCI compliance.** Solved by using Stripe Checkout (PCI scope shifts to Stripe), but worth saying out loud — never store card numbers, never log them.
- **Charity registration display.** Footer must show the BWF registered charity number per Charity Commission rules.
- **Cookie consent.** UK PECR / GDPR. If we're using analytics, we need a banner. Simplest path: no cookies until consent.
- **Refund policy.** What happens when a donor changes their mind? When their card is fraud-reversed? Is the seat re-released? This needs a written policy *before* it's tested in anger.

### User & content protection

- **Tribute moderation.** Someone *will* try to write something racist, obscene, or libellous on a tribute. We need a profanity filter (auto-block obvious cases) and a human moderation queue (for edge cases). Without this, the BWF brand sits on top of every tribute regardless of content.
- **Abuse: rate limiting.** Bots will hit the form. Need rate limiting on holds, donations, tributes per IP. Vercel WAF + Upstash Ratelimit handles this.
- **Reservation timeout / seat squatting.** Brief doesn't address what happens if a user holds a seat and walks away. We need a 10-min hold expiry (covered in design doc).

### Technical concerns the brief is silent on

- **Concurrency.** Two donors clicking the same seat at the same instant must result in exactly one charge and one claim. The brief says nothing; we have to design for it (covered in design doc §10).
- **Mobile-first design.** Brief doesn't say "mobile". 90%+ of donors will be on mobile. Every interaction has to work one-handed in portrait.
- **Accessibility.** A canvas-based stadium is invisible to screen readers. We need a parallel list-view route (`/seats?view=list`) for WCAG 2.1 AA compliance and basic decency.
- **Internationalisation.** Currency is £, content is English. If non-UK donors want in, we need to handle currency conversion in Stripe and clarify Gift Aid eligibility (UK taxpayers only).
- **Performance budget.** A "full stadium" with thousands of seats and avatars must render on a £100 Android in < 3s. The mock canvas approach is the right call but it needs perf testing once avatars are layered in.
- **Email deliverability.** "Receive shareable confirmation" implies a transactional email that has to land in inboxes, not spam. Needs DKIM/SPF set up on `seats.bobwillisfund.org` or chosen sender domain. Not glamorous, kills the campaign if missed.

### Operational

- **Admin / back-of-house.** The brief assumes the platform runs itself. It doesn't. BWF need a dashboard to: monitor revenue, moderate tributes, handle refunds, run the prize draw, export donor data for thank-you flows, override prices, disable seats.
- **Thank-you flow.** What happens after the campaign? Donors expect a thank-you, often a year-end summary. Brief is silent. We need a CSV export at minimum so BWF's existing CRM/email tools can pick it up.
- **Analytics.** What does success look like? Conversion rate from land → seat → donate, drop-off per wizard step, traffic source. Plausible or Vercel Analytics — cheap, GDPR-friendly.
- **Monitoring & alerting.** Stripe webhook fails silently → seats never get claimed → donors get charged but no seat. We need Sentry on errors and a low-effort uptime check.

### Brand and content

- **Storytelling.** The mock is visually strong but emotionally thin. Bob's story, what the money funds, why prostate cancer, the 1982 connection — all need a content layer. Adam's team likely has this in other materials but it doesn't appear in the brief.
- **Copy ownership.** Who writes microcopy (form labels, error messages, success states)? This is a real time sink if it isn't named.
- **Photography.** The asset pack has Getty images — licensing scope check needed before they go on a public-facing fundraising page.

### Project / process

- **Acceptance criteria.** Brief says "live by 30 May" but doesn't define "live". Friends-and-family beta? Public launch? Targeted at how many concurrent users? These define different builds.
- **Load expectations.** Pink Test does hundreds of thousands of transactions a year. BWF's first run will likely be far less. **Recommendation: design for 10k seats, peak 200 concurrent users on day one.** Vercel + Supabase free/Pro tier handles this comfortably.
- **Decision-maker on edge cases.** When a seat goes wrong, when a tribute is borderline, when a refund comes in — who decides? Adam? Ricky? Suggest naming a single decision-maker pre-launch.

## Brief improvements I'd send back to Adam

In one paragraph for an email:

> The brief is great on the "what" and the emotional pull — clear win. Five things I'd add before we go: (1) Gift Aid — non-negotiable, 25% revenue uplift on UK donors, needs HMRC declaration in the wizard; (2) Prize draw needs free-entry-route + named promoter + T&Cs page or it's an illegal lottery — can you write copy, or shall I draft? (3) Tribute moderation — someone will write something we have to remove; want auto-publish with a moderation queue, or hold-for-review? (4) BWF admin dashboard — you and Ricky will need a way to monitor, moderate, refund, export, and run the draw; I'll spec it; (5) Donor identity model — going with Enthuse-style: identify or anonymous, two privacy toggles ("hide amount", "hide name") — confirm OK. I've kept 2D top-down rendering (the mock) rather than the 3D the brief mentioned — it's faster, mobile-friendlier, ships in time. Will flag if you want to revisit.

## Risk register (top 5 by likelihood × impact)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe webhook fails silently → charged donors with no seat | Medium | High | Sentry alerting, idempotent retry, manual reconciliation runbook |
| Tribute moderation — a slur lands on the public wall during a media moment | Medium | High | Profanity filter + auto-quarantine flagged terms + on-call moderator for launch week |
| Avatar builder ships late, blocks launch | Medium | Medium | Cut scope to DiceBear default, swap to custom kit post-launch |
| Concurrent claims double-book a seat | Low | Medium | Postgres unique constraint + 10-min holds (covered in design) |
| Mobile performance bad on cheap Android | Medium | Medium | Canvas perf budget, list-view fallback, real-device testing in week of 18 May |
| Prize draw legal challenge | Low | High | Adam-approved T&Cs, free entry route, charity legal sign-off before launch |
| Domain / iframe / CORS surprises | Medium | Low | Build for both standalone and iframe from day 1 (postMessage resize, careful cookies) |

## What I'd cut if the date slips

If by 20 May we're behind, ship in this order (most important first):

1. Stadium + seat picker + £10 donation + Stripe + Gift Aid + receipt email — **must ship**
2. Tribute message + display name + privacy toggles
3. Avatar builder
4. Prize draw engine (defer winner draw — can pick manually post-campaign)
5. Tribute wall (`/wall`)
6. Share cards / OG images
7. Live realtime fill
8. Admin dashboard polish (basic SQL access is enough for day 1)

The first three are the campaign. Everything else is enhancement.

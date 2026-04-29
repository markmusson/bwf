# BWF Virtual Seats — Design Pack

Everything Claude Code needs to build the platform, plus everything you need to set up the infrastructure.

## Read in this order

1. **[01-functional-design.md](./01-functional-design.md)** — what we're building, who it's for, the user journeys, the architecture sketch.
2. **[02-brief-evaluation.md](./02-brief-evaluation.md)** — what was missing from Adam's brief, the risk register, what to cut if the date slips.
3. **[03-claude-code-prd.md](./03-claude-code-prd.md)** — the implementation spec: stack, repo layout, full SQL schema, API contracts, build sequence, acceptance criteria.
4. **[04-enthuse-pattern-findings.md](./04-enthuse-pattern-findings.md)** — updates after reviewing the live Enthuse flow. **Read this before §4 of the PRD — it changes the wizard structure, schema, and prize-draw mechanic.**
5. **[05-setup-checklist.md](./05-setup-checklist.md)** — GitHub, Vercel, Supabase, Stripe, Resend setup. ~90 minutes end to end.
6. **[06-locked-from-adam.md](./06-locked-from-adam.md)** — Adam's confirmed answers (29 April). Charity number, target, address, moderation policy, image rights all locked. Read after the others to see what's now decided.

## TL;DR for someone who only has 60 seconds

- A 2D top-down stadium plan of Edgbaston with ~3,500 seats. Donors pick a seat for £10 (with optional bumps to £25/£50/custom), leave a tribute, build an avatar, donate via Stripe, opt in to a free prize draw on the confirmation page.
- Stack: Next.js 15 + Supabase + Stripe + Resend on Vercel.
- Identity model: Enthuse-style — identify yourself or stay anonymous, with two independent privacy toggles.
- Gift Aid: full HMRC declaration in v1. Worth £25 per £100 — non-negotiable.
- Prize draw: legally separate from the donation (mandatory to keep Gift Aid valid). Free post-donation opt-in.
- Live by 30 May 2026 for Blue for Bob Day at Edgbaston.

## Open questions for Adam (consolidated)

1. Confirm 2D top-down (mock) over 3D (brief)
2. Final prize details (Toyota?) and closing date
3. Total donation goal for the progress bar
4. Promotional/sponsor codes needed?
5. Tribute moderation: auto-publish + queue, or hold-for-review?
6. Postal address for prize-draw free entry route
7. BWF registered charity number
8. Final domain choice: subdomain or iframe
9. Email sender domain + DKIM/SPF access
10. Stripe: confirm test access, decide test/live cutover date
11. Sponsor seat blocks needed?
12. Confirm prize-draw model (separate post-donation opt-in)
13. Marketing preferences copy
14. Final Gift Aid HMRC wording sign-off

## File map

```
BWF/
├── design/                          ← this folder
│   ├── README.md
│   ├── 01-functional-design.md
│   ├── 02-brief-evaluation.md
│   ├── 03-claude-code-prd.md
│   ├── 04-enthuse-pattern-findings.md
│   └── 05-setup-checklist.md
├── blue-for-bob-v4.html             ← visual / geometry reference
├── Asset Pack PCUK/                  ← brand assets, photography
├── Brief - Virtual Seats.eml         ← original brief
└── *.eml                             ← email thread with Adam & Ricky
```

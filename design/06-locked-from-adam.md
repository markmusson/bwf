# Locked Answers from Adam — 29 April 2026

Adam came back on the 10 questions. This file is the source of truth and supersedes any open question in the earlier docs.

## Locked

| # | Item | Value |
|---|---|---|
| 1 | Prize-draw split | Confirmed. Build it as a free post-donation opt-in. |
| 2 | BWF charity number | **1185346.** Administered by The Talent Fund, registered in England & Wales. Footer line: "The Bob Willis Fund is administered by The Talent Fund, registered charity 1185346." |
| 3 | Free postal entry address | The Bob Willis Fund, c/o Stafford House, 10 Prince Of Wales Road, Dorchester, Dorset, DT1 1PW |
| 5 | Fundraising target | £20,000 — show in the progress bar. |
| 6 | Tribute moderation | Auto-publish, profanity filter, queue for flagged content. |
| 10 | Getty images rights | BWF holds rights for public web use. |

## Still open

| # | Item | What's missing | Build impact |
|---|---|---|---|
| 4 | Prize confirmed (Toyota?) and closing date | Adam expects within two weeks | None on the build. T&Cs page renders "Prize: TBC, confirmed by DATE" until known. |
| 7 | Domain | Adam wants both built. Concerns about BWF server bandwidth on iframe option | Build for both. See recommendation below. |
| 8 | Email sender | Adam suggested `seats@bobwillisfund.org` (typo "bobwillisfun.or" in his email — confirm before DNS work) | Resend setup blocked until decided. |
| 9 | Sponsor block purchases | Not confirmed but Adam wants the option | Keep data model open. Defer admin UI for v1. |

## Recommendations on the open three

### Domain — pick the subdomain

The bandwidth concern actually argues *for* the subdomain, not against it.

- **Subdomain (`seats.bobwillisfund.org`)** — DNS CNAME points at Vercel. BWF's WordPress server never sees a single donor request. Zero bandwidth on their side. Better OG share previews. Better deep links. Cleaner cookies.
- **Iframe at `/virtualseats`** — every donor loads the WordPress page first, *then* the Vercel iframe. WP server takes one extra hit per donor. Resize quirks. Some social platforms strip iframe content from previews.

Build for both, ship the subdomain. The iframe page can stay as a fallback that just redirects to the subdomain.

### Email sender — `seats@bobwillisfund.org` via Resend

Confirm the domain spelling with Adam (his email said "bobwillisfun.or" — assume typo). Setup:

- Resend sends from `seats@bobwillisfund.org`.
- Ricky adds DKIM, SPF, DMARC records to the bobwillisfund.org DNS — Resend gives the exact records.
- Doesn't touch their existing Google Workspace inboxes. No risk of breaking their day-to-day mail.

If Ricky's DNS access is awkward, fallback is `seats@mail.bobwillisfund.org` on a fresh subdomain — even less risk to their main mail.

### Sponsor seats — keep the door open, build nothing extra

The schema already supports this. A sponsor is just a donor with a non-personal `display_name` and a bulk of claims. Two things to do:

1. Add a `tag` column on `claims` for things like `'sponsor'`, `'memorial'` — useful later, costs nothing now.
2. When a sponsor turns up, run a one-off SQL script to claim a block in their name. No admin UI needed for v1.

Total build cost: one column, ten minutes. Future-proofs without bloating the launch.

## Address typo flag

Adam's email has "10 Prince Of Wales Road" twice in the address. Treating the canonical form as:

> The Bob Willis Fund, c/o Stafford House, 10 Prince Of Wales Road, Dorchester, Dorset, DT1 1PW

Confirm with Adam if it's actually a flat number or building name that got dropped.

## What's unblocked

I can build now. Nothing on the build path is waiting.

The T&Cs page is the only thing that genuinely needs a value Adam hasn't given (the prize). Render it with a placeholder until he confirms — easy to update in MDX.

## Open question summary update

Of the 14 open questions in the README and 01-functional-design.md, this exchange closed: 1, 2, 3, 5, 6, 10.

Still open: 4, 7, 8, 9, plus 11 (sponsor seats — now answered: keep functionality option), 12 (prize draw model — closed by question 1), 13 (marketing copy — still need from Adam).

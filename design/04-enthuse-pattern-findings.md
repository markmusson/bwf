# Enthuse Pattern Findings — Updates to the Design

After reviewing seven screenshots of the live Enthuse flow, several things changed materially. This document captures the deltas and supersedes the matching sections in `01-functional-design.md` and `03-claude-code-prd.md` where they conflict.

## 1. Critical: Gift Aid vs. Prize Draw conflict

Enthuse's Gift Aid step has three confirmation tickboxes the donor must affirm. The third one is the kicker:

> "This donation is not made as part of a sweepstake, raffle or lottery (e.g. book, auction prize, ticket to an event) and I am not receiving anything in return for it."

HMRC rule: a donation is not eligible for Gift Aid if the donor receives a meaningful benefit in return. **A prize draw entry counts as a benefit.** If every donation automatically enters the prize draw, *zero donations qualify for Gift Aid* — and we'd be misleading donors who tick the Gift Aid box. That's a regulatory landmine, and we'd be leaving 25% on the table.

### Fix: separate the prize draw from the donation

Three workable patterns, in order of preference:

**Option A (recommended): Free prize draw, fully separate from the donation.**
- After paying, the donor lands on a confirmation page.
- That page has an explicit, optional "Enter the prize draw — free" button.
- T&Cs make clear the entry is **not contingent on the donation**: anyone can enter by post for free without donating; donors are merely *also* offered an entry, free, no benefit conferred.
- Gift Aid stays clean. Prize draw mechanic stays.

**Option B: Remove the prize draw from v1.**
- Cleanest legal posture. Worst conversion.

**Option C: Two parallel donation buttons** — "Donate (Gift Aid eligible)" and "Donate + Enter prize draw (no Gift Aid)" — donor picks. Honest but adds a fork that hurts conversion.

**Recommendation: Option A.** Keep the prize draw as a separate, free entry shown after donation. Spell it out in the T&Cs. This is exactly how lawful UK charity prize draws operate — the donation and the entry are *legally* separate transactions; we just present them sequentially.

Adam needs to confirm and the prize T&Cs page must reflect this.

### Schema impact

`prize_entries.donation_id` is **already nullable** in the schema (good — was specced for postal entries). We now use the same nullable for "donor opted in after paying". The donor's choice is captured at the confirmation step, not at checkout. Update the post-checkout flow accordingly.

## 2. Wizard structure: 6 steps with the Details step having sub-screens

Enthuse's stepper: **Select → Details → Message → Gift Aid → Pay → Complete**. The "Details" step is two screens:

**2a. Email + login choice.** Either enter email, log in to a returning Enthuse account, or OAuth (Facebook / X / Google). For us:
- Email entry only, magic link if returning donor wants to manage seats.
- **Skip OAuth for v1** — we're not Enthuse, we don't have an account ecosystem yet, and OAuth adds three providers' worth of integration burden.

**2b. Personal details.** Title, first name, last name, country, address (with autocomplete), phone (optional), marketing preferences, T&Cs tickbox.

### Update to wizard step list (supersedes §4.1 of 01-functional-design.md)

1. **Amount** — frequency (one-off only for v1, no recurring), amount tiles (£10 default, £25, £50, custom min £10), platform tip option (skip for v1), two privacy toggles.
2. **Details (a) Email** — email entry; "donated before? get a magic link" link.
3. **Details (b) Personal info** — name, address (autocomplete), phone (optional), marketing radio, T&Cs.
4. **Message (Tribute)** — message, display name, "Hide my picture and name from public view" toggle.
5. **Gift Aid** — declaration with three confirmations + the £20 → £25 visual upgrade.
6. **Avatar** — build it. (We're doing this; Enthuse doesn't.)
7. **Pay** — Stripe Embedded Checkout.
8. **Complete** — confirmation, share card, **explicit free prize-draw opt-in button**.

That's 8 screens but 6 steps in the breadcrumb (Details collapses to one for the user, Message and Avatar can collapse on mobile if needed).

## 3. Address autocomplete (required for Gift Aid)

HMRC requires donor's name and home address for Gift Aid declarations. Manual entry is error-prone and adds friction. Enthuse uses an autocomplete on "Find your address".

**Implementation:**
- Use **Loqate** (`getaddress.io` is a cheaper UK alternative, ~£0.01/lookup).
- Server-side proxy the API key — never expose it client-side.
- Fallback: "Enter address manually" link revealing the four-line form.
- Cache lookups by postcode for 24h to keep cost down.

**Cost estimate:** £100k of donations × ~50% Gift Aid eligible × 1 lookup each = ~5,000 lookups × £0.01 = £50. Negligible.

## 4. Marketing preferences: opt-in/opt-out radio (no default)

UK PECR + GDPR: marketing consent must be a positive, informed choice. **No pre-ticked boxes, no implicit defaults.** Enthuse uses two radios:

- "I'm happy to be contacted by Email"
- "Please don't contact me by email for the purposes stated"

The donor must pick one before proceeding. Validation message in shot 4: "Please select a contact preference." That's the right pattern.

**Update to schema:** `donors.marketing_opt_in` is currently `boolean not null default false`. Change to nullable: `boolean` (no default), enforce non-null in the application layer at the moment of capture. This way we can distinguish "no answer given" from "explicit no", which matters for legal record-keeping.

```sql
-- Migration delta
alter table donors alter column marketing_opt_in drop not null;
alter table donors alter column marketing_opt_in drop default;
```

Plus add `marketing_consent_recorded_at timestamptz` so we have a timestamp of when consent was captured — required for ICO defensibility.

## 5. Gift Aid step: three confirmation tickboxes, not one

Enthuse's screen has:
1. Toggle: "I would like to increase my donation with Gift Aid"
2. Tickbox: "I am a UK taxpayer"
3. Tickbox: "This is my own money. I am not paying in donations made by a third party..."
4. Tickbox: "This donation is not made as part of a sweepstake, raffle or lottery..." (the one that conflicts with our prize draw — see §1)

All three secondary tickboxes must be true if the toggle is on. Update wizard validation.

**Schema impact:** record all three confirmations, not just a single boolean.

```sql
-- Replace donations.gift_aid (boolean) with a JSONB or three columns
alter table donations
  add column gift_aid_confirmations jsonb;
-- shape: { uk_taxpayer: true, own_money: true, no_benefit: true, declared_at: '2026-05-15T12:00:00Z' }
```

Keep the existing `gift_aid` boolean as the summary flag; the JSONB holds the per-confirmation record for HMRC defensibility.

## 6. "Hide my donation amount" and "Donate anonymously" — confirmed pattern

Two independent toggles. Already specced. No change.

## 7. The visual £20 → £25 Gift Aid upgrade

Strong UX pattern. Make sure our Gift Aid step shows:
- Big "Your donation: £20" on the left
- Arrow
- Big "With Gift Aid: £25" on the right
- Small "boost your donation at no extra cost" caption

This is a conversion driver — copy it directly.

## 8. "Your generosity can help more than just us" — platform tip

Enthuse tacks on a tip ("15% £3.00") that goes to Enthuse to cover platform costs. We don't need this — we're hosted by BWF. **Skip for v1.**

If you ever want to add it: it would go to BWF as a "cover the Stripe fees" donation on top of the seat donation, framed transparently. Small extra revenue but adds a decision step. Don't do it now.

## 9. Donations summary on the Gift Aid step

> "Please take a payment of £25 from my account for THE FAVELA FOUNDATION."

Shows the *final* amount with Gift Aid. Donor confirms before proceeding to Pay. Add to our wizard.

## 10. Updated open questions for Adam

Adding these to the existing list in `01-functional-design.md` §13:

12. **Prize draw model.** Confirm we can make the prize draw a separate, free, post-donation opt-in (Option A above). This is the clean legal path AND keeps Gift Aid intact. If Adam wants the entry to be tied to the donation, we lose Gift Aid — flag the trade-off.
13. **Address lookup vendor.** Loqate vs getaddress.io — depends on volume forecast. ~£50/year is plenty for the campaign; either works.
14. **OAuth login providers.** Skip for v1?
15. **Platform tip ("cover our costs").** Skip for v1?
16. **Marketing preferences copy.** What does "be contacted by email" mean specifically — newsletter? Updates on this campaign? Both?

## 11. Changed acceptance criteria (replace bullets in PRD §9)

Replace "tribute editable within 24h" with:

- [ ] Returning donor magic link works. They can edit display name, tribute, avatar, and amount-privacy / anonymity toggles — at any time.
- [ ] Gift Aid step records all three confirmations with timestamp into `gift_aid_confirmations` JSONB.
- [ ] Prize draw entry is a separate post-donation action; donor sees explicit "Enter the prize draw (free)" button on the Complete step.
- [ ] Marketing preference must be selected (opt-in or opt-out); no default; timestamp captured.
- [ ] Address autocomplete works in Gift Aid; "Enter manually" link reveals manual fields.
- [ ] Gift Aid step shows £X → £Y visual upgrade.

## 12. Changed PRD §1 (Stack additions)

Add to the stack table in `03-claude-code-prd.md`:

| Layer | Choice | Notes |
|---|---|---|
| Address autocomplete | getaddress.io (UK only) | Server-side proxy, postcode cache, manual fallback |

## Summary

The screenshots saved us from two real bugs: a Gift Aid compliance break (everyone fails the third confirmation if prize draw is bundled) and a marketing-consent default that would fail an ICO audit. The fix is mechanical — break the prize draw out of the checkout flow into a separate post-donation opt-in, and treat marketing consent as a hard "must answer" radio with no default.

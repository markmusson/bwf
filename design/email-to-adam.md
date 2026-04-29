# Email to Adam

**Subject:** Virtual Seats — a few things to sort before I build

---

Adam,

Thanks for the brief. Mostly stands. A few things to sort first.

## Gift Aid and the prize draw

HMRC won't allow Gift Aid on a donation if the donor gets a benefit back. A prize draw entry counts as a benefit. If every £10 auto-enters the draw, no donation qualifies and we lie to anyone who ticks the box.

Split them. Donor pays. Lands on the confirmation page. A button there reads "Enter the prize draw — free". They click or they don't. We also list a free postal entry route in the T&Cs, which UK law requires anyway.

Both Gift Aid and the draw stay. Sign this off so I can build it.

## Decisions I've taken

Pricing. £10 floor, optional bumps to £25, £50, or custom.

Stadium. Sticking with the 2D top-down plan from the mock. Faster, works on phones, screen readers can handle it. 3D goes in v2 if you still want it.

Donor identity. Enthuse pattern. Two toggles, one to hide name, one to hide amount.

Avatars. Full builder in v1.

Stack. Next.js on Vercel, Supabase for the database, Stripe for payments, Resend for email.

## Things I need from you

Most of these block legal launch, not the build. Send when you can.

1. Sign-off on the prize-draw split above.
2. BWF registered charity number, for the footer and T&Cs.
3. UK postal address — free entry route for the draw, legally required.
4. Prize confirmed? Toyota? Closing date?
5. Fundraising target for the progress bar.
6. Tribute moderation. My vote is auto-publish, profanity filter, queue for anything flagged. Alternative is hand-reviewing every tribute, which slows the donor and burns your time.
7. Domain. `seats.bobwillisfund.org` or keep iframing into `/virtualseats`. I'll build for both, but pick one before launch.
8. Email sender. Best is `seats@bobwillisfund.org`. Ricky will need to add DKIM and SPF records.
9. Sponsor seats. Anyone buying a block?
10. The Getty images in the asset pack — confirm BWF holds rights for public web use.

## Timeline

30 May is tight but doable. I start the week of 4 May.

If it slips, the live realtime fill effect goes first, then admin polish, then the avatar builder shrinks to a smaller kit. Seat picker, donation, Gift Aid, receipt, share card and prize draw all ship.

## Launch day

Someone will write something on a tribute we have to pull. Always happens. Keep your phone on you and Ricky on his so we can deal with it fast. I'll have a moderation tool ready.

Full design pack attached. You don't need to read it. Claude Code does.

Best of luck Sunday.

Mark

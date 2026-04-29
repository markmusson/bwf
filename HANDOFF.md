# Handoff Package

This folder is ready to hand to Claude Code. Open a terminal here and run `claude`.

## What's in this folder

```
BWF/
├── CLAUDE.md                   ← Claude Code reads this first
├── KICKOFF.md                  ← copy-paste first prompt
├── HANDOFF.md                  ← this file
├── .gitignore                  ← Next.js + Vercel + .env
├── design/                     ← the design pack
│   ├── README.md
│   ├── 01-functional-design.md
│   ├── 02-brief-evaluation.md
│   ├── 03-claude-code-prd.md
│   ├── 04-enthuse-pattern-findings.md
│   ├── 05-setup-checklist.md
│   ├── 06-locked-from-adam.md
│   └── email-to-adam.md        (already sent — answers in 06)
├── blue-for-bob-v4.html        ← visual + geometry reference
├── Asset Pack PCUK/             ← logo, brand colours, photography
└── *.eml                        ← email thread, background only
```

## Before you run Claude Code

Do these once. Roughly 90 minutes total. Walk-through is in `design/05-setup-checklist.md`.

1. Stripe — confirm access to the BWF account. Generate test keys.
2. Supabase — create project `bwf-virtual-seats`, region `eu-west-2`. Save anon and service-role keys.
3. Resend — sign up. Domain verification can wait until Adam confirms the sender address.
4. Sentry — create project, get DSN.
5. Upstash Redis — create database (use the Vercel integration).
6. getaddress.io — sign up, paid tier (£15/month).
7. GitHub repo — `gh repo create markmusson/bwf-virtual-seats --private`.

You can run `claude` before doing any of this. It'll tell you what it needs and when.

## Running Claude Code

```bash
cd /Users/mmusson/projects/BWF
claude
```

Then paste the first prompt from `KICKOFF.md`.

## What "done" looks like

Every box ticked in `design/03-claude-code-prd.md` §9 plus the updated criteria in `design/04-enthuse-pattern-findings.md` §11.

## When to come back to Mark (this human)

- Stripe live-mode go-ahead
- Domain decision (subdomain wins, but confirm with Adam)
- Email sender confirmation
- Anything that contradicts the design pack
- Anything that blocks the 30 May launch

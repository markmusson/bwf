# Kickoff Prompt for Claude Code

Open a terminal in this directory. Run `claude`. Paste the prompt below as your first message.

---

## First message

```
You're building the BWF Virtual Seats platform. Read CLAUDE.md first, then every file in the design/ folder in numerical order, then blue-for-bob-v4.html.

After reading, give me five bullets:
- The product in one line
- The locked stack
- Your week 1 plan (from PRD §8)
- The two biggest risks you see
- Anything you need from me before you start coding

Stop there. Wait for my "go" before scaffolding anything.
```

---

## After Claude Code's summary, respond with one of these

### Green light, full speed

```
Go. Start week 1 from PRD §8. Scaffold the Next.js app at the project root (not a subfolder), set up Tailwind v4, wire Supabase, run migrations 0001 and 0002 and the marketing-consent delta from 04 §4. Open a PR when the stadium canvas renders empty seats from the database.
```

### Green light, slower

```
Go but commit after each subtask in week 1. Open a PR for review after: (1) repo scaffold, (2) Supabase migrations applied, (3) seat seed script run, (4) stadium canvas rendering. Don't move past one until I've reviewed.
```

### Pause for setup

```
Hold. I haven't done the setup checklist yet. I'll come back when Supabase, Stripe, and Resend accounts are ready. Once I do, draft the .env.example for me to fill.
```

---

## What Claude Code will probably ask

It might want clarification on:

- **Repo location** — at `/Users/mmusson/projects/BWF` root, not a subfolder. The `design/` and asset folders sit alongside the `app/`, `lib/` etc. The `bwf-virtual-seats` name in PRD §2 was illustrative — use this folder.
- **`create-next-app` options** — yes Tailwind, yes App Router, yes TypeScript, yes ESLint, no `src/` directory, import alias `@/*`.
- **Supabase project ID** — give it once you've created the project per `design/05-setup-checklist.md` §2.
- **Stripe keys** — test keys only until end-to-end works.

---

## When something goes off-rails

If Claude Code starts adding 3D, switching the database, or building a custom auth system — stop it. Point at the relevant section of CLAUDE.md.

If a real new constraint surfaces during the build — for example Vercel quotas, a Stripe limit, a Supabase RLS gotcha — update the design pack rather than working around it silently.

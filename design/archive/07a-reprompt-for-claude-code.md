> **STATUS: ARCHIVED 2026-05-01.** This document is the one-shot prompt
> used to brief Claude Code on the Convex pivot on 2026-04-30. Kept for
> historical reference only. The current spec is `design/07-convex-pivot.md`.

# Reprompt for Claude Code — Convex pivot

Paste this into a fresh Claude Code session, or send it as the next instruction in the running one.

---

We're switching the data and auth layer from Supabase to **Convex + Convex Auth**. Everything else in the locked stack stays.

Read `design/07-convex-pivot.md` end to end before you do anything. It supersedes the Supabase parts of `03-claude-code-prd.md` and `05-setup-checklist.md`. Do not relitigate the database choice. Do not propose Prisma, Drizzle, NextAuth, Clerk, or going back to Supabase.

Also re-read `CLAUDE.md`. The line "don't pick a different framework or database" is overridden for this one swap and only this swap. Every other locked decision still holds.

## First three actions, in order

1. **Audit and report — don't change code yet.** Open a scratch markdown at `design/07b-pivot-audit.md` and list:
   - every file that imports `@supabase/*` or references `SUPABASE_` env vars
   - every SQL migration file
   - every route handler or server action that touches the Supabase client
   - every PR or branch in flight that you know about
   For each item: keep / rewrite / delete. Cite the section of `07-convex-pivot.md` that justifies the call.

2. **Stop me if anything in the audit conflicts with the pivot doc.** Don't guess. Push back with the specific line numbers.

3. **Once I confirm the audit, work the build sequence in `07-convex-pivot.md` §14 from step 1.** One PR per step. Vercel preview on each.

## Rules of engagement for this pivot

- Convex deployment region must be **EU**. Set at creation. Cannot be changed later.
- Money is integer pence everywhere. No floats.
- Stripe webhook is a Convex `httpAction`, not a Next.js route. Endpoint: `https://<deployment>.convex.site/stripe/webhook`.
- Idempotency is proven by a test, not by inspection. Two deliveries of the same event = one seat update, one email.
- Hold concurrency is proven by a test. Two simultaneous `claim` calls for the same seat = one winner.
- Prize draw stays a separate, free, post-donation opt-in. Never bundled. Gift Aid depends on it.
- Magic-link only via Convex Auth's Resend provider. No passwords, no OAuth.
- No Convex file storage for avatars. Render from JSON config on the client, same as before.
- `internalMutation` is for cron and webhook fan-out only. User-triggered flows go through public mutations with `getAuthUserId(ctx)`.

## What to keep from existing work

UI, geometry, avatar JSON, Stripe Embedded Checkout client code, Tailwind, page routes, copy, email templates, the seed data approach for stadium seats. All of this is framework-agnostic and survives.

## What to delete

`supabase/` directory, `src/lib/supabase*`, all `SUPABASE_*` env vars in `.env.example` and Vercel, the existing `app/api/stripe/webhook/route.ts` if it talks to Supabase, any RLS docs.

## Reporting

After each PR, post a one-paragraph status here:
- what shipped
- which acceptance criterion in `07-convex-pivot.md` §16 it satisfies
- what's next
- any open question for me

Plain English. Short sentences. No "Here's the…", no LinkedIn-post headings, no parenthesised explainers tacked on the end.

Begin with the audit.

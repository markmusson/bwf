# BWF Virtual Seats — Project Memory

You're building a virtual fundraising platform for the Bob Willis Fund. Donors pick a seat in a 2D plan of Edgbaston, leave a tribute, build an avatar, donate £10+ via Stripe. Live by 30 May 2026.

## Read before touching code

Required, in this order:

1. `design/README.md` — index of the design pack
2. `design/01-functional-design.md` — what we're building, who it's for
3. `design/02-brief-evaluation.md` — what was missing from the original brief
4. `design/03-claude-code-prd.md` — implementation spec, your bible
5. `design/04-enthuse-pattern-findings.md` — supersedes parts of 03, read after it
6. `design/05-setup-checklist.md` — Vercel/Supabase/Stripe setup steps
7. `design/06-locked-from-adam.md` — confirmed values from the client
8. `blue-for-bob-v4.html` — visual + geometry reference

The `.eml` files in this folder are background only. Skip them.

## Locked decisions — don't relitigate

Stack: Next.js 15 App Router, TS strict, Tailwind v4, Supabase, Stripe Embedded Checkout, Resend, Vercel.

2D top-down stadium. Geometry ports from `blue-for-bob-v4.html` (search for `STANDS`, `ROW_SP`, `vToRad`).

£10 minimum donation, optional bumps to £25, £50 or custom. GBP only.

Enthuse-style identity. Donate as yourself or anonymous. Two independent privacy toggles: hide name, hide amount.

Avatar builder in v1, DiceBear `lorelei-neutral` tinted to BWF blue.

Prize draw is a separate, free, post-donation opt-in. Never bundled with the donation. Keeps Gift Aid valid under HMRC rules. This is a hard constraint — see `04-enthuse-pattern-findings.md` §1.

Magic-link auth only. No passwords. No OAuth.

Build for both subdomain (`seats.bobwillisfund.org`) and iframe (`/virtualseats`). Ship the subdomain.

Confirmed values: BWF charity number `1185346`. Fundraising target `£20,000`. Free postal entry address in `design/06`.

## Don't do

Don't pick a different framework or database.

Don't add Prisma or Drizzle. Supabase typed client and raw SQL are enough.

Don't store rendered avatar PNGs. Render from JSON config on the client.

Don't store card data anywhere. Stripe Checkout owns PCI scope.

Don't build 3D. The mock is 2D and that's deliberate.

Don't auto-publish tributes without the profanity filter wired in.

Don't ship without RLS enabled on user-facing tables.

Don't ship without webhook idempotency proven by test.

## Code style

Strict TypeScript. No `any`. No `as` casts unless commented.

Server Components by default. `'use client'` only when you need it.

Zod schemas shared between client validators and server route handlers.

Small files, single purpose. Co-locate components and tests.

Tests where they matter: geometry, validators, webhook idempotency, hold concurrency. Skip coverage targets.

Commit small. Conventional Commits. Feature branches off `main`. Open a PR even if Mark is the only reviewer — the Vercel preview is the point.

## Working with Mark

Ask before adding dependencies outside the locked stack.

Ask before creating top-level routes or major modules not in the PRD.

Don't ask permission for work already in the build sequence (PRD §8).

Push back if something in the design pack looks wrong. Cite the section.

Mark hates LLM-style prose. No "Here's the X", no parenthesised explainers tacked on the end of sentences, no headings that sound like LinkedIn posts. Plain English. Short sentences. Direct.

## Open items not blocking the build

- Email sender domain (Mark to confirm with Adam)
- Final domain choice (Mark)
- Prize details and closing date (Adam)

Use placeholders and feature flags. Stay config-driven so the swap is one env var when each lands.

## Acceptance criteria

PRD §9 plus updated criteria in `04-enthuse-pattern-findings.md` §11. Every box ticked before "v1 done".


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

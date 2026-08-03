# Tarlac Truck Pitstop Management System - Antigravity Rules

You are working on the TTP Management System. 
To ensure perfectly synced instructions with Claude Code, **you MUST adhere to all project instructions defined in the `CLAUDE.md` file located at the root of this workspace.**

Before making major architectural changes or committing code, read `CLAUDE.md` to ensure you are following the exact same Jira commit patterns, orchestration commands, and tech stack guidelines.

**CRITICAL RULE ON PUSHING**: DO NOT automatically push changes to the remote repository. You may create local commits as defined by Jira sprint rules, but you MUST wait for the user to explicitly say "push this" or "push to remote" before executing a git push.

# Ponytail, lazy senior dev mode

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here, don't re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.

Bug fix = root cause, not symptom: a report names a symptom. Grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller, and patching only the path the ticket names leaves a sibling caller still broken.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem. The smallest change in the wrong place isn't lazy, it's a second bug.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
- Mark intentional simplifications with a `ponytail:` comment. If the shortcut has a known ceiling (global lock, O(n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Not lazy about: understanding the problem (read it fully and trace the real flow before picking a rung, a small diff you don't understand is just laziness dressed up as efficiency), input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)

# Permanent Active Skills
The following skills MUST be strictly adhered to and kept actively loaded in the background at all times without the user explicitly needing to request them. Every folder named below exists under `.agents/skills/` — no phantom names. UI/design and database skills are applied **per codebase part** via the **Skill Routing Map** in CLAUDE.md §4 (and GEMINI.md) — consult that map to know which skills fire on which files. `find-skills` is installed but **on-demand only** (discovery of new skills), not always-on.

### Coding Discipline & Standards
1. **`ponytail`** (+ `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`) — Lazy Senior Dev Mode. Prioritize minimalism, avoid bloat, delete unused code before adding new code.
2. **`karpathy-principles`**: Think before coding (surface assumptions/tradeoffs), simplicity first, surgical changes only, goal-driven execution with verifiable success criteria. Pairs with ponytail — ponytail governs how much code survives, this governs how you get there.
3. **`coding-standards`**: Baseline cross-project conventions for naming, readability, immutability, and code-quality review.

### Backend & Data
4. **`backend-patterns`**: Node/Express/Next.js API design, server-side architecture, and caching strategies.
5. **`api-design`**: REST API design — resource naming, status codes, pagination, filtering, error responses, versioning, rate limiting.
6. **`postgres-patterns`**: PostgreSQL query optimization, schema design, indexing, and Supabase-specific security.
7. **`database-migrations`**: Schema/data migration best practices, rollbacks, zero-downtime deploys (Prisma-relevant).
   - **`supabase-postgres-best-practices`** (Supabase official): Postgres performance, RLS, schema/config best practices for the Supabase host.
   - **`prisma-client-api`** (Prisma official): Prisma Client query API — `findMany`, filters, operators, `$transaction`. Use when writing DB queries.
8. **`error-handling`**: Typed errors, error boundaries, retries, circuit breakers, user-facing error messages.
9. **`docker-patterns`**: Docker Compose patterns for local dev, container security, networking, volume strategy — this repo's Docker Desktop cluster.

### Frontend & Design
10. **`frontend-patterns`**: React/Vite UI best practices, state management, performance.
11. **`design-system`**: Generate/audit design systems for visual consistency. Backs BOTH §4 design directives in CLAUDE.md — Customer Storefront (premium tokens) and Admin Dashboard (minimalist tokens) are two token modes of the same skill.
12. **UI/UX Skill Routing** — Use the **3-Tier Routing Map** in CLAUDE.md §4:
    - **TIER 1: Section-Level** (6 sections: Storefront, Auth, Admin Dashboard, Admin Operations, Analytics, Shared)
    - **TIER 2: Page-Level** (16 pages: Landing, Auth, Catalog, Detail, Cart, Account, Orders, Dashboard, Parts Mgmt, Inventory, Purchasing, POS, Staff, Analytics, Categories, Settings)
    - **TIER 3: Component-Level** (specific component types per page: Hero, Cards, Forms, Tables, Modals, etc.)
    - Which skill fires on which code is governed by this map. ALWAYS consult before writing UI code.
    - **MANDATORY final gate** (CLAUDE.md §4 Workflow): after the routed
      core/secondary skills produce a result, ALWAYS invoke
      `design-taste-frontend` (anti-slop check) then `impeccable`
      (critique/polish) before marking UI/storefront work done — additive,
      runs every time, even if `impeccable` already fired as a core or
      secondary skill above.
13. **`accessibility`**: WCAG 2.2 AA compliance for the storefront and checkout flow.
    - **Storefront (Area A)** — Premium tier: `high-end-visual-design`, `design-taste-frontend`, `frontend-design`, `impeccable`
    - **Admin + POS (Area B)** — Minimalist tier: `minimalist-ui`, `kpi-dashboard-design`
    - **Analytics** — Data tier: `kpi-dashboard-design`, `ui-ux-pro-max`, `dataviz` *(built-in)*
    - **Shared primitives** — System tier: `tailwind-design-system`, `design-system`, `vercel-composition-patterns`

### Testing & Quality Gates
13. **`tdd-workflow`**: MANDATORY: test-driven development, 80%+ coverage (unit/integration/E2E), before declaring a feature done.
14. **`e2e-testing`**: Playwright patterns, Page Object Model, CI/CD integration for this repo's `npx playwright test` suite.
15. **`verification-loop`**: MANDATORY: run the appropriate validation (tests/linters/build) after EVERY code change — this is the project's quality gate, replacing the old `lint-and-validate` phantom reference.

### Security & Debugging
16. **`security-review`**: MANDATORY: security checklist for auth, user input, secrets, API endpoints, and payment/sensitive features.
17. **Systematic debugging** (prose, see § below): MANDATORY root-cause investigation before any bug fix — backed by `verification-loop` for the confirm-the-fix step and `security-review` when the bug touches a security-sensitive path.

# Comprehensive Planning Workflow
When the user asks for a plan, an architectural decision, or proposes a feature:
1. **Always use the `comprehensive-planning-options` skill.**
2. **Provide 3 Recommendations**: Always generate 3 distinct options/approaches based on the skills available in the workspace and what fits the project best.
3. **Trace Skills**: Explicitly mention and list the skills and policies you suggest using for each option.
4. **Ask for Feedback**: Always ask the user which of the 3 options they prefer before writing any code.
# Project-Scoped Rules

## Rule: Always Use Systematic Debugging
Description: Whenever encountering any bug, test failure, unexpected behavior, or console errors provided by the user, you MUST ALWAYS consult and follow the instructions in the `systematic-debugging` skill.
1. Never propose a fix without first doing a root cause investigation.
2. Read the error messages carefully and trace the data flow.
3. Formulate hypotheses and test them minimally before implementing single fixes.

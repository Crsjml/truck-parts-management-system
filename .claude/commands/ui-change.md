---
description: UI/UX change with skill routing, brainstorm, plan, grill stop, verify
argument-hint: <target file/page> — <what's wrong or what you want> [— constraints]
---

UI/UX change request: $ARGUMENTS

Run this in order. Announce each skill as you invoke it. Do not skip ahead.

STEP 0 — DECOMPOSE, THEN ROUTE PER PART
If the request above is missing a target, ask for it before anything else.

0a. SCOPE CHECK — is this pipeline worth running?
The floor: more than one part, OR the user does not already know what the
answer should look like. Below the floor (single part, cosmetic, obvious
answer — a padding fix, a color swap, a label change), say so:
"This is below the pipeline floor. Recommend plain `impeccable` and a direct
fix instead. Want me to just do it?" — then STOP and wait.
Do not grind six steps through a two-line diff.
Above the floor, continue.

0b. Read the target file(s). Inventory the DISTINCT PARTS the change touches —
not the page as a whole. A part is a region with its own design problem:
header, filter bar, KPI row, chart, data table, form, empty state, modal,
pagination, toast, card grid, drawer. One page routinely yields 3-6 parts with
different needs (a dashboard's KPI tiles and its filter bar are not one job).
List them. If a part is untouched by the request, drop it.

0c. Route each part independently. Sources, in order:
  1. CLAUDE.md §4 Tier 2 (page) and Tier 3 (component type) tables.
  2. The live skill list in your context — Tier tables can drift from what is
     actually installed. Match on skill DESCRIPTION, not remembered name.
  3. Portal tier as tiebreaker: Storefront = Premium, Admin/POS = Minimalist.

0d. Gap check. For any part with no strong match in the installed set, invoke
`find-skills` to search the ecosystem (`npx skills find <query>`, or the
skills.sh leaderboard). Report what you found and its install command —
do NOT install anything without approval. If nothing fits, say so and route
that part to `impeccable` as the fallback.

0e. Output the routing as a table:

  | Part | Portal tier | Skills | Why |
  |------|-------------|--------|-----|

NAMES ONLY. This table is a plan of intent — do NOT load any skill's content
here. Each skill is invoked later, at the moment its part is actually worked
(Step 2, then Step 5). Parts never reached cost nothing; a grilling that kills
a direction does not strand skills loaded for it.

A target spanning both portals routes per-part, never globally.

STEP 1 — BRAINSTORM (PROBLEM ONLY)
Invoke superpowers:brainstorming. Scope is strictly the PROBLEM:
what the current UI does to people, who hits it, how often, what "fixed"
means and how it would be recognized.

BANNED in this step: proposing a solution, sketching markup, naming a layout,
comparing approaches, or evaluating any design idea. If the user volunteers a
solution, record it as a constraint and return to the problem.
Step 4 is where decisions get stress-tested — this step must not pre-empt it,
or the same ground gets covered twice in different clothes.

STEP 2 — DESIGN PASS
Work ONE PART AT A TIME, in the order listed in Step 0e. For each part:
invoke that part's skills at that moment, design the part, then move on.
Do NOT batch-load every routed skill upfront — some are large
(`design-taste-frontend` is ~13k words, `impeccable` fans out to 39 files),
and a part you never reach should cost nothing.
Never summarize a skill from memory instead of invoking it.
`impeccable` applies to every part.

Reference map (verify against the live list before using; route by need, not by page):
  - Premium look:      high-end-visual-design, design-taste-frontend, frontend-design
  - Operational/dense: minimalist-ui, web-design-guidelines
  - KPI tiles/metrics: kpi-dashboard-design
  - Charts/graphs:     dataviz  (read BEFORE writing any chart code)
  - Motion/micro-detail: emil-design-eng
  - Palette/type/product-type lookups: ui-ux-pro-max
  - Tokens/consistency: tailwind-design-system, design-system
  - Component API change: vercel-composition-patterns, frontend-patterns
  - A11y-critical part (forms, tables, modals, focus order): accessibility
  - Mobile/native screens: sleek-design-mobile-apps

Per CLAUDE.md §7, give exactly 3 distinct options grounded in the existing
codebase. Each option states: what it does per part, which skills produced it,
and ONE LINE on why you would pick it over the other two. Mark one
**RECOMMENDED** and say what would have to be true for a different one to win.
Three genuinely different directions — not one idea plus two strawmen.
Respect the Global Anti-Slop Rules (no three-equal-card rows, Phosphor Icons only).
Then stop and wait for a pick.

STEP 3 — PLAN
After the option is picked: invoke superpowers:writing-plans.
Write the plan to docs/superpowers/plans/<YYYY-MM-DD>-<slug>.md.
Plan must name exact files, exact tokens/classes, and a verification step
per task (what to look at to know it worked).

STEP 4 — GRILL
Invoke the `grilling` skill against the plan and follow it exactly:
one question at a time, each with your recommended answer, waiting for the
answer before the next. Never a bulk list. Look up facts yourself; put only
decisions to the user.
(`grill-me` is the user-invoked wrapper for the same thing — if the user runs
it instead, same session, same rules.)

Scope is strictly the DECISIONS committed to the plan. BANNED: reopening the
problem framing settled in Step 1 — who the user is, what's wrong, what "fixed"
means. Those are closed. Attack the plan's choices, tradeoffs, and gaps.
If the grilling exposes that the problem itself was framed wrong, stop and say
so plainly rather than quietly re-running Step 1 inside Step 4.
Do not write code until the user confirms shared understanding.
Then apply everything the grilling changed back into the plan file.

STEP 5 — BUILD
Ponytail ladder applies: reuse existing components/tokens before writing new ones.
Surgical diffs only (CLAUDE.md §9.3) — do not touch adjacent styling not asked about.
Relative /api paths only. No hardcoded localhost:5000.

STEP 6 — VERIFY
Invoke superpowers:verification-before-completion.
Then run web-design-guidelines as an a11y/spacing/interaction audit on the diff.
No "done" claim without evidence.

Commit format: type(TTP-XX): description — look up the ID in
docs/jira/jira-breakdown.csv first. Never push.

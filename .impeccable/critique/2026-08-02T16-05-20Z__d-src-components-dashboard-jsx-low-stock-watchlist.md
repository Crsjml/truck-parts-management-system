---
target: Dashboard.jsx Low-Stock Watchlist
total_score: 16
max_score: 32
na_heuristics: 5,9
p0_count: 2
p1_count: 1
timestamp: 2026-08-02T16-05-20Z
slug: d-src-components-dashboard-jsx-low-stock-watchlist
---
Method: dual-agent (A: a1521921f263f6194 · B: ac78ab2c5e263cc75)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | KPI count, badge, and row tint agree redundantly — good |
| 2 | Match System / Real World | 2 | "Deficit" unexplained; no legend for critical vs low split |
| 3 | User Control and Freedom | 2 | `.slice(0,5)` silently truncates with no "view all N" affordance |
| 4 | Consistency and Standards | 2 | Three related numbers (Deficit/Stock/Min) get three unrelated type treatments |
| 5 | Error Prevention | n/a | No destructive action in this widget |
| 6 | Recognition Rather Than Recall | 3 | Color + badge text reduce recall load |
| 7 | Flexibility and Efficiency | 1 | No sort/filter; order not visibly critical-first |
| 8 | Aesthetic and Minimalist Design | 2 | Full-row tint on every row = no signal (every row is already low-stock by definition) |
| 9 | Error Recovery | n/a | No error states in this widget |
| 10 | Help and Documentation | 1 | No tooltip/legend on severity meaning |
| **Total** | | **16/32** | **Acceptable (50%)** |

## Design Specificity Verdict

**LLM assessment**: Generic, not authored for TTP. Swap "Stock Warnings" for "Overdue Tickets" and this is any admin dashboard: bordered pill, colored KPI number, tinted rows, secondary-button action. Only the SKU `font-mono` and "Restock" copy read as product-specific. Structurally it respects the Operate/flat mandate (no shadow/glow escalation found), but severity *signaling* is templated Tailwind-badge-kit stacked four times over, not a considered system.

**Deterministic scan**: `detect.mjs --json` on `Dashboard.jsx` returned a clean `[]` — no rule-engine findings. Manual grep: `bg-destructive` appears 5×, `text-destructive` 7× in the file. Six distinct font-weight/size combinations exist across the Part/Deficit/Stock/Min/Action cells (`text-xs font-semibold uppercase`, `font-medium`, `text-xs font-mono`, `text-lg font-bold font-display`, bare `font-bold`, `text-sm`) — confirms Assessment A's inconsistency finding mechanically. No hardcoded hex/rgb colors outside Tailwind classes.

**Visual overlays**: Not available — no dev server running this session, browser step skipped and reported as a fallback signal rather than claimed.

## Overall Impression

The severity-state architecture (one `isCritical` boolean driving KPI card, header badge, row background, deficit color, and stock-pill color) is technically sound, but it over-signals: the same true/false renders five times per row. Meanwhile the one thing that actually needs visual hierarchy — Deficit vs Stock vs Min as three parts of one equation — gets no coordinated treatment at all. The single biggest opportunity: delete the full-row background tint (in light AND dark) and let the deficit number + stock pill carry all the severity signal; then redesign Stock/Min as a paired unit so the row visibly reads as "3 in stock, needs 10."

## What's Working

- **Single source of truth for severity** (`isCritical`/`hasCriticalStock`) driving every color decision — clean architecture even though the visual output is noisy.
- **SKU in `font-mono`** is a correct, deliberate typographic choice matching DESIGN.md's mono-for-identifiers convention.
- **Focus-visible rings** present on both the KPI card and the Restock button — accessibility baseline is covered, not skipped.

## Priority Issues

**[P0] Full-row background tint defeats its own signal, in both themes.**
Why it matters: Every row in this table is, by construction, already below its safety threshold — that's the table's filter. Coloring every row `bg-destructive/5`/`bg-accent/5` (light) or `dark:bg-destructive/10`/`dark:bg-accent/10` (dark) means 100% of visible rows carry a "look here" tint, which makes the tint background noise rather than a triage cue. Dark mode compounds the problem: the `/10` dark opacity step reads more saturated against the dark `ink` base than the `/5` light step does against `paper`, so the flat Operate tier reads *louder* in the mode where the mandate most wants calm.
Fix: Remove `rowBg` entirely. Keep color only on the deficit number and stock pill — already sufficient encoding — and let `hover:bg-secondary` (or nothing) carry the row-level fill.
Suggested command: `/impeccable quieter`

**[P0] Deficit/Stock/Min typography doesn't communicate the equation (deficit = stock − min).**
Why it matters: The three numbers are related math, but get three unrelated treatments: Deficit is `text-lg font-bold font-display` and colored; Stock is a bordered pill, `font-bold`, near-neutral; Min is bare `text-muted-foreground` with no emphasis at all. An admin cannot visually confirm the deficit from the row — Min, the actual threshold that put the row in this table, is the quietest element on it.
Fix: Pair Stock and Min as one visual unit at matching weight (e.g. `3 / 10`), and reserve the single loud treatment for Deficit only — one loud number per row, not three competing tiers.
Suggested command: `/impeccable typeset`

**[P1] Accent-vs-destructive split is invisible to the user.**
Why it matters: The UI renders two different severities (accent = low, destructive = critical) but nothing on screen explains the split — the header badge says "Action Needed" regardless of which. An admin can't tell what threshold flips a row from accent to destructive.
Fix: Add a one-line legend or count split in the header (e.g. "2 critical · 3 low").
Suggested command: `/impeccable clarify`

**[P2] Silent truncation at 5 rows.**
Why it matters: `.slice(0, 5)` hides any low-stock item past the fifth with zero indication more exist — a shop with 12 low-stock parts sees 5 and no "+7 more" signal. Violates user control/freedom.
Fix: Add a "+N more — View all" footer link routing to the catalog low-stock filter (the click handler already exists on the card).
Suggested command: `/impeccable harden`

**[P3] Restock button reads as an unexamined default, not a deliberate quiet choice.**
Why it matters: `bg-secondary hover:bg-muted` on the Restock button is visually identical to any neutral secondary action elsewhere in the app, inside a row that's otherwise screaming urgency via four other color signals. Flat-tier compliant, but worth confirming this muted CTA is intentional restraint rather than an oversight.
Suggested command: `/impeccable polish`

## Persona Red Flags

**Alex (Power User)**: No sort/filter on the watchlist and no "view all" link — must eyeball row colors one at a time to triage, which is slower than Alex's expected scan-and-batch workflow. No keyboard shortcut to jump to the full low-stock catalog view beyond the whole-card click target.

**Sam (Accessibility-Dependent)**: Severity is backed by a text badge (good), but the row background's meaning rides on a `/5` vs `/10` opacity delta — a weak, easy-to-miss contrast signal for low-vision users. The badge and deficit-number color should be the sole mandatory carriers; removing the row tint (per P0) actually improves this rather than costing it anything.

## Minor Observations

- `rounded-2xl` (16px) on both the KPI card and watchlist container exceeds DESIGN.md's largest defined radius token (`lg` = 12px) — check whether this is an intentional system extension or drift.
- The KPI card's `border-t-destructive/50` / `border-t-accent/50` directional top-border accent isn't used elsewhere in the file — confirm if this is a deliberate one-off pattern worth generalizing or an inconsistency.

## Questions to Consider

- If every row is already "below threshold" by definition, what does the row background tell the admin that the deficit number and stock pill don't already say?
- Would this table read *more* urgently with zero background color and only numeric/badge color carrying severity — is chromatic restraint literally the fix?
- Does a flat, secondary-styled Restock button undersell urgency, or is that the correct trade-off given the Operate tier's explicit ban on emphasis styling — and if so, which wins when "urgent" and "flat-mandate" pull in different directions?

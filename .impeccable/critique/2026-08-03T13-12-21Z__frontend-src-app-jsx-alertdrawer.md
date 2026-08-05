---
target: Low Stock Alerts drawer (App.jsx bell notification)
total_score: 23
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
timestamp: 2026-08-03T13-12-21Z
slug: frontend-src-app-jsx-alertdrawer
---
Method: dual-agent (A: a87544cfcebc81701 · B: ab9ddbe2bef66ae1c)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Bell badge count clear; no loading/error state on fetch failure |
| 2 | Match System / Real World | 3 | Shop-floor language ("Low Stock", "Restock Now") fits domain |
| 3 | User Control and Freedom | 3 | Close/Escape/overlay-click all work; no snooze/dismiss-one |
| 4 | Consistency and Standards | 2 | Internally consistent with app's other drawers, but breaks the universal "bell icon = lightweight popover" convention |
| 5 | Error Prevention | 3 | "Restock Now" is non-destructive, low risk |
| 6 | Recognition Rather Than Recall | 3 | Current vs. Min shown side-by-side per card |
| 7 | Flexibility and Efficiency | 1 | No sort/filter/severity ordering, no keyboard shortcut, no bulk action |
| 8 | Aesthetic and Minimalist Design | 2 | Per-card density (badge + 2 stat tiles + full-width CTA) is checkout-cart-level detail for a glance panel |
| 9 | Error Recovery | 3 | Nothing destructive to recover from; close always available |
| 10 | Help and Documentation | n/a | Genuinely inapplicable — a stock list needs no help text |
| **Total** | | **23/36** | **Acceptable (64%)** |

## Design Specificity Verdict

**LLM assessment**: Generic. Swap "Low Stock Alerts" for "Unread Messages" and nothing else changes — title, SKU-as-subtitle, two equal-weight stat tiles, one CTA. No severity tiering (a part at 0 stock reads identical to one just under threshold), no supplier/lead-time signal, no "days since last restock." This is a template notification panel with parts data poured in, not something authored for a truck-parts shop's actual stock-alert workflow.

**Deterministic scan**: `detect.mjs --json frontend/src/App.jsx` returned `[]` (exit 0) — clean. No hardcoded hex/rgb in the drawer markup; every color class resolves to a design token (`bg-destructive`, `bg-secondary`, `bg-background`, `text-accent`, `text-foreground`, `border-border`) except two raw Tailwind defaults: `text-white` (badge, App.jsx:1000) and `text-emerald-500` (empty-state checkmark, App.jsx:1107) — both minor, neither flagged by the detector, but worth swapping to token equivalents (`text-background`, an emerald/success token if one exists) for full DESIGN.md compliance. No browser overlay run this pass (CLI scan only, no dev server/browser automation).

## Overall Impression

The drawer is clean, token-compliant, and accessible at the wiring level (aria-live, aria-expanded, labelledBy, focus trap, Escape all present, confirmed by both assessments) — it is not broken. But it's the wrong *class* of component for the job: a full-height modal drawer with focus-trap and inert background is task-level UI (matches cart/checkout, add-part forms) applied to what should be a glance-level, non-blocking peek. The biggest opportunity is re-scoping this from "drawer" to "anchored popover," which fixes the consistency heuristic, the density problem, and the mid-task interruption cost in one move.

## What's Working

- **Token discipline**: virtually every color in the drawer resolves to a DESIGN.md token, not a raw Tailwind default — rare to see this clean on a first pass.
- **Accessibility wiring**: aria-live region, aria-expanded on the trigger, labelledBy on the panel, Escape-to-close, and a working focus trap are all present and correctly wired (Drawer.jsx:66-88, 131-134).
- **Restock CTA behavior**: dispatching a `catalogFilter` custom event to deep-link into the filtered catalog on a specific SKU is a genuinely useful, non-generic touch — this is domain-specific and should be preserved in any redesign.

## Priority Issues

**[P0] Wrong pattern class for the content**
- **Why it matters**: A bell icon universally signals "peripheral, dismissible, non-blocking" (mail, Slack, GitHub convention). This implementation instead opens a full-height `role="dialog" aria-modal="true"` drawer that inerts the entire background and traps focus — the same treatment as the cart or add-part form. A staff member mid-POS-transaction who taps the bell to glance at stock has to fully exit their current context and re-enter after closing. That's a heuristic-4 (consistency) violation and a real workflow cost, not a cosmetic one.
- **Fix**: Replace the modal `Drawer` with a non-modal anchored popover under the bell — no focus trap, no inert background, closes on outside-click/Escape but doesn't steal the whole viewport. Cap visible rows (~6-8) with internal scroll and a "View all in Catalog" link for overflow.
- **Suggested command**: `/impeccable shape` (re-plan the interaction pattern before restyling)

**[P1] No severity tiering**
- **Why it matters**: Every low-stock item gets an identical "Low Stock" badge regardless of how far below threshold it is — a part at 0 stock and a part at 90% of its minimum read as the same urgency, both visually and to a screen reader. DESIGN.md's alarm-red exists specifically for this kind of real signal and currently sits unused here.
- **Fix**: Derive `stock / minStock` and vary badge color/copy (e.g., "Critical" at 0 in `alarm-red`, "Low" otherwise in the current treatment).
- **Suggested command**: `/impeccable colorize`

**[P1] No grouping/sort for a long list**
- **Why it matters**: Flat, unsorted list — fails the chunking rule (≤4 items/group) the moment there are more than a handful of low-stock parts, and there's no way to triage by urgency without reading every card serially.
- **Fix**: Sort by ascending `stock/minStock` ratio before render — no new dependency, one-liner.
- **Suggested command**: `/impeccable layout`

**[P2] Per-card density too high for a glance panel**
- **Why it matters**: Two equal-weight stat tiles plus a full-width button per row is cart/checkout-level detail for what should be a scan-and-go interaction — pushes heuristic 8 (aesthetic/minimalist) down and adds unnecessary reading cost per item.
- **Fix**: Collapse to a compact single-line row (name, SKU, compact severity badge, icon-only restock action); reserve the two-stat detail for an on-hover/on-tap expansion.
- **Suggested command**: `/impeccable distill`

**[P3] No dismiss/acknowledge affordance**
- **Why it matters**: The only way out of an alert is navigating to the catalog — a staff member who already knows a part is low and doesn't want to restock this second has no way to reduce the badge count.
- **Fix**: Local "seen"/snooze state, cheap since count is already client-derived from `parts`.
- **Suggested command**: `/impeccable onboard` (empty/acknowledged-state design)

## Persona Red Flags

**Riley (Stress-Tester)**: Mid-POS-transaction, taps the bell to peek at stock — the modal drawer inerts the whole background and traps focus, forcing a full context-switch out of the transaction just to glance at a count. A peripheral check shouldn't cost this much.

**Alex (Power User / Staff)**: With 10+ low-stock parts, there's no sort, filter, or keyboard path to jump straight to the most urgent — has to read every card's two stat tiles serially. Matches the heuristic-7 score of 1/4.

**Sam (Accessibility-Dependent)**: Core wiring is solid (no red flag on focus/ARIA), but the identical "Low Stock" badge text on every card means a screen-reader user gets zero severity differentiation read aloud either — the missing urgency signal (P1 above) is an accessibility gap as much as a visual one.

## Minor Observations

- `text-white` (App.jsx:1000) and `text-emerald-500` (App.jsx:1107) are raw Tailwind defaults, not DESIGN.md tokens — swap for token equivalents when touching this file next.
- No `dark:` classes present in this specific block (App.jsx:960-1170, Drawer.jsx) — confirm the token classes used (`bg-background`, `bg-secondary`, etc.) resolve correctly in dark mode via CSS variables rather than needing explicit `dark:` overrides; if they don't auto-resolve, this is a gap DESIGN.md's "both tiers must hold up in both themes" rule would flag.
- Animation timing (`duration: 0.18, ease: 'easeOut'` for this drawer, overriding Drawer.jsx's default `0.4s`/custom cubic-bezier) is faster than the shared primitive's default — reasonable for a lighter-weight panel, but worth confirming intent vs. accident.

## Questions to Consider

- What would this look like if it had to fit in a single Slack-style notification dropdown instead of a half-screen drawer?
- If two parts are both "low," how would a staff member know which one to walk to the shelf for *first* without reading every card?
- Does "Restock Now" need to exist on every single card, or would triage-then-restock (select several, one bulk action) better match how staff actually work a shift?

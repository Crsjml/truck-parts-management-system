---
target: Parts Inventory filter UI + Add New Part modal
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-02T16-47-11Z
slug: partscatalog-jsx-filter-toolbar-addpartdrawer-jsx
---
Method: dual-agent (A: a074a3d57566600e1 · B: detect.mjs CLI, no sub-agent needed for deterministic scan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Step wizard gives no "step complete" confirmation; search suggestions have no loading/empty state |
| 2 | Match System / Real World | 3 | "Recommended Sort" default is meaningless, unexplained |
| 3 | User Control and Freedom | 2 | No jump-to-step on wizard progress bar; closing mid-wizard loses input with zero warning |
| 4 | Consistency and Standards | 1 | Category field is `react-select` in Add drawer, native `<select>` in Edit modal — same data, two widgets |
| 5 | Error Prevention | 2 | Price/stock inputs unconstrained; only the clone-template action is guarded (native `window.confirm`) |
| 6 | Recognition Rather Than Recall | 3 | Category pills show no per-category count |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts, no bulk actions, mandatory 3-step wizard even for trivial adds |
| 8 | Aesthetic and Minimalist Design | 2 | Repeated ternary class strings; Add Part button carries a colored glow shadow at rest, soft Flat-Admin Rule violation |
| 9 | Error Recovery | 2 | Step validation blocks forward nav with no warning until Next is clicked |
| 10 | Help and Documentation | 1 | Zero inline help/tooltips anywhere; "Min Stock Alert" unexplained |
| **Total** | | **20/40** | **Acceptable (50%)** |

## Design Specificity Verdict

**LLM assessment**: Competently built but visually generic within the Operate tier. The clearest violation is DESIGN.md's Two-Red Rule: Signal Red and Alarm Red both collapse into ad-hoc `red-400/500/600` Tailwind classes used interchangeably for focus rings, low-stock alerts, delete buttons, and validation errors — no `--alarm-red` token in use anywhere in either file. Fleet Navy (trust) and the `brandBlue` category ramp are also conflated (e.g. "Apply Template" CTA uses category blue, not the trust token). Net effect: a correctly flat Operate-tier surface that still reads color-arbitrary rather than color-systematic.

**Deterministic scan**: `detect.mjs --json` on both files returned `[]` — no findings from the automated pass. This is a clean structural/pattern scan; it does not check semantic-token misuse (the red-conflation issue above), which is a judgment call the detector isn't scoped to catch.

## Overall Impression

Functionally solid, visually undifferentiated. The filter toolbar and Add Part wizard both work, but neither commits to the project's own design system — hardcoded reds instead of tokens, two different select widgets for the same field depending on which flow you're in, and zero abstraction for repeated pill/toggle button markup despite `cn()` sitting unused in the codebase. The single biggest opportunity: fix the Add Part drawer's silent-data-loss-on-close bug (P0) and the Two-Red token conflation (P1) — both are cheap, both compound daily for staff using this screen.

## What's Working

- `PartsCatalog.jsx:990-1001` — real-time field-completion feedback (label color shift + fade-in checkmark) is a cheap, well-judged micro-affordance that respects the Operate tier's low-motion mandate.
- `AddPartDrawer.jsx:154-157` — the 3-segment progress bar is simple, legible, correctly flat (no gradient).
- `PartsCatalog.jsx:587` — low-stock toggle uses color-as-state for at-a-glance scanability, appropriate for inventory monitoring.

## Priority Issues

**[P0] Add Part drawer discards all input with zero warning on close**
Why it matters: backdrop click or Cancel fires `onClose` immediately (AddPartDrawer.jsx:478, 131) with no dirty-check — a distracted staffer loses a fully-filled form with no recourse.
Fix: guard close with a dirty-state confirm, matching the pattern already used for clone-template (line 186).
Suggested command: `/impeccable harden`

**[P1] Signal Red / Alarm Red conflation across both files**
Why it matters: violates DESIGN.md's Two-Red Rule; there's no learnable distinction between "pay attention" and "destructive/error," undermining trust in the color system on a stock-alert-critical screen.
Fix: introduce `alarm-red` token usage for validation/error/destructive states; reserve current red exclusively for hover/attention (low-stock toggle, search focus).
Suggested command: `/impeccable colorize`

**[P1] Category widget inconsistent between Add and Edit flows**
Why it matters: `react-select` (AddPartDrawer.jsx:257-288) vs. native `<select>` (PartsCatalog.jsx:1041-1065) for the identical field — same data, two different interaction models between add and edit, a textbook consistency-heuristic failure that also increases friction for keyboard/screen-reader users.
Fix: standardize on one widget; port AddPartDrawer's grouped react-select pattern to the Edit modal, or vice versa.
Suggested command: `/impeccable distill`

**[P2] Category pills and view-toggle buttons repeat unabstracted ternary classes**
Why it matters: near-identical 4-line conditional class strings repeated 3-4x each (PartsCatalog.jsx:445-459, 531-563), `cn()` unused despite being installed; any future token fix (e.g. the red conflation above) requires hand-editing 6+ places.
Fix: extract a shared `FilterPill`/`ToggleButton` using `cn()`.
Suggested command: `/impeccable distill`

**[P2] No keyboard efficiency path in the Add Part wizard**
Why it matters: no Enter-to-advance, no verified keyboard nav through react-select or compatibility rows — a real per-part time cost for staff doing high-volume part entry.
Fix: bind Enter within step inputs to `nextStep()`, verify react-select keyboard nav survives the custom styling.
Suggested command: `/impeccable optimize`

## Persona Red Flags

**Alex (Power User)**: No bulk-add/CSV path; every part costs a mandatory 3-screen wizard minimum, no keyboard-only path through it.

**Sam (Accessibility-Dependent)**: Low-stock toggle hides the real `<input type="checkbox">` (`className="hidden"`, PartsCatalog.jsx:592) — screen reader/keyboard users lose native checked-state announcement, relying entirely on label styling. Category pills have no `aria-pressed` despite acting as toggle buttons.

**Riley (Stress-Tester)**: Closing the Add Part drawer mid-flow with no confirm (P0) is the clearest failure — an interrupted user loses work silently, no draft recovery.

## Minor Observations

- `formMinStock` initializes to `0` (AddPartDrawer.jsx:43) but resets to `''` on effect (line 58) — inconsistent empty-vs-zero state.
- Image upload size violation uses native `alert()` (AddPartDrawer.jsx:390) — breaks visual system mid-flow.
- "Recommended Sort" default is undiscoverable — no tooltip explaining the ordering logic.
- Sub-category pills use `text-2xs` (PartsCatalog.jsx:484) — worth checking legibility at warehouse-floor viewing distance.

## Questions to Consider

1. Was DESIGN.md's Two-Red Rule written after this UI, or does this UI simply predate/ignore it?
2. If "clone template" is common enough to warrant a dedicated escape hatch, why is the default path still a full 3-step wizard instead of clone-first, single-screen review?
3. Has the hidden-checkbox-plus-styled-label pattern ever been tested with a screen reader, or does the visual pass stand in for an accessibility pass?

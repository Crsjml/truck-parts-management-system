---
target: admin sales analytics (Analytics.jsx)
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-03T13-05-03Z
slug: frontend-src-components-analytics-jsx
---
Method: dual-agent (A: a268ea531534e6241 · detector: inline CLI, deterministic) — browser visualization skipped, no reachable dev server (localhost:5173 timeout).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state for category fetch; status update has no pending indicator |
| 2 | Match System/Real World | 3 | `ORDER_PLACED` all-caps enum leaks into option list next to plain-cased siblings |
| 3 | User Control and Freedom | 1 | No Escape-key close on modal/drawer; treemap drill has no breadcrumb past 1 level |
| 4 | Consistency and Standards | 2 | Two different status-badge visual treatments; casing inconsistency |
| 5 | Error Prevention | 2 | Status change is bare select, no confirm, live PUT with no rollback UI |
| 6 | Recognition Rather Than Recall | 2 | Icon-only zoom/download buttons, no aria-label, title-only |
| 7 | Flexibility and Efficiency | 1 | Zero keyboard path anywhere; double-click-only invoice open |
| 8 | Aesthetic and Minimalist Design | 2 | 4 chart cards duplicate near-identical header markup, ~30 lines x4 |
| 9 | Error Recovery | 1 | Blocking native `alert()` on failure, no inline/toast, no retry |
| 10 | Help and Documentation | 1 | No explanation of rank-delta badges, zero contextual help |
| **Total** | | **18/40** | **Poor** |

## Design Specificity Verdict

**Generic dashboard-by-numbers** — the exact anti-reference DESIGN.md bans. Swap labels for any SaaS admin, it drops in unchanged. Only domain touch is the ₱ symbol (data, not design). No fitment framing, no truck-parts visual identity. One bright spot: the Top Movers rank-delta mechanic (▲/▼/NEW period-over-period) is genuine domain thinking — everything else is recharts defaults in slate/emerald/violet Tailwind stock colors.

**Deterministic scan**: `detect.mjs --json` on the file returned `[]` (clean, exit 0) — no automated-detector findings. Detector doesn't catch token-drift/hardcoded-hex issues at this granularity; Assessment A's manual color audit below is the real signal here.

**Visual overlays**: skipped — no reachable dev server (`localhost:5173` timed out). No browser evidence available this run.

## Color-Token Compliance (Assessment A manual audit)

DESIGN.md defines exactly 4 semantic colors (Fleet Navy, Signal Red, Alarm Red, hairline) + neutrals + parts-blue/parts-red category ramps. This file introduces an undocumented ad-hoc palette:

- Tooltip/stroke slate hardcoded hex (`#0f172a`, `#1e293b`) at lines 32, 46, 296, 306, 349, 581, 610, 620, 634 — should be `hairline`/`card` tokens.
- Stock `blue-200`, `purple-400/950/800`, `emerald-400/500/950`, `rose-400/950/800`, `amber-500`, `violet-950/400` scattered across badges, status colors, KPI icons (lines 59, 79, 82, 85, 173, 176, 213, 216, 364, 487-490) — none map to documented tokens.
- **P1 violation of the Two-Red Rule**: line 428 `focus:border-red-600` on the ledger search input — stock red focus ring, not `glowing-red-border`/`glowing-blue-border` per DESIGN.md's documented pattern.
- **Cancelled status** (lines 175, 489) uses stock `red-500`, not the `alarm-red` token — this is precisely the destructive/error case Alarm Red exists for, and it's missing.
- Invoice number rendered in stock `text-red-500` (line 466) — pure decoration, exactly what Signal Red is reserved against.
- Line 765 correctly uses `brandBlue` token — but applies a hover **shadow** (`shadow-brandBlue-500/20`) to an Admin/POS surface, violating the Flat-Admin Rule (no hover-lift/glow on admin, no exceptions).

Verdict: not deliberate category-coding (unlike parts-blue/parts-red) — accidental drift, per-chart ad-hoc Tailwind swatch choices with no system.

## Overall Impression

Functionally solid (memoized computations, real merchandising insight in Top Movers) but visually and structurally generic, keyboard-inaccessible, and non-compliant with the project's own color-token system in multiple places — including a direct Two-Red Rule violation and a Flat-Admin Rule violation. 18/40 is Poor: this needs a real pass, not polish.

## What's Working

1. KPI tile row correctly chunks to 4 items (line 212-217), reuses `KpiTile` component — clean chunking rule compliance.
2. Top Movers rank-delta badge mechanic (lines 69-106) is genuine domain-specific insight, not boilerplate — worth leaning into harder as the design-specificity anchor.
3. Derived chart data is properly memoized against `period`/`localTransactions` (lines 181-196) — no wasted recompute.

## Priority Issues

**[P0] No keyboard escape/focus-trap on modal & invoice drawer** (lines 546-655, 658-775)
Why it matters: fails WCAG 2.1.2 No Keyboard Trap; keyboard/switch-access users get stuck needing to mouse-click a specific X.
Fix: shared `useEffect` keydown listener for Escape on both overlays, `role="dialog" aria-modal="true"`, initial focus move on open.
Suggested command: `/impeccable harden`

**[P0] Icon-only buttons with no aria-label** (lines 228, 281, 323, 367, 501, 567, 691)
Why it matters: screen readers announce bare "button," zero context — 4 zoom triggers + download + close, all affected.
Fix: add `aria-label` alongside existing `title` on every icon-only control.
Suggested command: `/impeccable harden`

**[P1] Two-Red Rule violated on search focus + Cancelled status** (line 428 `focus:border-red-600`; lines 175, 489 stock `red-500`)
Why it matters: directly contradicts DESIGN.md's documented focus-ring and destructive-color pattern — the one place Alarm Red should appear (Cancelled), it doesn't; the one place it shouldn't (a neutral search box), it does.
Fix: search input → `glowing-blue-border` (Fleet Navy, neutral action). Cancelled status → `alarm-red` token.
Suggested command: `/impeccable polish`

**[P1] Undiscoverable double-click-to-open-invoice** (line 463)
Why it matters: business-critical action (view/download invoice) hidden behind a gesture with zero visible affordance, hover-only `title` hint.
Fix: explicit "View" icon/button in its own column; drop the double-click-only pattern.
Suggested command: `/impeccable clarify`

**[P2] Duplicated chart JSX between inline card and zoom modal** (lines 238-257 vs 575-588, repeated x4 chart types)
Why it matters: ~150 lines copy-pasted recharts config; already drifted once (inline `barSize={24}` vs zoomed `barSize={40}`).
Fix: extract one parameterized `<ChartRenderer size="sm"|"lg" />` per chart type.
Suggested command: `/impeccable distill`

## Persona Red Flags

**Alex (Power User)**: Zero keyboard path anywhere (zoom, drill, invoice, status). Double-click-to-open invoice is slower than a single click or explicit button. Blocking `alert()` on every status-update failure interrupts a fast-moving counter workflow. `ORDER_PLACED` all-caps artifact breaks scanability in a list Alex scans dozens of times a day.

**Sam (Accessibility)**: No `aria-label` on any icon-only button. No Escape-key close anywhere. 10-11px badge text (lines 59, 96, 99) on tinted/opacity-reduced backgrounds — contrast very likely fails WCAG AA at this size. Rank-delta badges convey meaning via color+tiny-glyph only, no `sr-only` text equivalent.

## Minor Observations

- 3 different empty-state phrasings for the same "zero transactions" case ("No data for selected period.", "No revenue data for categories.", "No products sold yet.") — inconsistent voice.
- Pagination `itemsPerPage`/`5` hardcoded in 5 separate places (lines 451, 520, 523, 534, 536) instead of one module constant.
- Category treemap drill-down supports exactly one undo level — a 2+-level category tree (plausible for truck parts: Engine → Filters → Oil Filters) has no way back to an intermediate level.
- Framer-motion spring/scale transitions on drawer and modal spend real motion budget on a surface CLAUDE.md scopes as "operational-speed only."

## Questions to Consider

- What if Top Movers' rank-delta mechanic extended to the whole dashboard as the primary visual anchor, instead of being one chart among four equal-weight cards?
- Does the zoom-modal pattern (one chart full-screen at a time) earn its complexity, or would a single denser default layout serve staff faster?
- What would this screen look like if built truck-parts-first — categories, fitment, seasonal parts cycles — instead of generic revenue/payment-mix charts?
</content>

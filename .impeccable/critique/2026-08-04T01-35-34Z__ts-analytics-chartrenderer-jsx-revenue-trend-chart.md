---
target: admin sales analytics revenue trend graph
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
timestamp: 2026-08-04T01-35-34Z
slug: ts-analytics-chartrenderer-jsx-revenue-trend-chart
---
Method: dual-agent (A: a51dc2f50b7837055 · B: a423055667e85e3f4)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Pulse skeleton + empty state present; skeleton has no `aria-busy`/label for screen readers |
| 2 | Match System / Real World | 3 | ₱ currency correct, plain-language "Current/Prior Period" labels |
| 3 | User Control and Freedom | 2 | Can't toggle a line off or change comparison baseline from the card itself |
| 4 | Consistency and Standards | 2 | Tooltip/grid/tick hex literals redefined per chart type instead of one shared theme |
| 5 | Error Prevention | 3 | n/a mostly — read-only chart, no destructive actions |
| 6 | Recognition Rather Than Recall | 3 | Legend + axis labels remove memorization need |
| 7 | Flexibility and Efficiency | n/a | Operate-tier admin, no power-user shortcuts expected |
| 8 | Aesthetic and Minimalist Design | 2 | Clean but under-designed — no token-driven TTP identity |
| 9 | Error Recovery | 2 | Empty state gives no suggested next action |
| 10 | Help and Documentation | n/a | Not applicable to an inline chart widget |
| **Total** | | **20/32** | **Acceptable (62.5%)** |

## Design Specificity Verdict

**LLM assessment**: Stock Recharts configuration, not an authored TTP admin surface. The `LineChart` (ChartRenderer.jsx:59-74) is a tutorial-default setup — default `CartesianGrid strokeDasharray="3 3"`, default `Legend`, hardcoded slate/emerald hex with zero reference to `hsl(var(--...))` tokens. The one genuine TTP-specific investment is the `sr-only` data table (lines 40-58). DESIGN.md's own anti-reference bans admin reading as "a generic dashboard-by-numbers" — this chart currently reads exactly that way.

**Deterministic scan**: `node detect.mjs --json` on `Analytics.jsx` + `ChartRenderer.jsx` → exit 0, zero findings. No false positives to report since nothing fired.

**Visual overlays**: Browser evidence unavailable — the Claude-in-Chrome extension did not connect this session ("Browser extension is not connected... ensure the extension is installed and running and logged into the same claude.ai account"). Dev server itself was confirmed live (`localhost:5173` → 200). No user-visible overlay exists; treat this critique as static-code-only for visual claims, verify contrast/dark-mode in a real browser separately.

## Overall Impression

The chart is legible and has a real a11y investment (sr-only table, dash-pattern series differentiation) that most Recharts integrations skip. But every visual property is a raw hex literal never touched since first paste, untested against light mode, and disconnected from DESIGN.md's token vocabulary — the biggest opportunity is making this chart demonstrably *TTP's*, not generic Recharts output, and giving the shop owner the "so what" number instead of two lines to eyeball.

## What's Working

- `sr-only` `<table>` fallback (ChartRenderer.jsx:40-58) gives screen readers full period/current/prior data — an uncommon, deliberate accessibility investment.
- `strokeDasharray="4 4"` on "Prior Period" (line 72) makes the two series distinguishable by pattern, not hue alone.
- Escape-key handling on the zoomed/modal chart view (Analytics.jsx:51-60) is a small but real keyboard-UX detail.

## Priority Issues

**[P0] Hardcoded hex bypasses the token system, untested in light mode**
- Why it matters: DESIGN.md mandates one token vocabulary and dual-theme support (`darkMode: 'class'`) across both tiers. `#0f172a` tooltip bg only works against a dark canvas — against light-mode `paper` (`hsl(210 40% 98%)`) it becomes a disconnected dark chip with no evidence it was ever checked in light mode.
- Fix: Replace literals (`#0f172a`, `#1e293b`, `#94a3b8`, `#f8fafc`, `#059669`, `#9ca3af`) with `hsl(var(--...))` token references so the chart repaints correctly on theme toggle, same as the rest of the admin shell.
- Suggested command: `/impeccable harden`

**[P1] "Current/Prior Period" hue (emerald/gray) isn't from the DESIGN.md vocabulary**
- Why it matters: Fleet Navy is the system's trust/primary color; Signal/Alarm Red are reserved for real alerts. `#059669`/`text-emerald-400` are Tailwind defaults that never appear in DESIGN.md — self-consistent with KPI tiles elsewhere, but untraced to any named token.
- Fix: Either formally adopt "emerald = positive trend" as a documented tertiary token in DESIGN.md, or repoint "Current Period" to Fleet Navy and reserve emerald/red strictly for KPI delta direction.
- Suggested command: `/impeccable colorize` (then `/impeccable document` to record the decision)

**[P1] Color-only differentiation risk in the tooltip despite dash pattern**
- Why it matters: Tooltip `itemStyle` renders both series' text in identical white (`#f8fafc`); the only differentiator inside the tooltip row is the swatch hue (emerald/gray), an accessibility gap for color-vision-deficient users even though the line body itself has a dash-pattern backup.
- Fix: Confirm Recharts' tooltip/legend icon actually renders the dasharray pattern (not a solid swatch) so the pattern backup reaches the tooltip too, not just the chart body.
- Suggested command: `/impeccable audit`

**[P2] No delta/context — chart doesn't answer "am I up or down"**
- Why it matters: The card shows two raw lines with no headline stat, even though `kpis.deltas?.revenue` is already computed for the KPI tiles above (Analytics.jsx:183). Forces the shop owner to cross-reference two separate parts of the page to connect "+12%" to "here's the shape of that."
- Fix: Add an inline delta badge to the Revenue Trend card header, reusing the `getRankDeltaBadge`-style pattern already built for Top Movers.
- Suggested command: `/impeccable layout`

**[P3] Tooltip/tick styling literals copy-pasted across 5 chart types**
- Why it matters: Same `contentStyle`/`itemStyle` block repeated verbatim across trend/movers/donut/payments/peak (lines 66-67, 106-108, 188-190, 226-228, 272-274) — a future token change means editing 6 near-identical blocks instead of one.
- Fix: Extract a shared `CHART_TOOLTIP_STYLE`/`CHART_AXIS_TICK` constant once the P0 token fix lands.
- Suggested command: `/impeccable distill`

## Persona Red Flags

**Jordan (First-Timer)**: No explanation of what "Prior Period" means (last 30 days? same period last month/year?) — no tooltip or info icon. Empty state ("No data for selected period.") gives no next action. The Zoom button (`ArrowsOut`) has no on-screen label, only `title`/`aria-label` — easy to miss it's clickable.

**Sam (Accessibility-Dependent)**: Tooltip/legend rely on color as the primary differentiator with only partial pattern backup (see P1). Loading skeleton (Analytics.jsx:205-207) has no `aria-busy`/label — a screen reader gets silence during load instead of a status announcement (Nielsen #1 gap). Focus-ring visibility on the Zoom button against DESIGN.md's `ring-2 ring-accent` fallback needs verification in rendered CSS, not assumable from JSX.

## Minor Observations

- `dot={data.length === 1}` (lines 71-72) is a reasonable single-point-series affordance but undocumented.
- `Legend wrapperStyle={{ paddingTop: '10px' }}` is a magic number, not a named spacing token.
- `TrendUp` icon uses `duotone` weight (consistent with Phosphor standardization) but its `text-emerald-400` tint breaks from the flat/monochrome header row elsewhere (compare `text-accent` on the neighboring Category Revenue card icon).

## Questions to Consider

- If "revenue is trending up" is the single most important thing this card communicates, why does the shop owner have to compute that themselves by eyeballing two lines instead of reading one number?
- Has this chart ever actually been reviewed in light mode, or only ever built and checked in dark mode against DESIGN.md's stated dual-theme requirement?
- Five chart types redefine the same tooltip/grid/tick styling from scratch — worth a shared `chartTheme.js` now, before a sixth chart type copies it again?

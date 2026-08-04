---
target: admin dashboard overview KPIs + subtitle
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-02T09-00-08Z
slug: frontend-src-components-dashboard-jsx
---
Method: dual-agent (A: a36b5cf02b646ca67 · B: af5ca562803f35e66) — browser/Playwright step skipped by user request; CLI detector only.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Hardcoded "Stable stock" trend (line 79) never reflects real state; no refresh/loading indicator |
| 2 | Match System / Real World | 2 | Generic e-commerce vocabulary ("Catalog Parts", "System Overview") instead of counter-clerk domain language |
| 3 | User Control and Freedom | 2 | No KPI time-window control, no undo on Restock click-through, no warning dismissal |
| 4 | Consistency and Standards | 2 | Glass-panel hover-glow escalation on KPI cards contradicts this codebase's own Flat-Admin Rule |
| 5 | Error Prevention | 2 | Restock button fires setTimeout-based CustomEvent with no confirmation of arrival |
| 6 | Recognition Rather Than Recall | 3 | Watchlist table headers and deficit math are clear and self-explanatory |
| 7 | Flexibility and Efficiency of Use | 1 | No drill-down from KPI cards despite identical click-to-filter pattern existing two sections down |
| 8 | Aesthetic and Minimalist Design | 1 | Glow-hover escalations, blurred gradient orb, four unrelated accent colors on one KPI row — most severe violation on the page |
| 9 | Error Recovery | 2 | Severity color-coded but no explanation of "deficit" or what resolves it |
| 10 | Help and Documentation | 1 | Zero in-context help; static "Quick Tip" unrelated to the data on the page |
| **Total** | | **18/40** | **Poor — major UX rework needed** |

## Design Specificity Verdict

**LLM assessment**: Reads as a generic e-commerce/inventory admin skinned with truck-parts copy, not authored for the domain. Swap "Catalog Parts" for "Products" and "Total Invoiced Sales" for "Revenue" and it's indistinguishable from a Shopify admin template. The one genuinely domain-specific signal — a stockout on a part that keeps a truck off the road, higher-stakes than typical retail low-stock — gets flattened into the same amber/red badge language any SKU dashboard uses. The product's "Right Fit" north star doesn't surface here even thematically.

**Deterministic scan**: `detect.mjs --json` on `frontend/src/components/Dashboard.jsx` returned exit 0, zero findings. This does not contradict the design review — the violations found (fabricated trend data, tier/motion-spec violations, decorative color coding, missing drill-down) are semantic and cross-file (DESIGN.md compliance) rather than the kind of static per-file pattern the detector's ruleset catches. Treat "clean scan" here as a coverage gap, not a clean bill of health.

**Visual overlays**: Skipped by user request — no browser/Playwright pass this run. No overlay evidence to report.

## Overall Impression

The underlying data logic (severity/deficit computation, merged activity stream) is sound, but the presentation actively undersells and in one case misrepresents it. The single biggest opportunity: this page currently treats all 4 KPIs and all 20 activity-log entries as equally important, when the actual job of an admin dashboard opener is "tell me in 2 seconds if today is a normal day or a bad one" — right now that signal is buried under decorative color and a fabricated trend claim.

## What's Working

- Lines 10-17: low-stock computation (severity, deficit, sort by deficit descending) is well-modeled business logic — the data model is doing the right thing even where the UI doesn't surface it.
- Lines 177-186: click-to-filter handoff from a watchlist row to the catalog page with a pre-applied SKU filter is a real, non-obvious UX affordance.
- Lines 219-229: unifying `logs` and `transactions` into one time-sorted activity stream (rather than two separate lists) is a sound information-architecture call.

## Priority Issues

**[P0] Fabricated status data.** Line 79's "Stable stock" with a `TrendUp` icon is a static string, not derived from any calculation — renders identically whether inventory rose, fell, or flatlined. Why it matters: actively violates Heuristic #1, and it's not neutral, it's false information a staff member could act on. Fix: compute a real period-over-period delta, or remove the trend claim and show a neutral fact ("as of today"). Suggested command: `/impeccable harden`.

**[P0] Flat-Admin Rule violation.** KPI cards use `hover:border-t-brandBlue-400` / `hover:border-t-emerald-500/30` / `hover:border-t-amber-500/30` (lines 60, 72, 104) plus `transition-all duration-300`, and the welcome banner has a decorative blurred glow orb (`blur-3xl`, line 25) — both are storefront-tier `.glass-panel-hover` behaviors on an Area B minimalist surface. Why it matters: DESIGN.md's Named Rule is explicit, no exception for "just this once" — this is the most direct spec violation in the file. Fix: strip hover color-shift and the blur orb; differentiate cards by border/icon color only, no motion escalation. Suggested command: `/impeccable quieter`.

**[P1] KPIs aren't clickable despite the pattern existing on the same page.** None of the 4 KPI cards (58-116) route anywhere, while watchlist rows two sections down do exactly this (177-182). Why it matters: violates Heuristic #7 — a user glancing at "Stock Warnings: 3" has no way to jump to that filtered view without scrolling down and re-finding the same information. Fix: make the Stock Warnings card `onClick` reuse the event pattern already built at lines 198-202. Suggested command: `/impeccable layout`.

**[P1] Decorative rather than semantic KPI icon coloring.** Blue (Package, 66), emerald (CurrencyDollar, 82), amber (FileText, 112) carry no consistent meaning — emerald is "good" on the asset-value card but reused for the empty-state checkmark (137) and log badges (237); amber has no defined semantic register at all. Why it matters: DESIGN.md's Two-Red Rule shows this codebase already cares about non-arbitrary color meaning; these four hues fail that same standard on the primary landing view. Fix: reserve color for state (destructive/warning/neutral), drop decorative rainbow-coding of unrelated metrics. Suggested command: `/impeccable colorize`.

**[P2] All-time cumulative KPIs with no period framing.** `inventoryValue` (line 9) and `totalRevenue` (line 19) sum over the entire dataset lifetime with no date range, no comparison, no "since when." Why it matters: Heuristic #6 — a user can't tell if a total is today's number or three years of accumulated invoices without leaving the page. Fix: scope to a rolling period (today/week/month) with an explicit label, or add a comparison delta. Suggested command: `/impeccable clarify`.

## Persona Red Flags

**Alex (Power User / counter staff, fast operational read)**: Cannot tell at a glance whether "Stock Warnings: 3" is mildly-low or a full stockout — must scroll to the watchlist and read per-row severity. Loses time because the KPI card isn't clickable (has to manually navigate to Manage Inventory and re-filter). "Stable stock" (line 79) actively misinforms Alex's mental model even when it isn't true. The merged activity log (219-256) has no filter/sort control to isolate "just stock events" during a busy shift.

**Sam (Accessibility-Dependent User)**: Stock Warnings severity (88-101) is communicated purely through text color with no shape/label difference between critical and warning — fails color-alone-conveys-meaning. The activity log's `overflow-y-auto max-h-[300px]` region (219-256) has no `aria-live` region, so screen-reader users get no announcement of new entries. Neither table (144-193) has a caption or `aria-label` describing its purpose for screen-reader table navigation. Table headers use plain `<th>` with no `scope="col"` (147-151).

## Minor Observations

- Lines 259-263: "Quick Tip" is static onboarding copy that never changes context — after day one it's dead weight competing with the real activity feed.
- Lines 30-32: welcome banner subtitle is marketing-tone copy that never updates — same shape of problem as the fake trend indicator, lower stakes.
- Lines 244-245: log type badges use `capitalize` on raw `log.type` — a new log type with irregular casing/spacing would silently look broken.
- Lines 75/107: `title={formatCurrency(...)}` hover tooltip for precise currency value is invisible to keyboard-only and touch users — no equivalent affordance for them.
- Line 155/196: watchlist truncates to top-5 by deficit with a "view all" fallback only above 5 — reasonable, but worth checking against the ≤4-items-per-chunk cognitive-load guideline.

## Questions to Consider

- If "Stable stock" can be true or false regardless of what's actually happening, what does that say about how much this dashboard is designed to be looked at versus trusted?
- The click-to-filter pattern already exists twice in this file for watchlist rows — why doesn't the KPI row, the first thing anyone sees, get the same treatment?
- Given the "Right Fit" fitment framing meant to run through the whole product, what would this dashboard look like if it surfaced fitment/compatibility risk instead of generic e-commerce KPIs?

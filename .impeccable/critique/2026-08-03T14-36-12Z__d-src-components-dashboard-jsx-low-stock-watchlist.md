---
target: Low-Stock Watchlist (Dashboard.jsx)
total_score: 21
max_score: 36
na_heuristics: 9
p0_count: 2
p1_count: 2
timestamp: 2026-08-03T14-36-12Z
slug: d-src-components-dashboard-jsx-low-stock-watchlist
---
Method: dual-agent (A: design-review subagent · B: static detector, browser step skipped per user instruction "no playwright")

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Severity counts + "updated {time}" good; no stale-data indicator |
| 2 | Match System / Real World | 2 | "Requires action" / "safety threshold levels" — corporate-generic, not shop-floor language |
| 3 | User Control and Freedom | 2 | No clear-selection affordance, no undo after bulk restock dispatch |
| 4 | Consistency and Standards | 3 | Restock styling consistent; header select-all silently scopes to 5 (see P0) |
| 5 | Error Prevention | 1 | Select-all + bulk restock while hidden low-stock items exist = silent scope trap |
| 6 | Recognition Rather Than Recall | 2 | 5-row cap not labeled inline; user must notice "View all N" below |
| 7 | Flexibility and Efficiency | 3 | Bulk select + export + multi-filter genuinely efficient |
| 8 | Aesthetic and Minimalist Design | 3 | Dense but reasonably chunked header |
| 9 | Error Recovery | n/a | No destructive path here — restock just dispatches to Purchasing |
| 10 | Help and Documentation | 2 | No tooltip explaining deficit/severity/restock before nav-away |
| **Total** | | **21/36** | **Acceptable (58%)** |

## Design Specificity Verdict

**LLM assessment**: Mostly generic. Copy, iconography, column set (Part/Deficit/Stock/Min/Action) — nothing signals "truck parts shop" specifically. This is a stock low-stock-widget any e-commerce admin could ship unchanged. Fails DESIGN.md's own anti-reference: "admin read as generic dashboard-by-numbers."

**Deterministic scan**: `detect.mjs --json` on `Dashboard.jsx` returned `[]`, exit 0 — no mechanical token/pattern violations (no glass-panel-hover misuse, no stray gray, no default-color leaks detected). The detector is silent on the UX/a11y issues below because those are semantic, not mechanical.

**Visual overlays**: Skipped — user asked to skip Playwright/browser inspection this run. Static code + detector only.

## Overall Impression

Functionally solid, useful widget (filter, bulk-select, export, restock hand-off) let down by generic copy and a genuinely dangerous interaction gap: "select all" only ever means "select the 5 visible rows," and nothing tells the user that when they bulk-restock.

## What's Working

- Icon+color pairing for severity (`WarningOctagon` vs `WarningCircle`) avoids color-only signaling.
- The KPI cards above the table (L126-148, L169-198) correctly implement `role="button"` + `onKeyDown` + focus ring — a good keyboard-a11y pattern that just didn't make it into the table rows.
- Empty state (L290-297) is calm and on-brand, no dead-end messaging.

## Priority Issues

**[P0] Silent bulk-restock scope mismatch** — `Dashboard.jsx:306-317` header checkbox selects only `filteredLowStockItems.slice(0, 5)`, but reads as "select all." Combined with `Restock Selected` (L264-270), a user can believe they've restocked every low-stock part when items 6+ were never in scope.
Why it matters: staff make real purchasing decisions off this; a silent gap here is a stock-out risk, not a cosmetic bug.
Fix: label it "Select visible" (or disable/hide past 5), and show a live count on the Restock button ("Restock 5 of 12 selected").
Suggested command: `/impeccable clarify`

**[P0] Checkboxes have no accessible name** — `Dashboard.jsx:303-317, 342-352`. Screen reader hears "checkbox, not checked" with no part name or "select visible" context.
Fix: `aria-label={`Select ${part.name}`}` per row; `aria-label="Select all visible rows"` on the header checkbox.
Suggested command: `/impeccable audit`

**[P1] Row-click-to-select isn't keyboard operable** — `Dashboard.jsx:331-339` toggles selection on `onClick` with no `role`, `tabIndex`, or `onKeyDown`, unlike the KPI cards a few dozen lines up in the same file that already do this correctly.
Fix: either add matching keyboard handlers to the `<tr>`, or drop the row-click affordance and rely on the checkbox alone (simpler, avoids the two-click-targets-per-row problem Assessment A also flagged).
Suggested command: `/impeccable audit`

**[P1] Stale selection survives filter changes** — `Dashboard.jsx:60-66, 267`. Changing severity/category filters doesn't prune `selectedWatchlistItems`; a part can stay "selected" after scrolling out of view, then get bulk-restocked with zero visibility.
Fix: prune the selection set to intersect with `lowStockItems` ids whenever `severityFilter`/`categoryFilter` change.
Suggested command: `/impeccable harden`

**[P2] Generic, corporate copy** — "Requires action" (L192), "Warehouse items falling below safety threshold levels." (L241).
Fix: shop-floor voice — e.g. "5 parts need reordering" / "Parts below reorder point."
Suggested command: `/impeccable clarify`

## Persona Red Flags

**Alex (Power User)**: Trusts "select all" to mean all. Bulk-restocks 5 of 12 flagged parts, dispatches to Purchasing believing the job is done. No count reconciliation anywhere in the flow.

**Sam (Accessibility-Dependent)**: Can't reach row-selection via keyboard at all (only the nested checkbox is tabbable, and even that has no name). Screen reader gets no part context on any checkbox.

**Riley (Stress Tester)**: Changes severity filter mid-selection, selection set silently retains now-hidden ids, `filteredLowStockItems.filter(p => selectedWatchlistItems.has(p.id))` at L267 restocks parts the user can no longer see on screen.

## Minor Observations

- `Restock Selected` and `Export` buttons are equal visual weight (L264-283) with no clear primary action.
- "View all N warnings" only appears past 5 items (L393-405); no persistent "Showing 5 of N" earlier in the header.
- Severity `ToggleChip` active-state relies on unverified color/style-only distinction (not confirmed as non-color-coded).

## Questions to Consider

- Should "select all" ever exist while the table caps at 5 visible rows, or should bulk-select be disabled until the user opens "View all"?
- Does staff actually read "Requires action," or do they act off the number alone — does the copy need to exist at all vs. just a stronger number treatment?

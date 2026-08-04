---
target: frontend/src/components/Analytics.jsx
total_score: 30
max_score: 36
na_heuristics: 9
p0_count: 1
p1_count: 1
timestamp: 2026-08-03T14-10-14Z
slug: frontend-src-components-analytics-jsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Title dynamically updates; explicit empty states |
| 2 | Match System / Real World | 3 | Treemap accurately maps to portfolio allocation |
| 3 | User Control and Freedom | 4 | Back button to escape drill-down; escape key listener |
| 4 | Consistency and Standards | 4 | Aligns with minimalist-ui guidelines |
| 5 | Error Prevention | 3 | Checks for SVG dimension limits and zero revenue |
| 6 | Recognition Rather Than Recall | 3 | Tooltips provide full names; active drill path clearly labeled |
| 7 | Flexibility and Efficiency | 3 | In-place drilling allows rapid exploration |
| 8 | Aesthetic and Minimalist Design | 4 | Suppresses chaotic chart colors; sleek monochrome scale |
| 9 | Error Recovery | n/a | Empty states are treated as status, not errors |
| 10 | Help and Documentation | 2 | No explicit on-screen hint that treemap is interactive/drillable |
| **Total** | | **30/36** | **Good** |

### Design Specificity Verdict

**LLM assessment**: The design is deeply integrated and highly specific. It utilizes the app's established design tokens (minimalist dark-mode styling, glass panels), specific Phosphor icons, and custom currency formatters. The dynamic HSL coloring precisely matches the overarching brand blues of the Admin tier rather than relying on generic default palettes.

**Deterministic scan**: The CLI detector found 0 issues. No anti-patterns were detected in `Analytics.jsx`.

**Visual overlays**: (No live server overlays injected as this was evaluated statically via source/detector.)

### Overall Impression
Clean, authoritative, and professional layout that feels premium yet functional. The drill-down mechanics and dynamic HSL color math are excellent, but the component suffers from severe accessibility issues and a lack of explicit affordances that make discovering the interactions difficult.

### What's Working
1. **Seamless Drill-Down Mechanics**: The `onDrill` state logic elegantly updates the panel title and injects a "Back" button into the header, maintaining context without complex breadcrumbs.
2. **Monochromatic Scaling via Math**: Dynamically calculating cell lightness (`hsl(217, 85%, ...)`) based on ratio to max revenue enforces strict minimalist compliance over rigid classes.

### Priority Issues

- **[P0] Accessibility Black Box**
  - **What**: The SVG elements handling clicks lack `role="button"`, `tabIndex`, or aria-labels.
  - **Why it matters**: Keyboard and screen-reader users are completely trapped out of exploring the treemap hierarchy.
  - **Fix**: Add proper ARIA roles, `tabIndex={0}`, and `onKeyDown` handlers for Enter/Space to the clickable `<rect>` or `<foreignObject>` elements.
  - **Suggested command**: `$impeccable audit`

- **[P1] Invisible Affordance for Drilling**
  - **What**: No explicit microcopy (e.g., "Click to view sub-categories") to indicate interactability.
  - **Why it matters**: Users only discover the drill-down if they happen to hover and notice the cursor change, reducing feature discoverability.
  - **Fix**: Add a small hint text above the chart or an internal visual cue within the cells (like a small plus icon or explicit border).
  - **Suggested command**: `$impeccable clarify`

- **[P2] Hardcoded Color Magic Numbers**
  - **What**: HSL strings and tooltip colors (`#0f172a`, `#1e293b`) are hardcoded in `ChartRenderer.jsx` instead of using Tailwind theme tokens.
  - **Why it matters**: This risks visual drift and breaks if the global theme tokens are ever updated.
  - **Fix**: Map these colors to Tailwind CSS variables or standard token names in the component.
  - **Suggested command**: `$impeccable polish`

- **[P2] Redundant Tooltips**
  - **What**: Using the native HTML `title` attribute inside `<foreignObject>` alongside Recharts tooltips.
  - **Why it matters**: The browser's native yellow tooltip appears simultaneously with the styled Recharts tooltip, creating visual conflict and clutter.
  - **Fix**: Remove the native `title` attributes and rely purely on the custom Recharts tooltip for data delivery.
  - **Suggested command**: `$impeccable polish`

### Persona Red Flags

**Alex (Power User)**: 
- May be frustrated by the lack of a data grid/table view to quickly see exact percentage allocations or copy-paste data, as treemaps are hard to quickly copy from.

**Sam (Accessibility-Dependent User)**:
- The entire widget is effectively unusable for keyboard navigation. Without focus indicators or ARIA labels on the SVG rects, Sam is trapped out of viewing category sub-levels.

### Minor Observations
- The "Back" button uses a raw textual arrow (`←`) rather than a Phosphor Icon (e.g., `ArrowLeft`), slightly breaking the strict iconography system.
- The `maxCatRevenue` logic cleverly defaults to `1` to avoid division by zero, a good defensive pattern.

### Questions to Consider
- If a single category constitutes 95% of revenue, the remaining 5% of categories become essentially unclickable; how does this UI handle extreme Pareto distributions?
- Does the user realize that clicking the "Zoom" button while drilled down persists the drilled state into the modal?

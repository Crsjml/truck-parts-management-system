---
target: Top Movers graph
total_score: 22
max_score: 28
na_heuristics: 7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-03T14-37-02Z
slug: top-movers-graph
---
Method: degraded (single-context: sub-agent spawn unavailable)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Rank changes shown with badges, empty states handled |
| 2 | Match System / Real World | 3 | "Top Movers" and delta rank are familiar concepts |
| 3 | User Control and Freedom | 3 | Zoom out and "View full report" available |
| 4 | Consistency and Standards | 3 | Tooltip and layout aligns with other charts |
| 5 | Error Prevention | 4 | Read-only display |
| 6 | Recognition Rather Than Recall | 4 | Names and rank deltas shown prominently |
| 7 | Flexibility and Efficiency | n/a | (Operate dashboard chart component) |
| 8 | Aesthetic and Minimalist Design | 2 | Generic blue bars (`#3b82f6`) conflict with muted admin palette |
| 9 | Error Recovery | n/a | (Read-only component) |
| 10 | Help and Documentation | n/a | (Read-only component) |
| **Total** | | **22/28** | **Good** |

#### Design Specificity Verdict

**LLM assessment**: The Top Movers graph functions decently using a horizontal Recharts `BarChart`, and the `MoverTick` component cleverly injects rank delta badges via SVG `foreignObject`. However, the visual aesthetics fall back to generic defaults (bright `#3b82f6` Tailwind blue), missing the opportunity to leverage the system's muted admin palette. It feels like a standard dashboard widget rather than an authored component for this specific product.

**Deterministic scan**: No issues found by the automated detector (`0` findings).

**Visual overlays**: Skipped.

#### Overall Impression
The underlying logic and data presentation are sound, particularly the rank change badges. However, the visual styling—specifically the bar colors and label positioning—needs refinement to align with the minimalist Admin design tier.

#### What's Working
- **Rank Change Badges**: The `MoverTick` component using `foreignObject` perfectly surfaces rank deltas without cluttering the tooltip.
- **Data Completeness**: Tooltips combine units sold with revenue gracefully, offering a complete picture.

#### Priority Issues
- **[P1] Visual Hierarchy / Color Clatter**: The bars use a generic, bright Tailwind blue (`#3b82f6`) rather than adhering to the Admin/POS minimalist "warm monochrome/muted pastels" mandate.
  - *Why it matters*: Breaks the design system's flat/muted bento grid aesthetic, causing visual fatigue.
  - *Fix*: Switch to `brandBlue-400` or a muted semantic color from the established tokens.
  - *Suggested command*: `$impeccable colorize`
- **[P2] Label Clipping Risk**: The Recharts label uses `position: 'right'` with a fixed `right: 60` margin. For items with very high volume, this label text might clip.
  - *Why it matters*: Data becomes unreadable if the largest bar extends too close to the container edge.
  - *Fix*: Implement an `insideRight` label or dynamically scale the right margin based on maximum value length.
  - *Suggested command*: `$impeccable layout`
- **[P3] Header Density**: The "View full report →" button and "Zoom" button are crammed together in the top right.
  - *Why it matters*: Increases cognitive load and accidental misclicks.
  - *Fix*: Standardize header actions. Perhaps move the zoom icon to a top-level absolute position or align the full report link below the chart.
  - *Suggested command*: `$impeccable polish`

#### Persona Red Flags

**Alex (Power User)**:
- Wants to see exactly what changed instantly. The badges satisfy this, but Alex might want to click a bar to jump directly to the item's detail page, which is currently non-interactive.

**Sam (Accessibility-Dependent User)**:
- The SVG `foreignObject` text and bars may not be easily navigable or readable by a screen reader. Recharts doesn't natively provide the best ARIA support out of the box.

#### Minor Observations
- The empty state ("No products sold yet") is centered text, which is fine, but could be enhanced with a muted icon to match the empty state style of other panels.
- Tooltip `contentStyle` correctly uses system variables (`hsl(var(--background))`).

#### Questions to Consider
- What if clicking a bar drilled down into the product's sales history?
- Does the "View full report" link belong inside the card header, or would a footer link feel less cluttered?

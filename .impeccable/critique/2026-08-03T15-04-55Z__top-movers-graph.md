---
target: Top Movers graph
total_score: 17
max_score: 24
na_heuristics: 3,5,7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-03T15-04-55Z
slug: top-movers-graph
---
Method: dual-agent (A: 13424fa5-0f3e-4528-8e46-5dad5d93e205 · B: d3021034-85ce-4cea-af3d-715d4766fd29)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Data and tooltips are clearly visible |
| 2 | Match System / Real World | 3 | "Movers" implies momentum; badges show it, but bars are static |
| 3 | User Control and Freedom | n/a | View-only chart |
| 4 | Consistency and Standards | 3 | Uses hardcoded `#3b82f6` rather than theme `accent` color |
| 5 | Error Prevention | n/a | No user input |
| 6 | Recognition Rather Than Recall | 4 | Information is fully visible without memorization |
| 7 | Flexibility and Efficiency | n/a | View-only chart |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, but the standard Recharts blue is uninspired |
| 9 | Error Recovery | n/a | No error states in view |
| 10 | Help and Documentation | n/a | Self-explanatory context |
| **Total** | | **17/24** | **Good** |

### Design Specificity Verdict

**LLM assessment**: The custom `MoverTick` (using SVG `foreignObject` to render Tailwind badges) is a highly specific, tailored touch that grounds the chart in the product's design system. However, the chart itself relies on a generic, off-the-shelf Recharts blue (`#3b82f6`). This creates a dissonance: the labels feel bespoke, but the data visualization feels interchangeable and misses the opportunity to visually express the product's unique context.

**Deterministic scan**: The automated detector found 0 issues (`detect.mjs` ran cleanly with no findings). 

**Visual overlays**: Skipped. Browser visualization and live-server injection are unavailable in this environment (fallback: CLI scan only).

### Overall Impression
A solid, functional component elevated by clever axis labeling, but it falls short of its emotional potential. "Top Movers" is an exciting metric, but the flat blue bars fail to convey the story of momentum and rank changes.

### What's Working
- **Custom Axis Labels**: Using `foreignObject` to render HTML/Tailwind inside the SVG axis is technically clever and allows for rich badge styling (rank deltas) that standard Recharts doesn't support well.
- **Rich Tooltips**: The tooltip effectively combines both volume and revenue, providing the necessary context without cluttering the main view.
- **Clean Layout**: The horizontal bar format is the perfect choice for displaying part names, ensuring maximum readability.

### Priority Issues
- **[P1] Missed Emotional Potential (Static Colors)**: 
  - **Why it matters**: A "Top Movers" graph should visualize momentum. A flat, hardcoded blue (`#3b82f6`) ignores the very data it represents (rank changes).
  - **Fix**: Color-code the bars based on the `rankDelta` (e.g., emerald for rising, amber/slate for stable/falling), or use a dynamic gradient.
  - **Suggested command**: `$impeccable colorize`
- **[P2] Thematic Disconnect**: 
  - **Why it matters**: The panel header icon uses `text-accent`, but the chart hardcodes a generic blue. If the app's accent color changes, this chart will look out of place.
  - **Fix**: Replace the hardcoded hex with a CSS variable mapped to the theme's primary/accent color, or inherit the color dynamically based on the delta.
  - **Suggested command**: `$impeccable polish`
- **[P3] Lack of Interactivity**:
  - **Why it matters**: Users seeing a "Top Mover" naturally want to know *why* it moved. Currently, it's a dead end.
  - **Fix**: Add an `onClick` handler to the bars or labels that drills down into the specific part's detailed sales history or opens a part detail drawer.
  - **Suggested command**: `$impeccable overdrive`

### Persona Red Flags

**Alex (Power User)**:
- Sees a part spiking in sales and tries to click the bar to investigate its history or inventory levels, but finds it's purely view-only. A frustrating dead end for analysis.

**Jordan (First-Timer)**:
- Might not immediately understand what the "+3" or "NEW" badges mean without a legend or a subtitle explaining that this tracks "Jump in Sales Rank". 

### Minor Observations
- The `radius={[0, 6, 6, 0]}` on the bars is a nice, modern touch that softens the standard Recharts look.
- The `foreignObject` has a fixed width of `210`. If a part name is exceptionally long, even with the `truncate` class, the spacing might feel cramped or misaligned on smaller screens.

### Questions to Consider
- What if the length of the bar represented revenue, and the color intensity represented the jump in rank?
- What would a confident version of this look like? (Perhaps removing the axis lines entirely and placing the value directly inside the bar?)
- Could clicking a top mover instantly filter the "Revenue Trend" graph above it to show just that part's trajectory?

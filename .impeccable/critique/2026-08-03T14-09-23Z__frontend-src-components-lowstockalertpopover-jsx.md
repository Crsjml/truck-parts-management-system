---
target: low stock alerts pop out in the admin ui
total_score: 29
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
timestamp: 2026-08-03T14-09-23Z
slug: frontend-src-components-lowstockalertpopover-jsx
---
Method: dual-agent (A: 9ef9625e-7984-4cea-9e60-57f2b6bf45c8 · B: ffb2f607-a5f9-439a-acbe-01939695a75a)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Crucial stock numbers are hidden behind a hover state |
| 2 | Match System / Real World | 3 | "Restock" paired with a consumer shopping cart icon |
| 3 | User Control and Freedom | 4 | Dismiss buttons effectively allow curating the alert list |
| 4 | Consistency and Standards | 4 | Solid usage of standard popover and list patterns |
| 5 | Error Prevention | 4 | Clear visual urgency prevents missing critical items |
| 6 | Recognition Rather Than Recall | 2 | Hiding data behind hover forces relying on short-term memory |
| 7 | Flexibility and Efficiency | 3 | Sorting is efficient, but hover mechanics slow down scanning |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, but hides essential data for the sake of minimalism |
| 9 | Error Recovery | 4 | Clear, distinct badges for Critical vs. Low states |
| 10 | Help and Documentation | n/a | Operational notification list |
| **Total** | | **29/36** | **Good** |

#### Design Specificity Verdict

**LLM assessment**: The component utilizes robust generic design tokens (`bg-background`, `text-foreground`, `bg-destructive`) and structurally resembles a standard SaaS notification dropdown. However, the data model (SKUs, min stock, current stock) and typographic choices (`font-mono` for SKUs) ground it in the reality of an inventory management system. It leans slightly generic; the use of a `ShoppingCart` icon for restocking feels more like B2C e-commerce than a B2B truck parts management system.

**Deterministic scan**: The CLI detector found 0 issues (clean scan).

**Visual overlays**: No reliable user-visible overlay is available (browser automation unsupported in this environment).

#### Overall Impression
A functionally intelligent component that undermines its own usefulness by hiding the most important operational data (stock counts) behind a hover interaction. Exposing this data permanently would elevate this from a pretty UI to a genuinely useful operational tool.

#### What's Working
1. **Intelligent Prioritization:** Sorting the list by the ratio of current stock to minimum stock (rather than just raw numbers) is a brilliant operational detail that matches urgency models.
2. **Excellent Empty State:** The use of `CheckCircle` and "All Stock is Healthy" provides positive reinforcement, turning a lack of alerts into a satisfying achievement.
3. **Typographic Nuance:** Using `font-mono` for the SKU is a small but highly effective touch that makes alphanumeric codes much easier to read and compare.

#### Priority Issues
- **[P1] Hidden Critical Data (Hover Anti-Pattern)**
  - **Why it matters**: In an operational context, users need data density and scannability. Playing "whack-a-mole" with the cursor to see stock levels breaks the core utility of a low-stock alert.
  - **Fix**: Remove the `group-hover` hide/reveal mechanic. Make the Current and Min stock tiles permanently visible.
  - **Suggested command**: `$impeccable layout`
- **[P1] Mobile/Touch Accessibility**
  - **Why it matters**: Relying on hover and focus-within for the dismiss button and stat tiles creates severe friction for tablet or mobile POS users, who have no hover state.
  - **Fix**: Surface primary actions (dismiss, restock) permanently on mobile viewports, or entirely.
  - **Suggested command**: `$impeccable adapt`
- **[P2] Iconography Mismatch**
  - **Why it matters**: A `ShoppingCart` implies consumer checkout, not a B2B procurement or warehouse restock action. It misaligns with the operational tone of an admin UI.
  - **Fix**: Replace `ShoppingCart` with an operational icon like `Package`, `Truck`, or `ArrowDownTray`.
  - **Suggested command**: `$impeccable clarify`

#### Persona Red Flags

**Alex (Power User)**: Will be instantly frustrated by the hover-to-reveal mechanic. Alex wants to glance at a list, see the numbers immediately, make a mental note, and move on. Hiding operational data for a "clean UI" blocks rapid scanning.

**Casey (Distracted Mobile User)**: Cannot trigger the hover state reliably to see the actual stock counts or access the dismiss and restock actions without tapping and accidentally triggering navigation or unexpected focus states.

#### Minor Observations
- The `max-w-[320px]` container combined with potentially long truck part names means the `truncate` class will be doing heavy lifting. A slightly wider popover might be warranted for B2B data.
- The dismiss behavior updates local state (`seenIds`) but doesn't persist to the backend, meaning alerts might return on refresh.

#### Questions to Consider
- If a user opens a "Low Stock Alert", why is the actual stock level treated as secondary metadata only worthy of a hover state?
- Does clicking the "Restock" button actually add the item to a shopping cart, or does it navigate to a Purchase Order flow?

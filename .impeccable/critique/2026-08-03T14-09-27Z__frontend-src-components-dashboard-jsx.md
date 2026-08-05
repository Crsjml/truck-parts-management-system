---
target: Low-Stock Watchlist
total_score: 27
max_score: 32
na_heuristics: 9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-03T14-09-27Z
slug: frontend-src-components-dashboard-jsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Clear empty states; explicit counts and visual distinction between critical vs warning. |
| 2 | Match System / Real World | 4 | "Deficit," "Stock / Min," and "Restock" perfectly match warehouse mental models. |
| 3 | User Control and Freedom | 3 | Good filtering options, but lacks a way to clear all filters with one click if many are set. |
| 4 | Consistency and Standards | 4 | Follows strong dashboard table conventions; color coding matches standard severity scales. |
| 5 | Error Prevention | 3 | Prevents guessing by routing the "Restock" action directly to the pre-filtered catalog item. |
| 6 | Recognition Rather Than Recall | 4 | All necessary context (SKU, current stock, minimum threshold, deficit) is visible inline. |
| 7 | Flexibility and Efficiency | 2 | Forces a 1-by-1 workflow. No bulk actions or keyboard shortcuts to process the list quickly. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean row design, but the header has slightly redundant summary badges competing with filters. |
| 9 | Error Recovery | n/a | (Read-only list, no destructive actions to recover from). |
| 10 | Help and Documentation | n/a | (Operate mode dashboard widget; self-explanatory list requires no deep documentation). |
| **Total** | | **27/32** | **Good** |

### Design Specificity Verdict

The Low-Stock Watchlist is highly specific to a physical inventory environment. It isn't a generic data table; it is explicitly authored to solve a warehouse triage problem. The "Deficit" column doing the math for the user (`minStock - stock`) rather than forcing them to calculate it is a great example of product-specific empathy. The visual language uses the established project components (ToggleChips, Glass Panels) well. 

**Deterministic scan**: The automated detector found 0 issues. No false positives were detected.

### Overall Impression
The watchlist is highly functional and provides clear visibility into low-stock items. It's clean and integrates perfectly with warehouse mental models. The biggest opportunity is to accelerate the workflow for power users by introducing bulk actions, avoiding the tedious 1-by-1 restock process.

### What's Working
1. **Action-Oriented Rows**: The inline "Restock" button routes the user directly to the catalog with the specific SKU pre-filtered. This turns a passive reporting tool into an active operational workflow.
2. **Progressive Disclosure**: Capping the table at 5 rows keeps the dashboard balanced. The "View all X warnings" button clearly indicates there is more without cluttering the initial view.
3. **Pre-calculated Deficit**: Showing the exact negative number of how far below the safety threshold a part has fallen is much more actionable than just showing current stock.

### Priority Issues

**[P1] Missing Bulk Actions for Triage**
- **Why it matters**: A busy warehouse manager facing 12 low-stock items doesn't have time to click "Restock," load the catalog, handle one item, return to the dashboard, and repeat 11 more times.
- **Fix**: Add checkboxes to the rows and a "Restock Selected" or "Create Purchase Order" bulk action button at the top of the table.
- **Suggested command**: `$impeccable shape`

**[P2] Reliance on Color Alone for Severity in Rows**
- **Why it matters**: In the table rows, the deficit number is colored red (`text-destructive`) or blue (`text-accent`) to indicate Critical vs Warning. For colorblind users, these might look identical, obscuring which items need urgent attention.
- **Fix**: Add a small icon (Warning vs Info) or a text badge next to the part name or deficit number to indicate severity independent of color.
- **Suggested command**: `$impeccable clarify`

**[P3] Redundant Summary Badge in Header**
- **Why it matters**: The header contains the filter chips on the left, but also a summary badge (`X critical · Y low`) on the right. This duplicates the KPI cards above the table and clutters the header space next to the Export button.
- **Fix**: Remove the right-aligned summary badge. Rely on the KPI cards and the filter chips themselves to convey the volume of issues.
- **Suggested command**: `$impeccable distill`

### Persona Red Flags

**Alex (Power User)**
- Frustrated by the "one-by-one" workflow. Alex expects to multi-select items and generate a single bulk restock order. The lack of keyboard navigation for iterating down the table and hitting 'Enter' to restock will feel sluggish.

**Sam (Accessibility-Dependent User)**
- As noted above, Sam may struggle to differentiate a "Warning" item from a "Critical" item in the table if they have red/green colorblindness, as the only differentiator in the row is the text color of the deficit number. 

### Minor Observations
- The `hover:bg-secondary/60` on the table row is nice, but clicking anywhere on the row doesn't trigger the restock—only the button does. Making the whole row clickable (while keeping the button for explicit affordance) would improve target size.
- The "Export" button is a nice touch, but it might be better placed alongside the "View all" button at the bottom, or moved to a general dashboard actions menu, as exporting a 5-item truncated list might confuse users expecting the full dataset.

### Questions to Consider
- If a user clicks "Restock", does it open the catalog in a new tab, or navigate away? If it navigates away, do they lose their place and their dashboard filters when they hit "Back"?
- What does a confident version of this workflow look like? (e.g., A slide-out drawer to handle the restock instantly without leaving the dashboard context at all).

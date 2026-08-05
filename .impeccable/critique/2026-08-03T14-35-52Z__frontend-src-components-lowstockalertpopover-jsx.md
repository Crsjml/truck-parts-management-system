---
target: Low Stock Alerts popover
total_score: 34
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
timestamp: 2026-08-03T14-35-52Z
slug: frontend-src-components-lowstockalertpopover-jsx
---
Method: dual-agent (A: 267da23a-c1a8-4013-91ff-8b16465db1da · B: a47a31ec-ddc2-4cb3-a17a-05ac99a00503)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Excellent empty state and clear stock levels |
| 2 | Match System / Real World | 3 | The `Package` icon for "Restock" is slightly abstract |
| 3 | User Control and Freedom | 3 | Dismissing items has no "Undo" capability |
| 4 | Consistency and Standards | 4 | Uses standard Popover and token-based spacing |
| 5 | Error Prevention | 4 | Provides clear stats to prevent blind ordering |
| 6 | Recognition Rather Than Recall | 4 | Displays both actual and min stock side-by-side |
| 7 | Flexibility and Efficiency | 4 | Inline action for restocking skips intermediate navigation |
| 8 | Aesthetic and Minimalist Design | 4 | Perfectly aligns with Admin tier rules: flat stats, zero gradients |
| 9 | Error Recovery | 4 | Clearly separates "Low" vs "Critical" |
| 10 | Help and Documentation | n/a | Operational notification list |
| **Total** | | **34/36** | **Excellent** |

#### Design Specificity Verdict

**LLM assessment**: The component is successfully grounded in the TTP domain through its specific data logic (subtracting `reservedStock`, tracking critical ratios, exposing SKU). However, visually, it relies on standard Tailwind dashboard tropes. While it adheres to the minimalist Admin tier guidelines, the UI layout is highly reusable and slightly lacks a unique signature.

**Deterministic scan**: The CLI detector found 0 issues (clean scan).

**Visual overlays**: No reliable user-visible overlay is available (browser automation unsupported in this environment).

#### Overall Impression
The recent layout fixes have elevated this from a frustrating interaction to a robust, highly scannable operational tool. Stock levels are immediately visible, solving the core data-density problem. It now functions excellently as a quick-reference alert center.

#### What's Working
1. **The Empty State:** The emerald check circle provides an excellent moment of relief for the user.
2. **Dense but Scannable Data:** The use of bento grids for "Current" and "Min" uses typography effectively to present dense data beautifully without hover friction.
3. **Intelligent Sorting:** Sorting by critical ratio instead of raw quantities is deeply user-centric.

#### Priority Issues
- **[P2] No Undo on Dismiss**
  - **Why it matters**: Dismissing an item (`X`) removes it immediately from local state without a toast or inline undo, creating frustration if accidentally clicked.
  - **Fix**: Wire up a global toast notification with an Undo action when an item is dismissed.
  - **Suggested command**: `$impeccable harden`
- **[P2] Proximity of Actions**
  - **Why it matters**: The Dismiss and Restock buttons are tightly packed (`gap-1`). On touch devices, this invites misclicks.
  - **Fix**: Increase the gap between the action buttons, or move the dismiss action to a different part of the card.
  - **Suggested command**: `$impeccable layout`

#### Persona Red Flags

**Alex (Power User)**: Might still be annoyed that dismissed alerts return on a hard page refresh since state is only kept locally, but the core scanning friction is gone.

**Casey (Distracted Mobile User)**: A busy parts manager quickly tapping through the interface on a tablet could easily fat-finger the "Dismiss" button instead of the "Restock" button due to their stacked proximity.

#### Minor Observations
- Dismissals are stored in local component state (`seenIds`). A page refresh resurrects all dismissed alerts.
- The `text-[10px]` for badges is bordering on too small for older monitors.

#### Questions to Consider
- If an item is "Critical," should the user even be allowed to dismiss it, or should it persistently demand attention until restocked?
- Does the user need to know *why* stock is low? What if the deficit is purely because of a massive `reservedStock` block from a pending order? Should that distinction be surfaced?

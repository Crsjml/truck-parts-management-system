---
target: Sales Invoice Ledger (MyOrders.jsx + OrderCard.jsx)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-04T01-57-28Z
slug: frontend-src-components-myorders-jsx
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | PDF generation has no loading/success/error feedback -- catch(err){console.error(err)}, MyOrders.jsx:140-142 |
| 2 | Match System / Real World | 3 | "Review" shown on unfulfilled ORDER_PLACED orders breaks real-world sequencing, OrderCard.jsx:110-117 |
| 3 | User Control and Freedom | 3 | Filters/tabs/modal all reversible, no traps |
| 4 | Consistency and Standards | 1 | 3 currency formats in one card (OrderCard.jsx:71,75,89); invoice navy diverges from Fleet Navy token; alert() instead of app's own ToastNotification.jsx |
| 5 | Error Prevention | 2 | Review form guards rating; PDF path has zero guard on tx.items despite it being provably optional |
| 6 | Recognition Rather Than Recall | 3 | Tabs/counts visible; undercut by silent filter-match failures |
| 7 | Flexibility and Efficiency | 2 | No sort/search by invoice #, no bulk download, no pagination |
| 8 | Aesthetic and Minimalist Design | 3 | Solid glass aesthetic; loses a point to decorative hover-glow on non-interactive header, equal-weight 3-button footer |
| 9 | Error Recovery | 0 | Zero user-facing message or recovery path on PDF failure |
| 10 | Help and Documentation | 2 | No explanation of Online vs Walk-in distinction or what "(DUPLICATE)" means to the customer |
| **Total** | | **20/40** | **Acceptable -- significant improvements needed** |

### Design Specificity Verdict

**LLM assessment**: Generic e-commerce order-history template with TTP branding painted on top, not designed from the "fitment" premise DESIGN.md calls the product's actual mechanism. Ironically, the generated PDF (real VAT/exchange-policy copy, Tarlac City address) is more TTP-specific than the on-screen card UI that produces it.

**Deterministic scan**: detect.mjs --json on MyOrders.jsx and OrderCard.jsx -> [], exit 0. Clean, no findings, no false positives.

**Browser evidence**: Unavailable -- Chrome extension not connected this session. Dev server confirmed live (localhost:5173 -> 200, /api/health -> 200). Route: MyOrders.jsx mounts inside CustomerStorefront.jsx:815-819 as the "orders" tab, needs a logged-in customer session. Seed creds in docs/seed-accounts.md for a future visual pass.

### Overall Impression

Functional, visually pleasant order-history grid, but breaks down where a "financial record" surface can't afford to: the PDF download (highest-stakes action on the page) has no feedback on success or failure, and duplicates a hardened canonical PDF builder with a worse, unsanitized copy.

### What's Working

1. Segmented purchase-type + status-tab filtering with live counts (MyOrders.jsx:158-207) -- legible, well-grouped IA.
2. Card composition mirrors invoice structure sensibly; font-mono on money values aids legibility.
3. Empty state has real craft (spinning dashed ring, contextual copy) instead of a bare "no orders" line.

### Priority Issues

**[P0] Silent failure on invoice download.** MyOrders.jsx:140-142 -- catch(err){console.error(err)} is the entire error path. Why it matters: highest-stakes button on the page; silent no-op is indistinguishable from a broken button. Fix: toast on success and failure (ToastNotification.jsx already exists, unused here). Suggested command: /impeccable harden.

**[P0] Duplicated, regressed PDF logic instead of the canonical util.** MyOrders.jsx:71-143 reimplements frontend/src/utils/invoicePdf.js:buildInvoicePdf() from scratch -- drops the payment-method/tendered-change block present in the util, skips its safe() input sanitization (raw tx.customerName interpolation), ignores the util's purpose-built duplicate flag for exactly this reprint case. Why it matters: re-downloaded receipt is missing information the original had and isn't hardened the same way. Fix: call buildInvoicePdf(tx, { formatCurrency: formatBaseCurrency, displayCurrency, duplicate: true }) instead. Suggested command: /impeccable harden.

**[P1] Currency formatting inconsistent within one card.** OrderCard.jsx:71,75 render raw displayCurrency code + unformatted/manual decimals; line 89 uses proper Intl-formatted formatCurrency. Fix: route all amounts through the formatCurrency prop. Suggested command: /impeccable polish.

**[P1] Invoice navy diverges from Fleet Navy token.** MyOrders.jsx:76,113,128 hardcode rgb(27,54,93) (#1B365D); DESIGN.md Fleet Navy is hsl(221.2 83.2% 53.3%) ~= #2563EB. Signal Red stripe alongside it matches exactly -- this is specifically a stale navy. Fix: align to rgb(37,99,235) or document the print exception in DESIGN.md. Suggested command: /impeccable document.

**[P2] "Review" offered on orders not yet fulfilled.** OrderCard.jsx:110-117 shows Review unconditionally, including ORDER_PLACED. Fix: gate to COMPLETED (arguably READY_FOR_PICKUP). Suggested command: /impeccable clarify.

### Persona Red Flags

**Jordan (first-timer)**: no copy explains "Online Orders" vs "Walk-in Purchases" beyond a count badge.

**Riley (stress-tester)**: PDF button has no debounce/disabled-state; combined with the missing tx.items guard, a malformed transaction throws and gets silently swallowed by the P0 error path above.

**Sam (accessibility)**: star-rating buttons in the review modal have no aria-label/aria-pressed; tab counts update with no aria-live region.

### Minor Observations

- formatDate hardcodes 'en-US' while the rest of the app uses 'en-PH'.
- OrderCard's default props (displayCurrency = '₱') contradict the actual value always passed in ('PHP').
- Empty-state spinning ring has no prefers-reduced-motion guard.
- Header banner's hover-glow escalation decorates a non-interactive element.

### Questions to Consider

1. invoicePdf.js already has a duplicate flag built for reprints -- was maintaining a second, worse copy in MyOrders.jsx intentional, or did nobody know the shared util existed?
2. Discount, tax, and invoice number are only visible after generating a PDF -- never on the card. Should the ledger show its own numbers before the customer downloads anything?
3. Is the invoice's Signal Red stripe under the header signal (per the Two-Red Rule) or just decoration?

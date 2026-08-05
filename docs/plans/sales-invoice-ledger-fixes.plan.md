# Sales Invoice Ledger — Fix Plan

Source: `/impeccable critique` of the customer "Sales Invoice Ledger" (My Orders — payment history + PDF receipt re-download). Score 20/40 (Acceptable). Full report: `.impeccable/critique/2026-08-04T01-57-28Z__frontend-src-components-myorders-jsx.md`.

Files touched: `frontend/src/components/MyOrders.jsx`, `frontend/src/components/OrderCard.jsx`, `frontend/src/utils/invoicePdf.js` (reused, not modified).

Ticket lookup required before commit: check `docs/jira/jira-breakdown.csv` for the matching TTP-ID; do not invent one. If none exists, ask before committing.

---

## 1. [P0] Silent failure on invoice download

**File**: `frontend/src/components/MyOrders.jsx:140-142`

**Problem**: `handleDownloadPDF`'s catch block is `catch (err) { console.error(err); }` — no user-facing feedback on success or failure. The PDF download is the highest-stakes action on the page; a silent failure is indistinguishable from a broken button.

**Fix**:
- Import and use the existing `ToastNotification.jsx` component (already in the repo, unused on this page).
- On successful `doc.save(...)`, fire a success toast (e.g. "Invoice downloaded").
- On catch, fire an error toast (e.g. "Couldn't generate invoice — try again") instead of only logging.

## 2. [P0] Duplicated, regressed PDF logic — use the canonical util

**File**: `frontend/src/components/MyOrders.jsx:71-143` (delete this whole function body), reuse `frontend/src/utils/invoicePdf.js:buildInvoicePdf()`

**Problem**: `handleDownloadPDF` reimplements PDF generation from scratch instead of calling the shared `buildInvoicePdf()` util. The duplicate:
- Drops the Payment Method / Tendered / Change / Cheque / GCash block that `invoicePdf.js:82-102` includes.
- Skips the `safe()` sanitization `invoicePdf.js:7-10` applies to every user-supplied string before writing into the PDF — `MyOrders.jsx` interpolates `tx.customerName` etc. raw.
- Ignores the util's purpose-built `duplicate` flag (`invoicePdf.js:32`) meant for exactly this reprint case.

**Fix**: Replace `handleDownloadPDF` in `MyOrders.jsx` with a thin wrapper:
```js
import { buildInvoicePdf } from '../utils/invoicePdf';

const handleDownloadPDF = (tx) => {
  if (!tx) return;
  try {
    buildInvoicePdf(tx, { formatCurrency: formatBaseCurrency, displayCurrency, duplicate: true });
    // success toast (see item 1)
  } catch (err) {
    // error toast (see item 1)
  }
};
```
Confirm `buildInvoicePdf`'s actual signature in `invoicePdf.js` before wiring this up — adjust param names to match, don't assume.

## 3. [P1] Currency formatting inconsistent within one card

**File**: `frontend/src/components/OrderCard.jsx:71,75,89`

**Problem**: Line 71 renders `{displayCurrency} {item.price}` (raw code + unformatted float), line 75 renders `{displayCurrency} {(...).toFixed(2)}` (raw code + manual decimals), line 89 uses `formatCurrency(transaction.total)` (proper `Intl` output). Three formatting conventions in one card.

**Fix**: Route all three amounts (unit price, line total, order total) through the `formatCurrency` prop. Remove the manual `.toFixed(2)` and raw `displayCurrency` interpolation at lines 71 and 75.

Also fix the component's confused default props while touching this file: `OrderCard.jsx:31-32` defaults `displayCurrency = '₱'` (a symbol) but the real caller (`MyOrders.jsx`) always passes `'PHP'` (a code) via `SettingsContext`. Since `formatCurrency` now does all the work, `displayCurrency` prop may become unused — remove it if so, don't leave dead props.

## 4. [P1] Invoice navy diverges from Fleet Navy token

**Files**: `frontend/src/components/MyOrders.jsx:76,113,128` (being deleted per item 2) and `frontend/src/utils/invoicePdf.js:15,57,75`

**Problem**: PDF header/footer navy is hardcoded `doc.setFillColor(27, 54, 93)` (`#1B365D`). DESIGN.md's Fleet Navy is `hsl(221.2 83.2% 53.3%)` ≈ `#2563EB` / `rgb(37, 99, 235)`. The Signal Red accent stripe in the same file matches Signal Red exactly, so this is specifically a stale/divergent navy, not a systemic PDF-can't-use-tokens issue.

**Fix**: Update `doc.setFillColor(27, 54, 93)` → `doc.setFillColor(37, 99, 235)` in `invoicePdf.js` (all occurrences). Since item 2 makes `MyOrders.jsx` call this shared util, the fix only needs to land in `invoicePdf.js`. If the print navy is intentionally different from screen navy (print contrast, ink cost, etc.), document that exception in DESIGN.md's Colors section instead of changing the value — pick one, don't leave it undocumented either way.

## 5. [P2] "Review" shown on unfulfilled orders

**File**: `frontend/src/components/OrderCard.jsx:110-117`

**Problem**: The Review button renders unconditionally regardless of `transaction.status`, including `ORDER_PLACED` (not yet picked up/fulfilled) — inviting a review of a part the customer hasn't received yet.

**Fix**: Gate the Review button to `transaction.status === 'COMPLETED'` (or also allow `'READY_FOR_PICKUP'` if picking up counts as received — confirm with product intent before deciding). Hide/disable it otherwise rather than removing the slot, to avoid layout shift in the 3-button footer row.

---

## Out of scope for this pass (noted in critique, not actioned)

- No sort/search by invoice #, no bulk download, no pagination (Flexibility heuristic gap) — larger feature, not a fix.
- No explanation of Online vs Walk-in distinction in copy (Help/Documentation gap) — copy work, separate task.
- `alert()` used for review-submit feedback instead of the toast pattern — same toast component from item 1 should replace this too while it's in scope; call out to dev agent as a bonus if time permits.
- Star-rating buttons in review modal missing `aria-label`/`aria-pressed`; tab counts missing `aria-live` — accessibility follow-up, flag separately.
- `formatDate` hardcodes `'en-US'` vs app's `'en-PH'` elsewhere — minor locale inconsistency.
- Empty-state spinning ring missing `prefers-reduced-motion` guard.

## Verification

After fixes: re-run `/impeccable critique frontend/src/components/MyOrders.jsx` and confirm score improvement, particularly heuristics 1 (Visibility of System Status), 4 (Consistency and Standards), and 9 (Error Recovery), which are the ones this plan targets.

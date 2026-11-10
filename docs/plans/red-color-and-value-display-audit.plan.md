# Plan: Reserve Red for Danger/Alerts Only + Verify Backend Value Display

## Summary
Two workstreams. (1) `--accent` in `frontend/src/index.css` is defined as red, so ~46 non-destructive primary CTAs (Sign In, Save, Add, Checkout) render red purely due to this shared token — flip it to blue and leave explicit `bg-red-*`/`bg-destructive` danger elements (delete, deactivate, restock, notification badges) untouched. (2) Verify that values the backend API returns are displayed correctly in the frontend — focusing on recently-wired fields (`oemNumbers`, `salesChannel`, `TransactionItem.sku`, `StockAdjustment.adjustmentNumber`, per-product markup) and currency/date formatting consistency.

## Step 1 — Audit red/accent color usage and pin true brand-red chips

Grep all `bg-accent`/`text-accent` and explicit `bg-red-*`/`bg-destructive` usages across `frontend/src`. Classify each as danger/alert (keep red) vs. non-destructive action (flip to blue). Identify any genuinely intentional red brand chips/badges and pin them to `brandRed`/`alarm-red` before the `--accent` token changes, so they don't silently turn blue in Step 2.

## Step 2 — Flip `--accent` CSS token to blue and fix the Resend-verification button

In `frontend/src/index.css`, change `--accent` (light and dark theme blocks) from red (`0 72.2% 50.6%`) to the blue `--primary` value (`221.2 83.2% 53.3%`) so all `bg-accent` CTAs, focus rings, and text selection render blue. Separately restyle the "Resend verification email" button in `AuthPortal.jsx` (line 185) from `bg-red-600` to primary/blue styling, since it's a recovery action, not a destructive one. Leave all explicit `bg-red-*`/`bg-destructive` danger elements (delete, deactivate, restock, notification badge) untouched.

## Step 3 — Map and cross-check backend field values against frontend display surfaces

For `PartsCatalog`/`PartCard`/`PartDetailDrawer`, `TransactionPOS`/POS panes, `CartDrawer`, `MyOrders`/`OrderCard`, `PurchasingModule`/`PaymentsCalendar`, `CustomerManagement`, and `Analytics`, map each displayed value to its backend API field. Cross-check recently-wired fields (`Part.oemNumbers`, `Transaction.salesChannel`, `TransactionItem.sku`, `StockAdjustment.adjustmentNumber`, per-product markup) plus currency/date formatting against `backend/prisma/schema.prisma` and service responses in `backend/src/services`. Produce a findings table (surface, field, expected, actual, fix-needed) covering missing fields, hardcoded placeholders masking real data, and wrong field/label/unit.

## Step 4 — Fix frontend value-display mismatches found in the field audit

Apply corrective edits in the affected frontend components for every Step 3 finding classified as a frontend-wiring-bug (missing field render, wrong label/unit, hardcoded placeholder masking a real value). Consolidate date formatting (inconsistent `toLocaleDateString` options between `PurchasingModule` and `CustomerManagement`) and route currency formatting through the existing `SettingsContext`/`currency_api` helpers where practical. Do not alter backend services/schema for findings classified as backend-gap — flag those separately.

## Step 5 — Validate color and value fixes with build, lint, and visual regression

Run frontend build and lint. Capture Playwright screenshots at 390/1024/1440 widths in both light and dark themes to test: the auth/sign-in page, POS checkout, a save/add drawer, a delete confirmation, and the Parts Catalog + Purchasing views. Confirm all non-destructive CTAs are blue, only alert/danger elements remain red, and displayed values match the Step 3 findings table.

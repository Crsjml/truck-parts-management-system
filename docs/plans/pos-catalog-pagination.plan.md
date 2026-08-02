# Plan: POS Surface Restructure — Odoo/Square/Lightspeed Convention

**Tier**: Small-medium — restructures the POS shell composition; visual tokens unchanged.
**Source**: `/impeccable shape` design brief, confirmed. Supersedes this plan's original top-tab-row structure (see "Revision history").

## Problem

`frontend/src/components/pos/PosCatalogPanel.jsx` renders the filtered parts list as a scrolling `space-y-2` column inside a fixed-height panel. With ~50 items in the catalog, staff at the counter have to scroll mid-transaction — slow and error-prone with a customer waiting. Beyond that, the overall POS shell (`TransactionPOS.jsx`) doesn't yet read like register software staff already know, and there's no dedicated full-screen counter mode for face-to-face retail.

## Confirmed design direction

Canon convention, played straight — real POS software structure (Odoo POS + Square POS + Lightspeed/Vend), not an invented visual world. **Visual tokens stay exactly as they are**: Fleet Navy/Signal Red, flat Operate tier, hairline borders, no glow/lift, per `DESIGN.md`'s Flat-Admin Rule. Only the **composition/topology** of the POS shell changes.

### First viewport (replaces the current `xl:grid-cols-5` two-panel layout in `TransactionPOS.jsx`)

```
┌───────┬─────────────────────────────┬──────────────────┐
│  CAT  │  Search                      │  Running Order    │
│  RAIL │  ┌────┬────┬────┬────┐       │  (cart + customer  │
│ (icon │  │item│item│item│item│       │   + payment,       │
│ +text)│  ├────┼────┼────┼────┤       │   single screen)   │
│  ⋮    │  │item│item│item│item│       │                    │
│       │  └────┴────┴────┴────┘       │  [Numeric tender   │
│       │        ◀ Page 1/6 ▶          │   keypad for Cash] │
└───────┴─────────────────────────────┴──────────────────┘
                                          [⛶ Fullscreen]
```

### Structure

1. **Left category rail (new — replaces the top tab-row from the original version of this plan)** — vertical, icon+label per category (reuses `frontend/src/utils/categoryIcons.jsx`), Odoo-style. Fixed width, `All` entry plus one per category present in `parts`, scrollable if it overflows vertically (reuse `.hide-scrollbar` + `.scroll-fade-edges` rotated for vertical overflow). Selecting an entry filters the grid and resets pagination to page 1. Primary narrowing tool.
2. **Center — search + product grid**: search box unchanged, secondary filter on top of the active category. Vehicle brand/series filter stays as the existing collapsible row, tertiary. Results grid replaces the scrolling list: fixed-size grid (target ~2 columns × 4 rows = 8 visible items, tuned to actual panel height at build time), Prev/Next arrows below it replacing scroll, "X–Y of N results" label, arrows disabled (not hidden) at range ends. Any filter change (category, search, vehicle brand/series) resets to page 1. Card content/interaction (add-to-cart, stock/remaining labels) unchanged.
3. **Right — running order panel**: cart lines + customer info + payment collapsed to one screen (mechanics owned by `docs/plans/pos-redesign.plan.md`), restyled toward Square's ticket panel — clear line items, prominent total, tap-friendly payment-method tiles. Cash tender gets a **numeric keypad** (Odoo/Lightspeed convention) alongside the existing quick-tender buttons (₱500/₱1000/Exact) — additive, not a replacement.
4. **Fullscreen toggle (new)** — a button in the POS shell (top-right) that requests fullscreen on the whole `TransactionPOS` view for a dedicated counter-kiosk mode during face-to-face retail. Toggles back to normal admin chrome on re-click or Escape.

### States

- Empty-filtered: existing empty state, unchanged.
- Single-page result: arrows visible but disabled, not removed.
- Category with zero matching parts: rail entry still shown, grid shows the empty state.
- Fullscreen: entering/exiting must not reflow or clip the rail/grid/order-panel layout; respect `prefers-reduced-motion` on the transition.

### Constraints

- Admin/POS = flat Operate tier per `DESIGN.md`'s Flat-Admin Rule: no glow/lift, no gradients, no shadow-on-hover on the rail, grid cards, arrows, keypad, or fullscreen toggle — hairline borders + mist fill states only.
- Reuse `categoryIcons.jsx` for rail icons; do not invent new iconography.
- F2 search-focus and F4 checkout shortcuts must keep working unchanged.
- The running-order panel's checkout *mechanics* (GCash, payment-method fields, invoice PDF, receipt printing) are owned by `docs/plans/pos-redesign.plan.md` — this plan only restyles its container toward the ticket-panel look and adds the numeric keypad; it does not re-implement payment logic.

## Step 1 — Implement left category rail

Replace the (unbuilt) top tab-row concept with a vertical category rail in `PosCatalogPanel.jsx`, sourced from `part.category`, reusing `categoryIcons.jsx` icons. `All` entry plus one per category present in `parts`. Selecting an entry filters the grid and resets pagination to page 1.

## Step 2 — Implement fixed-grid pagination

Replace the scrolling results list with a fixed-size grid (target 2×4) and Prev/Next arrows, positioned center, beside the rail. Add page state, reset it on any filter change (search, category, vehicle brand/series). Show "X–Y of N results." Arrows disabled (not hidden) at range ends.

## Step 3 — Restyle running-order panel toward Square-style ticket

Restyle the merged cart+checkout container (`PosCart.jsx` / `PosCheckoutPane.jsx`, per `pos-redesign.plan.md`'s single-screen collapse) as a right-hand ticket panel: clear line items, prominent total, tap-friendly payment tiles. Add a numeric keypad for Cash tender alongside the existing quick-tender buttons. Restyle only — no change to checkout logic/data flow owned by `pos-redesign.plan.md`.

## Step 4 — Implement fullscreen toggle

Add a fullscreen-toggle button to the `TransactionPOS.jsx` shell (top-right) using the Fullscreen API, scoped to the POS view container. Handle enter/exit via button and Escape; verify layout holds (rail/grid/order-panel) in fullscreen at common counter-display resolutions.

## Step 5 — Tests

Write tests first (TDD): `PosCatalogPanel.test.jsx` (rail filtering, pagination page-through, page reset on filter change, empty states, F2 shortcut and add-to-cart still functional), `TransactionPOS.test.jsx` (fullscreen toggle enter/exit), ticket-panel restyle snapshot/interaction tests as needed.

## Step 6 — Mandatory design gate

Run `design-taste-frontend` (anti-slop) then `impeccable` `audit`/`polish` per `CLAUDE.md` §4 — confirm no `.glass-panel-hover` glow/lift leaked onto the rail/grid/arrows/keypad/fullscreen toggle, and font-display heading rule still holds.

## Step 7 — Review

Run `code-reviewer` over the diff. No security-sensitive surface touched by this plan specifically (layout/composition + Fullscreen API), so `security-reviewer` is not required unless the reviewer flags something unexpected.

## Revision history

- Original version of this plan proposed a horizontal top tab-row for categories. Superseded by the left vertical rail after `/impeccable shape` resolved the whole-POS-shell structure to the Odoo/Square/Lightspeed convention, which also added the fullscreen toggle and the ticket-panel restyle of the running-order side.

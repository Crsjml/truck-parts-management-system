# Plan: Dashboard Low-Stock Watchlist — Triage Redesign

**Ticket:** TTP-44 (Build low-stock report UI, under TTP-28 Low-Stock Report)
**Source:** `$impeccable critique` on `frontend/src/components/Dashboard.jsx`, run 2026-08-02. Full report: `.impeccable/critique/2026-08-02T07-27-54Z__frontend-src-components-dashboard-jsx.md`
**Target file:** `frontend/src/components/Dashboard.jsx` (Low-Stock Watchlist card, lines ~112–183, plus its KPI tile at lines ~79–93)

## Why

The critique scored this widget 14/32 on Nielsen's heuristics — well below the 20-32/40 band typical of shipped interfaces. The core problem: it's a display table, not a triage tool. Every low-stock row (1 unit under threshold or a full stockout) renders identical red intensity, the only restock action is a double-click discoverable solely via a hover tooltip (dead on touch hardware), and the color choice actively violates DESIGN.md's Two-Red Rule (raw `red-*` Tailwind classes at Alarm-Red intensity for what is a Signal-Red warning state, not a destructive/error state).

## Scope (all 6 priority issues, per user confirmation)

### 1. [P0] Severity tiers + worst-first sort
- Compute `deficit = minStock - stock` per part.
- Bucket: `stock === 0` → "critical" tier; `stock > 0 && stock <= minStock` → "warning" tier.
- Sort `lowStockItems` by `deficit` descending before `.slice(0, 5)` (currently unsorted array order).

### 2. [P0] Color-token discipline (Two-Red Rule)
- Replace raw `red-500/600/700/950` classes (Dashboard.jsx lines 90, 120, 151, 157, 177) with the project's semantic tokens.
- **Critical tier** (stockout): `alarm-red` (`hsl(0 84.2% 60.2%)`) — the only place alarm-red is warranted here.
- **Warning tier** (near-threshold): `signal-red` (`hsl(0 72.2% 50.6%)`), softer application (e.g. lower opacity fill, no `animate-pulse`).
- Check whether `tailwind.config.js` already exposes these as utility classes (e.g. `text-alarm-red`, `bg-signal-red/10`) before hand-rolling `hsl(var(--...))` — reuse existing token utilities if present, don't invent a second naming scheme.
- Apply consistently to both the KPI tile (lines 79-93) and the watchlist table so they stop encoding the same `lowStockItems` data with two different visual vocabularies.

### 3. [P1] Visible restock action (replace hidden double-click)
- Remove the `onDoubleClick` + `title="Double-click to restock in Inventory"` pattern (lines 146, 152).
- Add a small per-row icon button/chip (e.g. `ArrowRight` or a "Restock" label, already imported from `@phosphor-icons/react` elsewhere in this file) that fires the same `setSelectedCategory` / `setPage('catalog')` / `catalogFilter` event sequence currently in `onDoubleClick`.
- Must be reachable via keyboard (real `<button>`, not a div with a click handler) and visible without hover — this is the touch-hardware fix.

### 4. [P1] Typography hierarchy inside the table
- Currently four near-equal-weight text treatments compete (header `text-xs font-semibold`, name `text-sm font-medium`, SKU `text-xs font-mono`, stock badge `font-bold`).
- Make the stock/deficit number the single loudest element per row (larger size, bolder weight, isolated).
- Demote SKU to a secondary caption under the part name (stacked, smaller, muted) instead of its own table column — frees horizontal space for the new severity indicator.

### 5. [P2] Layout proportion
- Watchlist currently `lg:col-span-2` at visual parity with `Recent Activities` (both `glass-panel`, same border treatment).
- Widen watchlist to `lg:col-span-3` (full width) in a row above Recent Activities, or otherwise give it clear visual priority over the activity log — restocking outranks log-browsing for this shop's stated priority.

### 6. [P3] Empty state
- Replace the plain gray placeholder text (lines 128-130, "No low stock warnings. All inventory looks healthy!") with a positive-affirmation treatment: a `CheckCircle` icon (Phosphor, already the icon family used throughout this file) + copy consistent with the "Stable stock" tone already used at line 71.

## Also flagged (adjacent, same page)

- `detect.mjs` flagged `border-l-4 border-l-accent` on the Welcome Banner (line 16) as an AI-slop "side-tab" pattern. Not in scope per the critique's focus, but it sits directly above the Watchlist and shares the "colored left border" visual language — worth a look in the same pass if touching this file anyway.
- Confirm `animate-pulse` (line 90, KPI icon) is covered by a `prefers-reduced-motion` guard — the project already guards its marquee animation this way; this one wasn't confirmed.
- `glow-text-red` (line 83) isn't documented in DESIGN.md's shadow/glow vocabulary — confirm it isn't a storefront-tier glow effect leaking into the flat-admin tier before reusing it elsewhere (DESIGN.md's Flat-Admin Rule forbids glow/lift on admin surfaces).

## Out of scope

- Vendor/lead-time data and reorder-quantity fields are not in the current `parts` schema (Prisma) — the critique flagged these as desirable future additions, not part of this pass. Don't add fake/placeholder vendor data; that's a separate schema + backend change.
- Velocity/depletion-trend data — explicitly called a stretch goal, not this pass.

## Verification

1. `npm run dev` in `frontend/`, log in as staff (see `docs/seed-accounts.md`), navigate to the admin Dashboard.
2. Confirm severity tiers render distinctly (critical vs. warning) and rows sort worst-first.
3. Confirm the restock action is visible without hovering, and works via both mouse click and keyboard (Tab + Enter).
4. Confirm colors trace to `signal-red`/`alarm-red` tokens, not raw `red-*` Tailwind classes — grep the diff for `red-[0-9]` to make sure none remain in the touched lines.
5. Check both light and dark mode (`darkMode: 'class'` — project-wide requirement).
6. Re-run `node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/components/Dashboard.jsx` — should still show at most the pre-existing line-16 finding (out of scope), nothing new.
7. Re-run `$impeccable critique` on the same target afterward to confirm the score improves from 14/32.

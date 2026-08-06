# Plan: Admin Top Nav Header — Wayfinding + Real Status

**Ticket:** No exact match in `docs/jira/jira-breakdown.csv` — closest candidate is TTP-115 ("Admin users can access the admin dashboard and all management features"), but that's already marked Done and is scoped to access/routing, not this header's content. **Confirm the right TTP-ID with the user before committing** rather than reusing TTP-115 or inventing one.
**Source:** `$impeccable critique` on the admin top nav header (`frontend/src/App.jsx` lines 866-923), run 2026-08-02. Full report: `.impeccable/critique/2026-08-02T08-23-45Z__frontend-src-app-jsx-top-nav-header.md`
**Target file:** `frontend/src/App.jsx` — the `<header>` block, lines 866-923, plus its `page` state and sidebar user-card sibling (lines ~685-711) for the dedup fix.

## Why

The critique scored this header 13/32 on Nielsen's heuristics. It's a default admin-template topbar: date pill, a fake "live" status light, a bell, theme toggle, account icon, logout — none of it built around this product or this shop's actual workflow. Two problems compound: staff have zero page-identity signal across 9 tabbed admin pages (no title, no breadcrumb — only the sidebar's highlight state), and one of five header elements ("TTP-SERVER: ACTIVE") is decorative chrome with no real data behind it, which is exactly the kind of "looks technical" AI-slop tell this project's own anti-slop rules warn against.

## Scope (all 6 priority issues, per user confirmation — P0/P1/P2)

### 1. [P0] Page-identity signal
- Add an `h1`-tagged page title bound to `page` state, `font-display` (Cabinet Grotesk, per DESIGN.md's Display-Everywhere Rule), placed where the date pill currently sits (lines 875-878).
- Map `page` values (`dashboard`/`catalog`/`pos`/`analytics`/`categories`/`purchasing`/`customers`/`staff`/`account`) to human-readable titles — check whether a similar mapping already exists in the sidebar nav labels (lines ~700-820) and reuse those strings rather than inventing a second copy of the same labels.
- Decide whether the date pill is dropped entirely or demoted to a smaller secondary element — don't just add the title alongside it without addressing the crowding this creates in a 64px header.

### 2. [P0] Fake status pill → real or removed
- Lines 894-897 (`TTP-SERVER: ACTIVE`, hardcoded emerald pulse) currently has no prop/state backing it.
- Preferred: wire to a real heartbeat — poll an existing health endpoint (check `backend/` routes for one already, e.g. `/api/health` referenced elsewhere in this codebase, before adding a new one) and reflect actual online/offline/error state.
- Use DESIGN.md tokens for the states (not raw `emerald-500`, which isn't in the palette) — e.g. a muted/neutral tone for "connected," Alarm Red only on genuine failure.
- If a real heartbeat isn't feasible in this pass, remove the pill entirely rather than leave a decorative one — the critique is explicit that a never-changing status light does more harm (false trust) than no status light at all.

### 3. [P1] De-duplicate account/identity surface
- Header icon button (lines 907-914, `setPage('account')`) currently duplicates the sidebar footer's user card (lines ~685-711, name + role + shield icon) as two different visual languages for "who am I."
- Keep the sidebar card as the canonical identity display. Either remove the header button, or repurpose it as a dropdown that surfaces role + quick settings rather than plain navigation duplicate — pick whichever keeps the header's element count down, since crowding is already a flagged issue.

### 4. [P1] Role/permission indicator
- Sidebar conditionally shows Staff Management/Settings only for `SUPERADMIN` (existing pattern around lines 657, 807 — reuse the same `adminSession?.user?.staffData?.role === 'SUPERADMIN'` check, don't reinvent role-checking logic).
- Add a small role tag near the account control — Fleet Navy for `SUPERADMIN`, muted/unlabeled for regular staff. Relevant specifically because this is a shared shop-terminal product where staff swap logins mid-shift.

### 5. [P1] Fix `animate-bounce` on the notification badge
- Line 888: `animate-bounce` flagged by the detector as a dated/tacky easing pattern.
- Replace with a subtle scale/opacity transition on an exponential easing curve (project already uses `cubic-bezier(0.4,0,0.2,1)` for storefront hover-escalation per DESIGN.md — admin can reuse a quieter variant of the same curve), or drop the animation and let the badge's presence alone carry the signal.

### 6. [P2] Fix breakpoint mismatch (sidebar toggle vs. logout)
- Sidebar toggle is `lg:hidden` (line 869); logout is `hidden md:inline-flex` (line 918) — between 768-1024px both render simultaneously in an already-tight header, exactly where the sidebar has collapsed to a drawer.
- Align both to the same `lg:` breakpoint, or fold logout into the account control (from item 3) as a dropdown item below `lg:` instead of a separate always-visible button.

## Verified during critique (don't re-litigate these)

- `bg-accent` on the notification badge (line 888) already correctly resolves to Signal Red (`hsl(0 72.2% 50.6%)`) — confirmed against the CSS custom properties. No change needed here.
- `text-3xs`/`text-2xs` (lines 888, 896) are real defined Tailwind utilities, not silent fallbacks. No change needed.

## Out of scope

- A global search/command-palette across the 9 admin pages was flagged as a "worth considering" addition given the product's density, but is a larger feature, not a header-polish fix — track separately if the user wants it.
- No new backend health-check endpoint should be built from scratch if one doesn't already exist and this pass can't justify the scope — removing the fake pill is an acceptable fallback per item 2.

## Verification

1. `npm run dev` in `frontend/`, log in as both a `SUPERADMIN` and a regular-staff seed account (see `docs/seed-accounts.md`), confirm the role tag differs correctly between them.
2. Confirm the page title updates correctly across all `page` state values, including `account` and `staff`.
3. Confirm the status pill either reflects real connectivity state (down → visibly different, using a real token color) or has been removed — no more static-green forever.
4. Confirm the account control no longer duplicates the sidebar's identity block in a conflicting way.
5. Confirm `animate-bounce` is gone from line 888's badge; motion feels calmer, not bouncy.
6. Resize the viewport through 768px-1024px and confirm no double-rendering of the hamburger + logout at the same time.
7. Check both light and dark mode (`darkMode: 'class'` — project-wide requirement).
8. Re-run `node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/App.jsx` — the `bounce-easing` finding at line 888 should be gone; no new findings should appear.
9. Re-run `$impeccable critique` on the same target afterward to confirm the score improves from 13/32.

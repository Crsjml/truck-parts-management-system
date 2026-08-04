# Handoff: AddPartDrawer.jsx — accessibility + dark-mode contrast fixes

File: `frontend/src/components/AddPartDrawer.jsx` (542 lines). Admin/POS tier ("Operate mode", flat-design mandate — see `DESIGN.md`). Scope is limited to the two items below only — do not touch layout, colors of other components, or unrelated code.

## 1. Fix dark-mode error-text contrast (P0)

Every validation/error message uses `text-destructive` on a `bg-destructive/10` background. Measured contrast:
- Light mode: 3.03–3.16:1 (fails 4.5:1 AA)
- Dark mode: **1.71–1.93:1** (functionally unreadable)

Root cause: `--destructive` in `frontend/src/index.css` is `0 84.2% 60.2%` (light) / `0 62.8% 30.6%` (dark) — the dark value is deliberately desaturated for use as a *background* tint, but the same token is reused as *foreground* text color, so it goes dark-on-dark.

Affected lines (all in `AddPartDrawer.jsx`):
- 241, 257, 271, 313, 436, 456, 472, 487 — inline field-error `<p className="text-2xs text-destructive font-semibold">`
- 492-495 — server-error banner

Fix: don't reuse `--destructive` for foreground text in dark mode. Add a lighter, higher-luminance error-foreground token (or a `dark:text-*` override) so error text on its own `/10` tint hits ≥4.5:1 in both themes. Check `frontend/src/index.css` for whether a `--destructive-foreground` variable already exists and use it if so; if not, add one scoped correctly for both `:root` and `.dark`. Verify the fix with computed contrast, not just visually — target ≥4.5:1 light and dark.

## 2. Fix accessibility gaps (P3)

a) **Icon-only Trash button has no accessible name** (lines 364-374, removes a compatibility row). Add `aria-label="Remove compatibility row"`.

b) **File input has no label association** (lines 393-423). The "Part Image" text (394-396) is not wired to the `<input type="file">` (406-423) via `htmlFor`/`id`. Add a stable `id` to the input and `htmlFor` to the label (or wrap the input inside the `<label>`).

c) **Two `window.confirm()` calls should become an accessible custom dialog**:
   - Line 142: discard-unsaved-changes on close (`requestClose`)
   - Line 206: overwrite-current-inputs when applying a clone template

   Replace both native `confirm()` calls with a proper accessible confirmation dialog reusing `frontend/src/components/ui/Drawer.jsx`'s visual language (or an equivalent lightweight modal already in the codebase — check `frontend/src/components/ui/` before creating anything new, per project convention). The dialog needs a heading, the actual message, and clearly labeled action buttons (not OS-default OK/Cancel) so screen readers get a properly structured `role="dialog"` with an accessible name, not raw browser chrome.

## Out of scope (do not touch)

- The submit button's `bg-accent`/`shadow-accent` token/shadow issue (separate P1, not part of this pass)
- Clone-template block visual hierarchy (separate P2, not part of this pass)
- Enter-to-advance inconsistency on Step 2 (separate P2, not part of this pass)

## Verification

- Confirm all 8 field-error lines + the server-error banner render at ≥4.5:1 contrast in both light and dark mode.
- Confirm Trash button, file input, and both dialogs are reachable/operable via keyboard and announce correctly with a screen reader (or at minimum, correct ARIA/label wiring by inspection).
- Run existing tests: `frontend/src/components/__tests__/` (check for any AddPartDrawer or PosCatalogPanel test coverage) and don't break them.

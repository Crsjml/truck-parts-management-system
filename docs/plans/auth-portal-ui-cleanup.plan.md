# Auth Portal UI/UX Cleanup Plan

## Context

The previous restructure (magic-link removal, `GoogleSignInButton.jsx`, inline "Forgot password?") already landed — `AuthPortal.jsx` is now Login/Register only. This pass fixes the UI/UX problems visible in the shipped result.

Seven issues, all in two files. Three of them share one root cause worth naming up front: **the page paints decoration that the design system already provides, or that nothing reads.** The wrapper stacks three gradients on top of the three `index.css` body already paints; the Google button hardcodes Google's warm-black `#131314` against the app's cool-navy `--background: 224 47% 5%`; the "Remember me" checkbox is registered in the form but `onCustomerLogin` never reads it. Most of this plan deletes code.

**Decisions made with the user** (all five confirmed): consolidated hint line, compact always-rendered strength bar, delete Remember-me, keep left panel with concrete copy, dot-grid background.

Out of scope: the seed-domain email-verification bypass (`AuthPortal.jsx` ~line 239) and the `CompleteProfileModal` OAuth completion flow from `docs/plans/auth-login-register-restructure.plan.md` — separate tracks.

---

## Skills to apply

Per `CLAUDE.md` TIER 2, `AuthPortal.jsx` is the **Trust** tier: `web-design-guidelines` (the §1/§2 token and contrast fixes), `frontend-design` (§3 copy and composition), `impeccable` (form, error and empty states — §4, §5), with `tailwind-design-system` for the token swaps. `accessibility` covers the placeholder/label pass in §4. All present in `.agents/skills/`.

## Files

- `frontend/src/components/AuthPortal.jsx` — all layout/copy/field changes
- `frontend/src/components/GoogleSignInButton.jsx` — one className string
- `frontend/src/index.css`, `frontend/tailwind.config.js` — **read only**, source of the tokens and the `bg-dot` utility being reused

---

## 1. Google button: kill the foreign dark-mode surface (items 1d, 2c)

**Diagnosis:** `GoogleSignInButton.jsx:21` sets `dark:bg-[#131314] dark:border-white/10`. App dark tokens are `--background: 224 47% 5%` (cool navy-black) and `--border: 222 47% 12%`. Google's `#131314` is a warm neutral black and `white/10` is *lighter* than `--border`, so on the glass panel the button reads as a foreign patch with a light rim. `focus:ring-amber-500/20` is also off-palette — nothing else in the app uses amber.

**Fix:** keep the official 4-path "G" SVG and the approved label untouched (Google's guidelines require the unmodified mark, not a specific surface). Move the surface onto app tokens — the same trio `inputClass` uses (`AuthPortal.jsx:151`) and the same hover the old inline button used.

Replace the `className` template on `GoogleSignInButton.jsx:21` with:

```jsx
className={`relative w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition
  border border-border bg-background text-foreground
  hover:bg-secondary/60 active:scale-[0.99]
  focus-visible:ring-2 focus-visible:ring-accent
  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
```

Leave the `<svg>` block (lines 24–46) alone. `py-2.5` → `py-3` matches the sibling submit buttons.

---

## 2. Background: delete, don't replace (item 3a)

**Diagnosis:** `AuthPortal.jsx:340` carries a six-function arbitrary background (2 radial + 1 linear, doubled for dark). `index.css:70–74` already paints three fixed radial gradients on `body`. Lines 342–343 add two blurred `animate-pulse` blobs — the pattern `.claude/rules/ecc/web/design-quality.md` bans by name.

**Fix:** delete all of it and reuse the `bg-dot` utility that already exists (`tailwind.config.js:96`, already used by `ui/HeroHighlight.jsx:29`). Because `bg-dot` sets only `background-image`, the body gradient shows through.

- **Line 340** — wrapper className becomes:
  ```jsx
  <div className="min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden bg-dot-[#00000020] dark:bg-dot-[#ffffff20] text-foreground font-sans">
  ```
- **Lines 341–343** — delete the comment and both blob `<div>`s outright.
- **Line 349** — drop the left panel's own `bg-gradient-to-b from-slate-200/30 to-slate-100/10 dark:from-slate-950/40 dark:to-slate-950/20`. Keep the border classes; the glass card behind it (line 346) already supplies the surface.

Net effect: one utility pair in, ~400 characters of arbitrary CSS and two animated elements out.

---

## 3. Left panel: concrete proof instead of ad copy (item 4)

**Research note:** split-screen login with a brand panel is standard for B2B portals and worth keeping — the problem is the copy and the icon treatment, not the panel. ([Eleken](https://www.eleken.co/blog-posts/login-page-examples), [WizCommerce](https://wizcommerce.com/blog/b2b-customer-portal/))

**Replace `AuthPortal.jsx:362–408`:**

- **Pill (363–365):** `Premium Truck Spare Parts` → `Heavy-duty parts · Tarlac City`
- **h1 (366–368):** unchanged — `Tarlac Truck Pitstop`
- **Paragraph (369–371):** the "premium grade / regional logistics networks" block → one verifiable sentence: `Wholesale and retail truck parts for fleet operators across Tarlac City and Central Luzon.`
- **Three cards (375–408) → two flat rows.** Delete the `p-1.5 bg-*/10 border border-*/20 rounded-lg h-8 w-8` icon boxes, the `group-hover:scale-110` nudges, and the `hover:border-l-*` colored left rails — that stack is the slop signature. Keep `Truck` and `ShieldCheck` as bare inline icons at `text-muted-foreground`.
  - Row 1 — **Brands stocked**: `Isuzu · Hino · Fuso · Toyota Dyna`
  - Row 2 — **OEM-spec sourcing**: `Parts match manufacturer specification. Wholesale and retail pricing available.`

**Follow-through:** the `Percent` icon becomes unused. Remove it from the import on line 2 or `npm run lint` fails (`--max-warnings 0`).

---

## 4. Register form fields (items 1a, 1b, 1e)

**Placeholders — one rule:** a placeholder carries a *format example*, never a restatement of the label.

| Line | Current | Change |
|---|---|---|
| 469 | `"Your full name"` | `"Juan Dela Cruz"` — restates the label today |
| 482 | `"+63 917 123 4567"` | keep — already a format example |
| 502, 603, 685 | `"customer@domain.com"` | keep |
| 521 | `"Minimum 8 characters"` | `"8+ chars, 1 number, 1 caps or symbol"` — absorbs the checklist deleted in §5 |
| 617 | `"Enter your password"` | remove the attribute — pure restatement, label is enough |

**Helper lines → one consolidated line.** Both hints currently sit in an error-or-hint ternary, so each reserves a row under a 2-column grid.

- **485–489** collapse to error-only:
  ```jsx
  {registerErrors.contactNumber && <p className="text-xs text-red-400 font-semibold">{registerErrors.contactNumber.message}</p>}
  ```
- **505–509** collapse the same way for `registerErrors.email`.
- Add after the submit button (**after line 567**, inside the `<form>`):
  ```jsx
  <p className="text-center text-xs leading-5 text-muted-foreground">
    We text delivery updates to your number. Invoices and order confirmations go to your email.
  </p>
  ```

Trust copy stays visible to everyone, including touch users — which a hover tooltip would not have.

---

## 5. Password strength: fix the card resize (items 1c, 1f)

**Diagnosis:** `AuthPortal.jsx:534` is `{registerPasswordValue && (...)}` — the block *mounts* on the first keystroke, inside a `sm:grid-cols-2` cell. The grid row grows, the `min-h-[550px]` card grows, and the whole centered layout jumps. That single conditional mount is both 1c and 1f.

**Fix:** always render, and drop the checklist.

- **Delete lines 547–554** (the requirements `<ul>`).
- **Replace the conditional block (534–556)** with an always-mounted row:
  ```jsx
  <div className="flex items-center gap-2 pt-1">
    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          passwordStrength.metCount <= 1 ? 'bg-red-500' : passwordStrength.metCount === 2 ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
        style={{ width: registerPasswordValue ? `${passwordStrength.percent}%` : '0%' }}
      />
    </div>
    <span className="w-12 shrink-0 text-right text-2xs font-bold uppercase tracking-wider text-muted-foreground">
      {registerPasswordValue ? passwordStrength.label : ''}
    </span>
  </div>
  ```
  The `w-12 shrink-0` matters: without a reserved width the label's appearance would widen the bar and reintroduce a shift on the horizontal axis.
- **`getPasswordStrength` (124–133):** `requirements` is now read by nothing. Stop returning it; keep the `met` checks feeding `metCount`, and keep the existing `// ponytail:` comment.

`CheckCircle` stays imported — the submit button still uses it.

---

## 6. Remember me: delete it (items 2a, 2b)

**Answer to "how does it work": it doesn't.** `rememberMe` appears exactly three times — the zod schema (line 21), `customerLoginDefaults` (line 34), and the input registration (line 635). `onCustomerLogin` never reads `data.rememberMe`. Supabase JS v2 persists the session to `localStorage` by default, so the box is checked-by-default and changing it changes nothing. A security-adjacent control that makes a promise the code doesn't keep is worse than no control.

- **Delete lines 632–639** (label + checkbox).
- **Line 631** — the row now holds only "Forgot password?": `className="flex justify-end pt-1"`.
- **Delete line 21** (`rememberMe: z.boolean().optional(),`) and **line 34** (`rememberMe: true`).

**Before deleting, grep `frontend/tests/auth.spec.ts` for remember-me selectors** — Playwright specs exist for the auth flow and a stale selector will fail the suite.

Session persistence is unchanged and always on, matching the Gmail default.

---

## Verification

Run from `frontend/`:

1. `npm run lint` — must report zero warnings. This is the gate that catches the unused `Percent` import from §3.
2. `npx vitest run src/tests/GoogleSignInButton.test.jsx` — the four existing tests assert label, custom label, `onClick`, and exactly 4 SVG paths. None assert classes, so §1 must leave them green. If they fail, the SVG was touched.
3. `npx playwright test tests/auth.spec.ts` — after the grep in §6.
4. Manual, `npm run dev`, toggle theme with `FloatingSettingsWidget` (bottom-right) and check **both** modes:
   - Google button surface matches the email/password inputs beside it; no light rim in dark mode.
   - Register tab: type into Password → **the card must not resize**. Bar is present and grey before typing.
   - Register tab: no grey lines under Contact number or Email; one hint line under "Create account".
   - Login tab: no Remember-me; "Forgot password?" sits right-aligned.
   - Background: dot grid, no pulsing blobs.
   - Left panel: two flat rows, no icon boxes, no hover scale.
5. Resize to 375px and 1440px — the register grid collapses to one column at `sm`; confirm the consolidated hint line and strength bar still sit correctly.

---

## Commit

Per `CLAUDE.md` §6, check `docs/jira/jira-breakdown.csv` before committing. TTP-12 (Customer Login) is the parent for this surface; prior auth-UX polish went under TTP-171.

```
fix(TTP-171): tighten auth portal UI — token-match Google button, remove dead remember-me, stop strength-meter layout shift
```

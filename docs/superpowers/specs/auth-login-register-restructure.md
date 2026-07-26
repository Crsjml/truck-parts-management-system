# Auth Login/Register Restructure — Design Spec

**Date:** 2026-07-26
**Related tickets:** TTP-12 (Customer Login, parent), TTP-170/TTP-171 (prior OAuth + magic-link work being partially reverted here)
**Status:** design approved by user, pending implementation plan

## Context

`AuthPortal.jsx` currently has 4 customer tabs: Login, Register, Reset, Magic Link. Magic link + Google OAuth were added under a since-deleted plan (`docs/plans/secure-login-oauth-otp.plan.md`, removed in commit `039589b`) to work around Supabase's ~30 email/hr rate limit on password signups. In practice:

- Magic link is redundant with Google OAuth as the "skip password" option, and passwordless email fits consumer apps more than a B2B procurement tool.
- The reset-password tab is really just "forgot password" and reads more naturally as an inline link under the login form (the pattern most B2B/SaaS tools use — Stripe, QuickBooks) than as a peer tab next to Login/Register.
- The Google button is a custom Phosphor `GoogleLogo` icon in app-themed colors, not Google's official branded button — doesn't meet Google's brand guidelines and doesn't have deliberate light/dark variants.
- Google OAuth signups skip the `contactNumber` field that password signups require (`registerSchema`, `AuthPortal.jsx:12`), leaving `Customer.phoneNumber` (optional, `schema.prisma:39`) empty — there's currently no prompt to fill it in.

This restructure: removes magic link, collapses reset into an inline link, adopts Google's standard branded button (light/dark aware), and adds a one-time profile-completion step for Google signups missing a contact number. Account model is confirmed **mixed B2C + B2B** — company info stays deferred to My Account, not added to signup.

## Decisions

1. **Tabs:** Login / Register only. Magic link removed entirely (tab, JSX, handler, `signInWithOtp` call). Reset removed as a tab; "Forgot password?" becomes an inline link under the password field on Login.
2. **Register form:** stays personal-first (full name, contact number, email, password). No company field added at signup.
3. **Google button:** replace monochrome Phosphor icon with Google's official multi-color "G" logomark. Button follows Google's light/dark button spec, switching via the existing `dark:` Tailwind class strategy (`tailwind.config.js:12`, toggled by `FloatingSettingsWidget.jsx`).
4. **Google OAuth, no existing account:** auto-create via Supabase (same as today), but redirect first-time Google signups to a one-time "complete your profile" step to capture contact number, since Google only supplies name + email.
5. **Profile-completion trigger:** no new DB column or metadata flag — an empty `Customer.phoneNumber` after login *is* the signal, since password signups can never have an empty one (schema requires `min(10)` at signup).

## Design

### Files touched

- **Modify `frontend/src/components/AuthPortal.jsx`**
  - Remove: Magic Link tab button (`460-503` block, the 4th button), Reset tab button (3rd button), Magic Link JSX (`765-795`), `handleMagicLinkRequest` (`300-334`), unused `signInWithOtp` usage.
  - Keep: `forgot` tab JSX (`733-763`) and `handleForgotRequest` (`257-286`) — unchanged internally, just no longer reachable via a tab button. Reachable instead via a new "Forgot password?" text link added next to "Remember me" on the Login tab (near `699-708`), which calls `setActiveTab('forgot')`. Add a back-arrow (`ArrowLeft`, already imported at `AuthPortal.jsx:2`) on the forgot view to return to `login`.
  - Google button (both Login `634-641` and Register `509-516` instances): swap `GoogleLogo` Phosphor icon + custom classes for Google's official button markup — official "G" logomark SVG (4-color, theme-independent) + button colors per Google's light/dark button spec (light: white bg, dark grey text `#3c4043`, light grey border; dark: `#131314` bg, white text, no border/subtle border). Implement as a shared small `GoogleSignInButton.jsx` component (single-file, reused in both tabs) to avoid duplicating the SVG + class string twice — this is the one net-new file, justified by removing duplication that already exists (two copies of the same button today).

- **Create `frontend/src/components/GoogleSignInButton.jsx`**
  - Props: `onClick`, `label` (defaults to `"Continue with Google"`).
  - Renders the official Google "G" SVG + themed button, `dark:` variants included.

- **Modify `frontend/src/App.jsx`**
  - In the existing profile-fetch effect (`148-158`), after `setCustomerProfile(p)`, if `p && !p.phoneNumber` set `activeView = 'complete-profile'`.
  - Add a render branch mirroring the existing `update-password` pattern (`437-446`):
    ```jsx
    if (activeView === 'complete-profile') {
      return (
        <CompleteProfileModal
          onComplete={() => {
            showToast('Profile updated!', 'success');
            setActiveView('storefront');
          }}
        />
      );
    }
    ```

- **Create `frontend/src/components/CompleteProfileModal.jsx`**
  - Same bespoke fixed-overlay structure as `UpdatePasswordModal.jsx` (79 lines) — single "Contact Number" field, submit calls `updateCustomerProfile({ phoneNumber })` (`authStore.js:167`), `onComplete` prop fires on success.
  - Non-dismissable (no backdrop click, no close button) — matches "force one-time completion" decision.
  - Adds `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the heading, and a focus trap (focus the input on mount; keep Tab cycling inside the two focusable elements — input + submit button) since this is new auth-adjacent surface (`accessibility` skill) and the modal it's modeled on doesn't have these.

- **Unchanged:** `UpdatePasswordModal.jsx`, `authStore.js` (reused as-is), backend, Prisma schema.

### Data flow

1. Google click (Login or Register tab) → `handleGoogleSignIn` (`AuthPortal.jsx:288-298`, unchanged) → Supabase OAuth redirect → back to app, `onAuthStateChange` fires → `handleUserChange` (`App.jsx` effect) sets `supabaseUser`.
2. Profile-fetch effect (`App.jsx:148-158`) calls `fetchCustomerProfile()` → if `phoneNumber` empty → `activeView = 'complete-profile'`.
3. `CompleteProfileModal` submits → `updateCustomerProfile({ phoneNumber })` → `onComplete` → `activeView = 'storefront'`.
4. Subsequent logins: `phoneNumber` now set, condition false, modal never shows again.

### Error handling

- `CompleteProfileModal` submit failure (network/Supabase error): show inline error text under the field (same pattern as existing form errors in `AuthPortal.jsx`, e.g. `registerErrors.fullName` styling), keep modal open, no silent failure.
- Contact number validation: reuse the same rule as `registerSchema.contactNumber` (`z.string().min(10)`) so behavior matches password signup.

### Testing

- Manual: Google signup (new account) → verify redirected to complete-profile modal → submit → lands on storefront → log out/in → modal does not reappear.
- Manual: password signup → verify no complete-profile prompt (phoneNumber already set).
- Manual: Login tab → click "Forgot password?" → verify inline reveal of the existing reset form → back arrow returns to Login.
- Manual: toggle dark/light via `FloatingSettingsWidget` on the login screen → verify Google button matches Google's light/dark button spec in both states, rest of form remains themed correctly via existing tokens.
- Playwright: extend `docs/plan-e2e-auth-profile.md`'s existing coverage (TTP-102–106) is out of scope here since that doc covers registration/login/profile-edit already — if a plan-level task wants automated coverage for the new complete-profile flow, add it as a new E2E case, not a modification of that doc.

## Skills to apply during implementation

- `design-taste-frontend`, `high-end-visual-design`, `web-design-guidelines`, `tailwind-design-system` — Google button + form visual polish (Area A storefront directive, CLAUDE.md §4).
- `accessibility` — new `CompleteProfileModal` dialog semantics/focus trap.
- `security-review` — OAuth completion flow, no new attack surface expected but auth-adjacent code always gated.
- `frontend-patterns` — `activeView` state wiring in `App.jsx`.

## Out of scope

- Company info at signup (deferred to My Account, per mixed B2C/B2B decision).
- Any change to `UpdatePasswordModal.jsx`'s existing accessibility gaps (unrelated to this restructure — not touching that file).
- Automated Playwright coverage (noted above, left for the implementation plan to decide as its own task if wanted).

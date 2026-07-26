# Secure Customer Login: Google OAuth + Email Magic Link

> On approval, copy to `docs/plans/secure-login-oauth-otp.plan.md` (repo convention:
> `auth-form-improvements.plan.md`).

**Revised under ponytail.** Previous draft added 3 new files and a typed 6-digit OTP
flow. Both cut — see *What got cut* at the bottom. Net change is now **one existing
file, ~45 lines, zero new files, zero new dependencies.**

## Context

Customer login is email + password only (`AuthPortal.jsx`), email verification enforced
on sign-in. Two problems:

1. **Verification email delivery is broken.** Supabase's built-in sender caps ~30
   emails/hour project-wide, documented "for demonstration purposes only." Commits
   `1ccc5e4` / `e2ed370` added `isRateLimitError` to swallow the resulting
   `unexpected_failure` / HTTP 500s. Symptom patch. Root cause is the mail transport.
2. **Password-only signup is high-friction** for freight operators / wholesale buyers,
   and every signup burns a scarce verification email.

Outcome: two zero-cost verified sign-in paths — **Google OAuth** (primary) and
**email magic link** (non-Google addresses) — password login retained, clear messaging
when a user arrives via the wrong method for their account.

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Primary method | Google OAuth, prominent CTA | Free, unlimited, pre-verified email, no deliverability risk |
| Passwordless mechanism | Supabase `signInWithOtp`, **magic link** (not typed code) | Same call, same security, zero UI. No code input, no cooldown timer, no email-template edit |
| SMTP relay | **Brevo** (~300/day free) | Fits 50–100/day; verified sender address only, no domain purchase |
| Phone / SMS OTP | **Dropped** | Supabase phone login requires Twilio/MessageBird/Vonage/TextLocal. All metered, no free tier, PH SMS expensive, Twilio trial only sends to pre-verified numbers |
| Password login | **Kept** | Admin portal depends on it; existing users have passwords |
| Wrong-method messaging | Neutral always-on hint | No user enumeration, zero backend work |

## Architecture

**Backend and database: no changes.**

`getOrCreateCustomer` (`backend/src/routes/customers.js:7`) already upserts on `authId`
and reads `user_metadata.avatar_url` / `full_name` — exactly what Google populates.
Supabase identity linking attaches new identities to the *same* auth user, so `authId`
is invariant. No migration, no new route, no middleware change.

Accepted gap: Google supplies no contact number → `phoneNumber` lands `''` for OAuth
signups. Existing My Profile screen covers it.

**Frontend: one file.** `AuthPortal.jsx` is 647 lines against the 800 ceiling in
`CLAUDE.md`. Magic link (not typed OTP) keeps the additions small enough to stay
inline — lands ~691. No component extraction needed.

## Behavior matrix

Supabase handles the same-email cases natively via automatic identity linking (merges
identities sharing a *verified* email, drops unconfirmed identities to prevent
pre-account-takeover). Only C needs UI work.

| # | Situation | Supabase behavior | UI |
|---|---|---|---|
| A | New user → Google | Creates user, email confirmed | Straight in |
| B | Password user → clicks Google | Auto-links Google identity | Straight in |
| C | Google-only user → tries password | Generic `invalid_credentials` | **Neutral hint + Google button** |
| D | Google-only user → Forgot password | Reset flow *adds* a password identity | Works as-is |
| E | Google-only user → magic link | Signs in as same user | Straight in |
| F | Unknown email → magic link | No user created (`shouldCreateUser: false`) | "No account found — register first" |
| G | Unverified password user → Google | Google's verified email wins, drops unconfirmed identity | Straight in |
| H | Register email already on Google | `user_already_exists` | "Already registered via Google" |

**G is a free bug fix** — Google sign-in rescues anyone currently locked out behind an
undelivered confirmation email.

**C detail**: Supabase deliberately returns identical `invalid_credentials` for "wrong
password" and "no password set," to avoid leaking which emails are registered. Client
cannot distinguish them. So: fixed hint after *every* failed password attempt,
regardless of whether the email exists. Precise-but-leaky provider lookup rejected.

## Implementation

### Phase 1 — Configuration (no code; gates all testing)

1. **Brevo**: account, verify sender address, copy SMTP host/port/user/key.
2. **Supabase → Project Settings → Authentication → SMTP**: enter Brevo credentials.
   **Rate Limits**: raise email cap from default 30/hour to fit 50–100/day.
3. **Google Cloud Console**: OAuth 2.0 Client ID (Web application). Authorized redirect
   URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. **Supabase → Authentication → Providers → Google**: enable, paste Client ID + Secret.
5. **Supabase → Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Redirect URLs allowlist: `http://localhost:5173/**`

No email-template edit needed — magic link is what the default Magic Link template
already sends.

### Phase 2 — `frontend/src/components/AuthPortal.jsx` (only file touched)

**Google button** (~15 lines) — inline at top of customer login + register panels,
above an "or" divider, since Google is the primary path.

```js
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
})
```

Customer mode only. **Do not add to the admin panel** (`AuthPortal.jsx:578`) — admin
accounts are deliberately not publicly provisioned.

**Magic link tab** (~25 lines) — clone the existing `forgot` tab block
(`AuthPortal.jsx:549–576`). It is already the exact shape needed: email input +
submit + notice banner + `isRateLimitError` handling. Swap one call:

```js
supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false, emailRedirectTo: window.location.origin }
})
```

`shouldCreateUser: false` is what prevents drive-by account creation from the login
form. Add as 4th tab in the bar at `AuthPortal.jsx:379–412`.

**Two message tweaks** (~4 lines):
- `onCustomerLogin` error branch (`AuthPortal.jsx:194`) → append scenario-C hint.
- `onCustomerRegister` "already registered" branch (`AuthPortal.jsx:160`) → also match
  `user_already_exists` (scenario H).

**Reuse as-is, do not touch**: `isRateLimitError` (`:137`) already shared by 3 callers;
`renderNoticeBanner` (`:84`) already classifies error/success by regex; `inputClass`
(`:134`).

**No `App.jsx` change.** `onAuthStateChange` (`App.jsx:139`) already handles the
returning session generically via `handleUserChange`, covering both the OAuth redirect
and the magic-link click.

### Security checklist

- `shouldCreateUser: false` on the login-path magic link send.
- Failed-login message stays neutral — no user enumeration.
- No new client secrets. Google Client Secret lives only in Supabase;
  `VITE_SUPABASE_ANON_KEY` is already public by design.
- Resend abuse: Supabase enforces a per-user email cooldown server-side. Surface its
  error, do not build a client timer.

## Verification

**Config gate first** — trigger a password reset from the existing Reset tab, confirm
the email arrives. If Brevo isn't live nothing downstream works.

**Manual, against `make up` (frontend `5173`, backend `5000`):**

1. **Google, new user** → signed in, lands in storefront. `GET /api/customers/me`
   returns `displayName` + `photoURL` populated from Google — confirms
   `getOrCreateCustomer` needed no change.
2. **Google, existing password user** (B) → same email as a seeded password account →
   Supabase Studio shows **one** user with **two** identities (`email`, `google`).
3. **Magic link** (E) → request with a non-Google address, click link in email, verify
   sign-in.
4. **Scenario C** → password login against a Google-only account → neutral hint +
   Google button appear.
5. **Scenario F** → magic link for an unregistered email → "no account found", and
   Studio shows no user created.
6. **Admin portal unchanged** → no Google button, password login still works.

**One automated check** — extend `frontend/tests/auth.spec.ts` with scenario C
(neutral hint on failed password login). It is the only new branch testable without an
inbox. Existing `AuthPage` page object (`frontend/tests/pages/AuthPage.ts`) already
models tab switching and email/password locators.
Run `npx playwright test auth.spec.ts`.

Magic-link and Google E2E are **out of scope**: one needs inbox access, the other
redirects to a Google-controlled consent page Playwright can't drive. Verify manually.

## What got cut (vs. previous draft)

| Cut | Why |
|---|---|
| `frontend/src/api/authProviders.js` | 3 one-line wrappers over `supabase.auth.*`. AuthPortal already calls the SDK inline. Abstraction over an already-clean API |
| `GoogleSignInButton.jsx` | It's a button. ~15 lines inline, file stays under ceiling |
| `EmailOtpForm.jsx` | Magic link needs no 6-digit input and no two-step state. Existing `forgot` tab is the same shape |
| Moving `isRateLimitError` | Already shared by 3 callers in that file. Moving it is churn, not dedup |
| `{{ .Token }}` template edit | Only needed for typed codes. Default Magic Link template already works |
| 60s client cooldown timer | Supabase enforces per-user email cooldown server-side |

**Tradeoff to name**: magic link makes the user switch to their email client and click,
rather than typing a code without leaving the tab. Add the typed-code variant (which
*does* need `{{ .Token }}` plus a 6-digit input) when someone actually complains.

## Out of scope

- **Phone/SMS OTP** — no free provider.
- **Hardcoded domain allowlist** at `AuthPortal.jsx:206` (`lakers.com`, `warriors.com`,
  …) letting seed accounts skip verification. Removable once Google + magic link land,
  but deleting it now risks breaking seeded test accounts. Separate ticket.
- **`getOrCreateCustomer`'s `update: {}`** — Google-side profile changes never re-sync
  after first login. Pre-existing, unrelated.

## Ticket

Closest existing ticket is **TTP-12 "Customer Login"** (marked Done) → this is new scope
under it. Per `CLAUDE.md` §6 I will not invent an ID: **create a subtask under TTP-12**
and use that ID. The recent auth commits used `TTP-103`, but per
`docs/jira/jira-breakdown.csv:67` that ticket is "Customer can update display name,
contact number, and email" — wrong ticket to extend.

**No commit until the subtask exists.**

## Open items (yours)

- Brevo ~300/day unverified — knowledge cutoff Feb 2025. Confirm at signup. Below
  50–100/day → Gmail SMTP (~500/day, app password) substitutes, no plan change.
- TTP-12 subtask ID.

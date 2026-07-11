# Plan-Orchestrate Result

**Plan**: `docs/plan-e2e-auth-profile.md`
**Lang**: `react`
**ECC mode**: `legacy`
**Steps**: 4
**Scope**: all

## Steps overview

| # | Title | Tags | Chain |
|---|---|---|---|
| 1 | Configure Playwright & E2E Fixtures | impl, test | `tdd-guide,e2e-runner,react-reviewer` |
| 2 | Test Registration and Login | impl, test | `tdd-guide,e2e-runner,react-reviewer` |
| 3 | Test Profile Edit Reflection | impl, test | `tdd-guide,e2e-runner,react-reviewer` |
| 4 | Test Profile Picture Upload | impl, test | `tdd-guide,e2e-runner,react-reviewer` |

---

## Step 1 — Configure Playwright & E2E Fixtures

**Intent**: Set up the `playwright.config.js` and `auth.js` fixtures to support database teardown and test-user seeding.
**Tags**: impl, test
**Chain rationale**: `tdd-guide` writes the config and fixtures; `e2e-runner` validates the Playwright setup works locally; `react-reviewer` ensures it follows frontend conventions.

```bash
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-1] Set up playwright.config.js and e2e auth fixtures for testing; Acceptance: playwright runs locally; auth fixtures can seed test users; DB teardown works."
```

## Step 2 — Test Registration and Login

**Intent**: Implement E2E tests for TTP-103 and TTP-104 covering registration, login, session state, and error handling for invalid inputs.
**Tags**: impl, test
**Chain rationale**: `tdd-guide` writes the test suite; `e2e-runner` executes the tests to ensure they pass; `react-reviewer` acts as the final gatekeeper for code quality.

```bash
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-2] Implement E2E tests for registration and login (TTP-103, TTP-104); Acceptance: successful registration redirects correctly; successful login maintains session; invalid inputs show errors."
```

## Step 3 — Test Profile Edit Reflection

**Intent**: Implement E2E tests for TTP-105 to update profile fields (display name, contact number) and verify the changes reflect immediately in the UI and persist after a page reload.
**Tags**: impl, test
**Chain rationale**: `tdd-guide` implements the profile edit E2E flow; `e2e-runner` runs the assertions against the UI; `react-reviewer` checks the test code.

```bash
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-3] Implement E2E tests for profile edit reflection (TTP-105); Acceptance: updating profile reflects immediately in UI; reloading the page shows the persisted changes."
```

## Step 4 — Test Profile Picture Upload

**Intent**: Implement E2E tests for TTP-106 to upload a mock profile picture (PFP), intercept the API response, and verify the frontend updates the preview and backend persists the image URL.
**Tags**: impl, test
**Chain rationale**: `tdd-guide` writes the file upload and network interception tests; `e2e-runner` validates the PFP upload flow; `react-reviewer` finalizes the chain.

```bash
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-4] Implement E2E tests for profile picture upload (TTP-106); Acceptance: mock PFP upload updates preview; backend saves the new PFP URL across reloads."
```

---

## Batch execution

You can paste these one-by-one or sequentially to spawn the agents for the entire testing flow:

```bash
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-1] Set up playwright.config.js and e2e auth fixtures for testing; Acceptance: playwright runs locally; auth fixtures can seed test users; DB teardown works."
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-2] Implement E2E tests for registration and login (TTP-103, TTP-104); Acceptance: successful registration redirects correctly; successful login maintains session; invalid inputs show errors."
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-3] Implement E2E tests for profile edit reflection (TTP-105); Acceptance: updating profile reflects immediately in UI; reloading the page shows the persisted changes."
/orchestrate custom "tdd-guide,e2e-runner,react-reviewer" "[Plan: docs/plan-e2e-auth-profile.md#step-4] Implement E2E tests for profile picture upload (TTP-106); Acceptance: mock PFP upload updates preview; backend saves the new PFP URL across reloads."
```

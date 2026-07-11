# E2E Testing Plan: Auth and Profile (TTP-102 to TTP-106)

This plan covers end-to-end testing for authentication and profile management using Playwright.

## Step 1 — Configure Playwright & E2E Fixtures
Set up the `playwright.config.js` in the `frontend` directory. Ensure `baseURL` is set correctly. Create E2E fixtures (`frontend/tests/e2e/fixtures/auth.js`) for seeding test users in the database and handling test teardown.

## Step 2 — Test Registration and Login (TTP-103, TTP-104)
Implement `frontend/tests/e2e/auth/register.spec.js` and `frontend/tests/e2e/auth/login.spec.js`. 
- Verify the user can register successfully.
- Verify the user can log in and session state is maintained.
- Ensure proper error messages on invalid inputs.

## Step 3 — Test Profile Edit Reflection (TTP-105)
Implement `frontend/tests/e2e/profile/edit.spec.js`. 
- Log in as a test user.
- Navigate to the profile page and update display name and contact number.
- Verify the UI reflects the updated information immediately.
- Reload the page to confirm the backend successfully persisted the changes.

## Step 4 — Test Profile Picture Upload (TTP-106)
Implement `frontend/tests/e2e/profile/pfp.spec.js`.
- Provide a mock image file for upload.
- Intercept or wait for the backend upload endpoint.
- Verify the profile picture preview updates in the frontend.
- Ensure the backend URL for the PFP is saved and persists across reloads.

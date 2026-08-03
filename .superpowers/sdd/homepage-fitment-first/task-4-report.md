# Task 4 Report: Homepage Hierarchy Regression Coverage

## Scope

- Added homepage hero locators to `frontend/tests/pages/StorefrontPage.ts` for:
  - `Select your truck`
  - `Browse Catalog`
  - `Search parts`
- Added a mobile-oriented Playwright regression in `frontend/tests/storefront.spec.ts` that verifies the homepage exposes truck fitment before catalog browsing.
- Added a matching React Testing Library assertion in `frontend/src/tests/CustomerStorefront.test.jsx` so the homepage hero contract is covered below the browser layer too.

## TDD Record

### Red

- Added `home page exposes truck fitment before browsing on mobile` to `frontend/tests/storefront.spec.ts` first.
- Ran:

```bash
npx playwright test tests/storefront.spec.ts -g "home page exposes truck fitment before browsing on mobile"
```

- Initial failure details:
  - First run was blocked by sandbox port binding on `0.0.0.0:5173`.
  - Re-run with approval reached the test and failed in Chromium with:
    - `toBeVisible can be only used with Locator object, was called with undefined`
  - Firefox and WebKit also failed because local Playwright browser binaries were missing.

### Green

- Added the three homepage hero locators to `StorefrontPage`.
- Kept the new browser test focused on visible homepage hierarchy before any catalog interaction.
- Added matching RTL coverage for the hero labels in `CustomerStorefront.test.jsx`.

## Verification

### Required Playwright check

Ran:

```bash
npx playwright test tests/storefront.spec.ts -g "home page exposes truck fitment before browsing on mobile"
```

Result:

- `3 passed`
- Browsers covered by current config:
  - Chromium
  - Firefox
  - WebKit

### Supporting RTL check

Ran:

```bash
npx vitest run src/tests/CustomerStorefront.test.jsx
```

Result:

- `16 passed`
- Vitest emitted local connection `EPERM` warnings for `localhost:3000`, but the test file still completed successfully with exit code `0`.

## Notes

- No homepage UI copy was changed.
- The only non-test-environment action outside the three requested files was installing missing Playwright browsers so the exact required Playwright command could complete successfully across all configured projects.

## Task 1 Report: Extract a fitment-first hero

### Scope completed
- Created `frontend/src/components/storefront/HomeHero.jsx`
- Updated `frontend/src/components/CustomerStorefront.jsx` to render `HomeHero` on the home tab
- Added `frontend/src/components/storefront/__tests__/HomeHero.test.jsx`

### TDD flow
1. Wrote the failing `HomeHero` test first with the exact assertions from the brief.
2. Verified red by running:
   - `npm test -- src/components/storefront/__tests__/HomeHero.test.jsx -t "puts truck selection ahead of browsing on the home screen"`
   - Result: failed because `HomeHero` did not exist yet.
3. Implemented the minimal `HomeHero` component and wired `CustomerStorefront` to use it.
4. Fixed one extraction regression where `CustomerStorefront` still referenced `shouldReduceMotion`.
5. Adjusted the home-tab fitment trigger so the hero CTA is the single accessible truck-selection control on the homepage while still opening the existing `CompatibilityFilter`.
6. Verified green with targeted tests.

### What changed
- `HomeHero` now renders a dedicated accessible hero region named "Homepage hero".
- The hero makes truck selection the primary CTA, browse catalog the secondary CTA, and keeps search visually subordinate.
- `CustomerStorefront` now passes existing search state and fitment state into `HomeHero`.
- The existing compatibility filter remains in use; on the home tab it now opens beneath the hero instead of duplicating the header trigger in the accessibility tree.
- The existing trusted brands, value props, and category browsing content remain on the homepage below the new hero.

### Tests run
- `npm test -- src/components/storefront/__tests__/HomeHero.test.jsx src/tests/CustomerStorefront.test.jsx -t "puts truck selection ahead of browsing on the home screen|shows a fitment chip that opens the compatibility filter"`

### Result
- PASS: `HomeHero` fitment-first rendering test
- PASS: existing `CustomerStorefront` fitment trigger behavior test

### Notes / concerns
- The targeted test run passes, but `CompatibilityFilter` still logs localhost fetch failures in the test environment because it attempts to request `/api/categories` and `/api/parts/vehicle-options` without a running backend. These appear as console noise only and did not fail the passing assertions.

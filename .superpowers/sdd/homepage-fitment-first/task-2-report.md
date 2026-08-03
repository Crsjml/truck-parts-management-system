## Task 2 Report: Distill Above-the-Fold Homepage Clutter

### Scope
- Updated `frontend/src/components/CustomerStorefront.jsx`
- Updated `frontend/src/tests/CustomerStorefront.test.jsx`
- Left the Task 1 `HomeHero` design intact

### What Changed
- Replaced the old above-the-fold trust/proof stack on the home tab:
  - removed the `Trusted by Global Fleets` marquee
  - removed the three-card `VALUE_PROPS` feature grid
- Added one compact proof layer directly below the hero using the exact brief copy:
  - `Fitment first. Browse by truck, then part.`
  - `Live stock visibility`
  - `Wholesale-ready accounts`
  - `Compatibility-aware browsing`
- Kept the category browse path intact, but lowered it beneath the hero, compact proof layer, and reorder rail so the first screen reads as a single decision path
- Moved `ReorderRail` above the category section to support that simpler above-the-fold sequence

### TDD Evidence
1. Added failing regression test:
   - `keeps the home surface focused on one proof layer instead of multiple competing promos`
2. Verified red:
   - Command:
     - `npm test -- src/tests/CustomerStorefront.test.jsx -t "keeps the home surface focused on one proof layer instead of multiple competing promos"`
   - Result:
     - failed because `Trusted by Global Fleets` was still present
3. Implemented the minimal storefront change
4. Verified green:
   - Command:
     - `npm test -- src/tests/CustomerStorefront.test.jsx -t "keeps the home surface focused on one proof layer instead of multiple competing promos"`
   - Result:
     - `Test Files  1 passed (1)`
     - `Tests  1 passed | 13 skipped (14)`

### Notes
- Vitest emitted an existing localhost connection warning / `AggregateError` involving `127.0.0.1:3000` and `::1:3000`, but the targeted test still completed with exit code `0` on the green run.

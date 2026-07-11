# Activity Log

## [2026-07-04] Repository Cleanup & Audit
- **Goal:** Remove dead code, redundant scripts, and unnecessary dependencies.
- **Actions Taken:**
  - Audited and retained the high-quality `src/tests` (RTL frontend tests & Supertest backend tests).
  - Permanently deleted the python E2E scripts (`tests/qa/`) as they were out of scope for our Node.js stack and used only for debugging.
  - Removed outdated AI patching scripts from the project root (`fix_filters.js`, `update_homepage.js`, `update_tweaks.js`).
  - Archived backend seeder scripts (`seedMockPOs.js`, `seedTestTransactionsAndReviews.js`, `seed_firebase.js`) to a `.archive` folder (gitignored).
  - Swept `package.json` files: Removed unused `lucide-react` from frontend, and `bcryptjs`, `jsonwebtoken`, `mongodb-memory-server` from backend.
- **Rationale:** Strict adherence to the `ponytail` (Deletion over addition) and `testing-qa` (Meaningful tests) skills.

## [2026-07-04] Planning Phase 4 (Upcoming)
- Finalized the architecture for migrating Customer profile metadata (Saved Parts, Phone, Avatar) strictly to MongoDB while leaving Auth to Firebase.
- Planned UI refinements: Centering the category grid and cleaning up the filter reset buttons.

## [2026-07-11] UI Refinements & Testing Setup
- **Goal:** Improve Admin UI real estate, refine Parts Inventory grids, and configure E2E testing.
- **Actions Taken:**
  - Added collapsible sidebar toggle to `App.jsx` for the Admin global navigation.
  - Refactored `PartsCatalog.jsx` grid cards into a bento-box layout with updated Phosphor icons.
  - Fixed overflow clipping issues in `CompatibilityFilter.jsx` dropdowns via `menuPortalTarget`.
  - Added Playwright fixtures and test teardown scripts for upcoming E2E authentication testing.
  - Formatted Dashboard KPI values to 1 decimal place with exact value tooltips.
  - Styled Low Stock Watchlist rows with red highlights and added double-click pre-filtered inventory routing.
  - Overhauled Parts Catalog category filters to a space-efficient two-tier scrolling pill layout.
  - Enforced a dependency between Vehicle Brand and Series dropdowns in the Compatibility Filter.
- **Rationale:** Maximize horizontal screen space for data-dense grids and prepare for robust E2E test coverage.

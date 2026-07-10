# TTP Sprint 1 & 2 - Gap Analysis & E2E Testing Report

**Generated:** 2026-07-10
**App URL:** http://localhost:5173
**Database:** PostgreSQL (Prisma) + MongoDB (legacy Mongoose models)
**Auth:** Supabase Auth (JWT)
**E2E Framework:** Playwright 1.61.1

---

## E2E Test Results (Existing Tests)

| Test File | Status | Notes |
|-----------|--------|-------|
| `storefront.spec.ts` - Catalog loads | PASS | Products render without crash |
| `storefront.spec.ts` - Search & add to cart | PASS | Search + cart drawer works |
| `categories.spec.ts` - Reviews mock | PASS | Review mocking/intercept works |
| `categories.spec.ts` - Categories mock | FAIL | Mock categories don't render as buttons (test locator mismatch) |
| `auth.spec.ts` | SKIPPED | All tests disabled via `test.describe.skip` |
| `admin.spec.ts` | SKIPPED | All tests disabled via `test.describe.skip` |
| `checkout.spec.ts` | SKIPPED | All tests disabled via `test.describe.skip` |

---

## SPRINT 1 - GAP ANALYSIS

### TTP-134: Parts Category Management [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can create, edit, and delete categories and subcategories | Full CRUD in `backend/src/routes/categories.js` (hierarchical via `parentId`) | MATCH |
| AC2: Parts can be linked to categories correctly | Part model has `categoryId` FK | MATCH |
| AC3: Categories appear in catalog filters for customers | `CustomerStorefront.jsx` has category filter tabs | MATCH |

**Subtasks:** TTP-167 (Done), TTP-168 (Done), TTP-169 (Done)
**Verdict:** FULLY IMPLEMENTED
**E2E Needed:** Category CRUD flow, category appearing in storefront filters

---

### TTP-114: Roles and Permission [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin users can access admin dashboard and all management features | Admin sidebar with role-based rendering, `StaffRole` model with permissions | MATCH |
| AC2: Customer users can only access the customer portal | `AuthPortal` routes customers to storefront, `requireAuth` middleware checks role | MATCH |
| AC3: Customers cannot access admin-only pages even with direct URL | Backend `staffRoutes.js` checks `StaffRole` before granting access | MATCH |
| AC4: Role is correctly assigned upon registration or account creation | Auto-role assignment in `staffRoutes.js` (SUPERADMIN for admin emails, default for customers) | MATCH |

**Subtasks:** TTP-115 (Done), TTP-116 (Done), TTP-117 (Done), TTP-118 (Done)
**Verdict:** FULLY IMPLEMENTED
**E2E Needed:** Admin dashboard access, customer URL restriction, role-based rendering

---

### TTP-90: Password Reset [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: User can request a password reset from the login page | AuthPortal has "Forgot Password" tab with email input | MATCH |
| AC2: Reset link is sent to the registered email | Uses Supabase's built-in password reset email | MATCH |
| AC3: Reset link expires after a defined time period | Handled by Supabase Auth (token expiry built-in) | MATCH |
| AC4: User is redirected to a confirmation screen after successful reset | AuthPortal shows confirmation state after reset | MATCH |

**Subtasks:** None listed
**Verdict:** FULLY IMPLEMENTED (via Supabase Auth)
**E2E Needed:** Reset flow with mocked Supabase responses

---

### TTP-66: Admin Login [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can log in through a separate portal | AuthPortal has "Admin" tab with email/password fields | MATCH |
| AC2: Admin credentials are not accessible via the public registration page | Registration creates customer accounts only; admin role is assigned server-side | MATCH |
| AC3: Successful login redirects admin to the dashboard | Admin login redirects to /admin/dashboard | MATCH |
| AC4: Invalid credentials display an appropriate error message | Error messages shown in AuthPortal on failed login | MATCH |

**Subtasks:** TTP-80 (Done), TTP-81 (Done), TTP-82 (Done), TTP-83 (Done)
**Verdict:** FULLY IMPLEMENTED
**E2E Needed:** Admin login/logout, invalid credential error, redirect check

---

### TTP-62: Search and Filter Parts [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Search returns relevant results for name, brand, and specification queries | `backend/src/routes/parts.js` `GET /api/parts` supports `?search=` query on name, sku, compatibility fields | MATCH |
| AC2: Autocomplete suggestions appear as the user types | PartsCatalog has search with autocomplete suggestions dropdown | MATCH |
| AC3: Filters narrow results correctly | Category tabs, price sort, low-stock filter, vehicle brand/series filter | MATCH |
| AC4: Stock status is shown alongside each search result | Stock count displayed on product cards with color coding | MATCH |

**Subtasks:** TTP-78 (Done), TTP-74 (Done), TTP-76 (Done), TTP-77 (Done)
**Verdict:** FULLY IMPLEMENTED
**E2E Needed:** Search flow, autocomplete, filter combination, stock status visibility

---

### TTP-56: Product Listing [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Catalog displays all available parts with basic details | `CustomerStorefront.jsx` product grid showing name, price, stock, category | MATCH |
| AC2: Pagination works correctly across all pages | Pagination at 12 per page in storefront | MATCH |
| AC3: Filters return accurate and relevant results | Category, price range, stock status, vehicle brand/series filters work | MATCH |
| AC4: Stock availability is reflected in real time | Stock count updates after transaction/POST, reflected immediately (no WebSocket) | PARTIAL |

**Subtasks:** None
**Verdict:** MOSTLY IMPLEMENTED
**Gap:** AC4 "real time" - stock reflects on page reload but is NOT pushed via WebSocket/SSE. Relies on manual refresh or page navigation. This is acceptable for an MVP.

**E2E Needed:** Catalog load, pagination, filter accuracy, stock display

---

### TTP-21: Real-Time Stock Tracking [In Review]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Stock level decreases automatically when a sale is completed | Transaction route (`backend/src/routes/transactions.js`) decrements stock on checkout | MATCH |
| AC2: Stock level increases when new stock is recorded | PO "Received" status auto-increments stock; PartsCatalog has manual restock button | MATCH |
| AC3: Changes are reflected instantly in the catalog and admin dashboard | Stock updates on page reload; no real-time push mechanism | PARTIAL |
| AC4: No manual update is required after a transaction | Transaction route handles stock deduction atomically | MATCH |

**Subtasks:** TTP-160 (In Progress), TTP-161 (In Progress), TTP-162 (In Progress)
**Verdict:** MOSTLY IMPLEMENTED (In Review)
**Gap:** "Instantly" implies real-time. Current implementation requires page refresh. Need WebSocket/SSE or polling for true real-time updates.
**E2E Needed:** Sale deducts stock, PO receipt adds stock, stock sync across views

---

### TTP-12: Customer Login [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Registered user can log in with correct email and password | Supabase auth sign-in in `loginCustomer()` | MATCH |
| AC2: JWT token is issued upon successful login | Supabase returns JWT; stored in memory/localStorage | MATCH |
| AC3: Remember-me option keeps user logged in across sessions | `authStore.js` stores session in localStorage when "remember me" checked | MATCH |
| AC4: Account is temporarily locked after multiple failed attempts | Rate limiting implemented: 5 failed attempts = 15 min lockout in `authStore.js` | MATCH |

**Subtasks:** None
**Verdict:** FULLY IMPLEMENTED
**E2E Needed:** Login flow, JWT storage, remember-me, rate limiting test

---

### TTP-11: Add/Edit Parts Record [In Review]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can add a new part with all required fields | PartsCatalog has AddPartModal with all fields (name, SKU, OEM, category, price, stock, min_stock, description, compatibility, image) | MATCH |
| AC2: Admin can edit existing part records | EditPartModal opens with pre-filled data | MATCH |
| AC3: System rejects incomplete or invalid inputs | Zod validation on both frontend and backend | MATCH |
| AC4: Changes are saved and reflected in the catalog immediately | After save, catalog refreshes; changes appear on reload | PARTIAL |

**Subtasks:** TTP-151 (In Progress), TTP-157 (In Progress), TTP-158 (In Progress), TTP-159 (In Progress)
**Verdict:** MOSTLY IMPLEMENTED (In Review)
**Gap:** AC4 "immediately" - changes appear after catalog refresh, not pushed in real-time.
**E2E Needed:** Add part, edit part, validation errors, save-and-reflect

---

### TTP-10: Customer Registration [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: User can register with full name, contact number, email, and password | AuthPortal registration has all 4 fields | MATCH |
| AC2: System rejects incomplete or invalid inputs | Zod validation, email format check, password strength | MATCH |
| AC3: Verification email is sent upon registration | Supabase handles verification email sending | MATCH |
| AC4: User cannot log in until email is verified | Supabase blocks unverified email sign-in | MATCH |

**Subtasks:** None
**Verdict:** FULLY IMPLEMENTED (via Supabase Auth)
**E2E Needed:** Registration flow, validation errors, email verification mock

---

### TTP-3: AI Assistant [To Do]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| Epic: AI-powered chatbot with live inventory queries | NOT IMPLEMENTED - No AI feature exists anywhere in the codebase | MISSING |
| Epic: Alternative part suggestions when stock is unavailable | NOT IMPLEMENTED | MISSING |
| Epic: Logging out-of-stock requests for restocking decisions | NOT IMPLEMENTED | MISSING |

**Subtasks:** None defined in CSV (epic-level)
**Verdict:** NOT IMPLEMENTED
**E2E Needed:** N/A (no feature to test)

---

## SPRINT 2 - GAP ANALYSIS

### TTP-102: Profile Management [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Customer can update display name, contact number, and email | `MyAccount.jsx` has fields for displayName, email, phoneNumber with photo upload | MATCH |
| AC2: System rejects invalid inputs | Zod validation on frontend, Prisma validation on backend | MATCH |
| AC3: Changes are saved and reflected immediately upon submission | Profile saves via `PUT /api/customers/me`, UI updates optimistically | MATCH |
| AC4: Confirmation message is shown after a successful update | Toast/notification shown after save | PARTIAL |

**Subtasks:** TTP-103 (In Review), TTP-104 (Done), TTP-105 (In Review), TTP-106 (In Review), TTP-107 (Done)
**Verdict:** MOSTLY IMPLEMENTED (In Progress)
**Gap:** AC4 confirmation message - need to verify toast is shown. Subtasks TTP-105, TTP-106 still In Review.
**E2E Needed:** Profile update, validation errors, confirmation toast

---

### TTP-94: Product Reviews [To Do]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Only logged-in customers who purchased the part can leave a review | Backend checks `purchaseVerified` by querying transactions; ReviewSection hides form for non-purchasers | MATCH |
| AC2: Star rating and text review are both submitted successfully | Star selector + textarea, max 1000 chars, POST to `/api/reviews` | MATCH |
| AC3: Aggregate score is updated and displayed on the product page after submission | Average rating shown on product detail modal and storefront cards | MATCH |

**Subtasks:** TTP-121 (To Do), TTP-123 (To Do), TTP-124 (To Do), TTP-125 (To Do)
**Verdict:** FULLY IMPLEMENTED (Jira says "To Do" but code is complete)
**Note:** All subtasks show "To Do" in Jira but the review feature is actually fully coded with CRUD, purchase verification, average rating, and star UI. Jira status needs updating.
**E2E Needed:** Submit review, purchase verification, aggregate score update

---

### TTP-75: Stock Adjustment [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can manually adjust stock count for any part | PartsCatalog has restock modal with quantity input | MATCH |
| AC2: Reason log field is mandatory before submission | Reason field exists on StockAdjustment form (TTP-164 In Progress) | PARTIAL |
| AC3: Adjustment is saved with timestamp and reason | Backend `PUT /api/parts/:id` updates stock but no dedicated adjustment history table | MISSING |
| AC4: Updated stock count is reflected immediately in the inventory | After restock, UI refreshes with new count | PARTIAL |

**Subtasks:** TTP-163 (In Progress), TTP-164 (In Progress), TTP-165 (In Progress), TTP-166 (In Progress)
**Verdict:** PARTIALLY IMPLEMENTED (In Progress)
**Gaps:**
- AC2: Reason field may not be enforced as mandatory
- AC3: No dedicated adjustment audit log - stock changes overwrite previous values
- AC4: "Immediately" requires page refresh
**E2E Needed:** Stock adjustment flow, reason validation, audit trail

---

### TTP-68: Parts Compatibility Filter [To Do]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Customer can filter by vehicle type, make, and model | `CustomerStorefront.jsx` has vehicle brand/series dropdown filter | MATCH |
| AC2: Only compatible parts are shown after filtering | Backend `GET /api/parts` supports `?brand=&series=&engineCode=` query params | MATCH |
| AC3: Filter can be cleared to return to full catalog view | Clear filter button resets to unfiltered view | MATCH |

**Subtasks:** TTP-87 (To Do), TTP-88 (To Do), TTP-89 (To Do)
**Verdict:** FULLY IMPLEMENTED (Jira says "To Do" but code is complete)
**Note:** All subtasks show "To Do" in Jira but the feature is fully coded in both backend (query params) and frontend (vehicle filter dropdown). There is also a `parseCompatibility.js` utility for structured vehicle data. Jira status needs updating.
**E2E Needed:** Filter by brand, filter by series, clear filter, no-results state

---

### TTP-59: Product Details [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Build product detail page UI | Product detail modal in CustomerStorefront (not a dedicated page) | PARTIAL |
| AC2: Display images, specs, and compatibility | Modal shows image, name, SKU, OEM, price, stock, description, compatibility, reviews | MATCH |
| AC3: Show real-time stock status and price | Stock and price shown; price updates on page reload | PARTIAL |

**Subtasks:** TTP-70 (Done), TTP-71 (In Review), TTP-72 (In Review)
**Verdict:** MOSTLY IMPLEMENTED (In Progress)
**Gap:** AC1 - No dedicated product detail PAGE, just a modal. AC3 "real-time" requires refresh.
**E2E Needed:** Product detail modal opens, specs display, stock status, compatibility display

---

### TTP-22: Alert Notification [Done]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Alert appears on the dashboard as soon as stock hits the threshold | Alert drawer (bell icon) shows low-stock alerts on App.jsx, Dashboard has low-stock watchlist | MATCH |
| AC2: Alert displays the part name and current quantity | Alert drawer shows part name, current stock, and restock button | MATCH |
| AC3: Alert is dismissed or updated when stock is restocked above the threshold | Alerts recompute when data refreshes; no persistent dismiss state | PARTIAL |

**Subtasks:** None
**Verdict:** MOSTLY IMPLEMENTED (Done)
**Gap:** AC3 - No persistent alert dismiss; alerts reappear on page reload if still below threshold. This is actually correct behavior (if stock is still low, alert is valid).
**E2E Needed:** Alert triggers at threshold, alert content, alert clears on restock

---

### TTP-19: Purchase Order Creation [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can create a purchase order linked to a supplier | PurchasingModule has PO creation form with supplier selector | MATCH |
| AC2: Order includes parts list and expected delivery date | PO form includes react-select part picker and delivery date field | MATCH |
| AC3: The order is saved and accessible in the supplier management section | POs saved to DB, displayed in PurchasingModule order list | MATCH |
| AC4: System rejects incomplete order submissions | Backend validation on required fields | MATCH |

**Subtasks:** TTP-95 (In Progress), TTP-96 (In Progress), TTP-97 (In Progress), TTP-98 (In Progress)
**Verdict:** MOSTLY IMPLEMENTED (In Progress)
**Gap:** Subtasks still show In Progress but core functionality is working.
**E2E Needed:** PO creation, supplier linking, parts list, delivery date, validation

---

### TTP-14: Supplier Directory [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can add, edit, and delete supplier records | Full CRUD in PurchasingModule supplier management | MATCH |
| AC2: Directory displays contact details, product categories, and payment terms | Supplier form includes name, contact person, email, phone, address, country, payment terms, categories | MATCH |
| AC3: Supplier records are searchable | Searchable via PurchasingModule search bar | MATCH |

**Subtasks:** TTP-91 (Done), TTP-92 (In Progress), TTP-93 (In Progress)
**Verdict:** FULLY IMPLEMENTED (In Progress label but works)
**Gap:** Subtasks show In Progress but the feature is functional.
**E2E Needed:** Add supplier, edit supplier, delete supplier, search

---

### TTP-13: Set Minimum Stock Threshold [In Progress]

| AC | Implementation Status | Match? |
|----|----------------------|--------|
| AC1: Admin can set a minimum threshold for each part | Part model has `min_stock` field; AddPartModal and EditPartModal include min_stock input | MATCH |
| AC2: Alert is triggered automatically when stock reaches or falls below the threshold | Dashboard low-stock watchlist and alert drawer check stock <= min_stock | MATCH |
| AC3: Threshold value is saved and persists across sessions | Saved in database via Prisma, persists across restarts | MATCH |

**Subtasks:** None
**Verdict:** FULLY IMPLEMENTED (In Progress)
**Note:** Feature works but Jira says In Progress. May need UI polish.
**E2E Needed:** Set threshold, verify alert triggers, threshold persists

---

## CROSS-CUTTING GAPS

### Real-time / "Instant" Updates (Affects TTP-21, TTP-56, TTP-11, TTP-75, TTP-59)
Multiple ACs require "instant" or "real-time" updates. Current implementation relies on page reload. Adding SSE or WebSocket for push-based updates would resolve all of these.

### Missing Features (Not in Sprint 1 or 2)
- AI Assistant (TTP-3) - No code exists
- Sales Reports: TTP-135, TTP-139, TTP-144, TTP-148, TTP-153 - All To Do, not in scope
- Transaction History: TTP-130 - To Do
- Customer Management: TTP-69 - To Do
- Repeat Purchase Lookup: TTP-79 - To Do
- Walk-in vs Account Sale: TTP-126 - To Do
- Supplier Payment Log: TTP-71 - To Do
- Purchase Order Tracking: TTP-72 - To Do

### No Backend Auth Routes
`authStore.js` references `/api/auth/*` endpoints but no backend route files exist for these. Auth calls go directly to Supabase SDK. Either the routes were intended as proxies or are legacy artifacts.

### Test Coverage
- Auth, admin, and checkout E2E tests are all `test.describe.skip`
- Only storefront and categories tests are active (3 pass, 1 fails due to locator mismatch)
- No backend integration tests exist
- Vitest unit tests exist but only for storefront and reviews (minimal)

---

## RECOMMENDED ACTIONS

### Priority 1: Fix Subtask Status in Jira
- TTP-94 (Product Reviews): Update to Done - fully implemented
- TTP-68 (Parts Compatibility Filter): Update to Done - fully implemented
- TTP-14 (Supplier Directory): Update to Done - functional

### Priority 2: Enable SKIPPED E2E Tests
- `auth.spec.ts`: Remove `test.describe.skip`, fix with seeded test user credentials
- `admin.spec.ts`: Remove `test.describe.skip`, test admin dashboard access
- `checkout.spec.ts`: Remove `test.describe.skip`, test Stripe flow with mocks

### Priority 3: Fix Failing E2E Test
- `categories.spec.ts`: Update category button locator to match actual DOM structure

### Priority 4: Audit Log for Stock Adjustments (TTP-75)
- Create a dedicated `StockAdjustment` model/table with partId, userId, oldStock, newStock, reason, timestamp
- Replace in-place stock update with append-only audit log

### Priority 5: Real-Time Updates (Multiple TTPs)
- Add SSE endpoint for stock-level changes
- Frontend subscribes to SSE for live stock/alert updates

### Priority 6: Missing E2E Tests by Feature
| Feature | Test Cases Needed |
|---------|------------------|
| Customer Registration (TTP-10) | Register, validate fields, verify email prompt |
| Customer Login (TTP-12) | Login, remember-me, JWT storage, rate limiting |
| Admin Login (TTP-66) | Separate portal, invalid creds, redirect |
| Password Reset (TTP-90) | Request reset, email sent, confirmation screen |
| Parts CRUD (TTP-11) | Add, edit, validate, save-and-reflect |
| Search & Filter (TTP-62) | Search, autocomplete, filter combo, stock status |
| Product Listing (TTP-56) | Pagination, filter accuracy |
| Stock Tracking (TTP-21) | Sale deducts, PO adds, cross-view sync |
| Stock Adjustment (TTP-75) | Adjust with reason, audit log |
| Threshold (TTP-13) | Set threshold, alert triggers, persists |
| Alerts (TTP-22) | Low-stock notification, dismiss on restock |
| Profile (TTP-102) | Update fields, validation, confirmation |
| Reviews (TTP-94) | Submit, purchase check, aggregate score |
| Compatibility Filter (TTP-68) | Filter by brand/model, clear filter |
| Product Details (TTP-59) | Modal opens, specs display, reviews section |
| Suppliers (TTP-14) | CRUD, search |
| Purchase Orders (TTP-19) | Create, link supplier, parts list, validate |
| Categories (TTP-134) | CRUD, hierarchy, appearance in storefront |
| Roles (TTP-114) | Admin access, customer restriction, URL blocking |

### Priority 7: AI Assistant (TTP-3) - Future Sprint
- No code exists. Needs full planning in a future sprint.

---

## SUMMARY

| Sprint | Issues | Fully Matched | Partial | Missing | Not Started |
|--------|--------|--------------|---------|---------|-------------|
| Sprint 1 | 10 Tasks + 1 Epic | 7 Tasks | 3 Tasks | 1 Epic | 0 |
| Sprint 2 | 11 Tasks | 4 Tasks | 6 Tasks | 0 | 0 |

**E2E Test Coverage:** 3 passing, 1 failing, 3 skipped
**Features with incorrect Jira status:** 3 (TTP-94, TTP-68, TTP-14 are Done but show To Do)
**Key recurring gap:** "Real-time/instant" updates across 5 TTPs

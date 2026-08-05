# Plan: Reseed Sales Data for Store/Online Channel Separation

## Context (research findings, not to be re-derived by implementers)

Domain model as it actually exists in code today (`backend/prisma/schema.prisma`,
`backend/src/services/CheckoutService.js`, `backend/src/services/TransactionsService.js`,
`backend/src/routes/customers.js`, `frontend/src/utils/salesAnalytics.js`):

- **Channel tag (per-purchase, immutable)**: `Transaction.stripeSessionId != null` → **online**.
  `stripeSessionId == null` → **in-store**. This is the ONLY signal `byChannel()` uses
  (`frontend/src/utils/salesAnalytics.js:47-56`). It is set once at transaction creation and
  never changes — this is what "the tag per purchase stays the same even after account
  history is merged" means in practice.
- **Identity (`Transaction.userId`), separate axis from channel**:
  - Real Supabase UUID → tied to a real online account (`Customer.authId` without `temp-` prefix).
  - `temp-<timestamp>-<rand>` → an FTF/walk-in customer record auto-created by POS
    (`TransactionsService.js:130-183`) when staff captures a phone/email with no online account.
  - `temp-online-<timestamp>-<rand>` → admin manually pre-registers a customer as "online" with
    no real Supabase auth yet (`customers.js:302-304`) — rare, edge case only.
  - `null` → anonymous walk-in, no Customer row at all, grouped in the FTF tab purely by
    `customerEmail`/`customerContact` string match (`customers.js:242-270`).
- **Merge** (`customers.js` `POST /:id/merge` area, ~line 440-488): an FTF (`temp-`) customer's
  transactions get `userId` **rewritten** to the real online account's authId, and `customerEmail`
  rewritten to the online account's email. `stripeSessionId` on those rows is untouched — they
  stay `null` (in-store) because that's what actually happened. So a merged account can legally
  have both online-tagged and in-store-tagged transactions under one `userId`, and that is
  correct, not a bug.
- **Current seed.js gap** (`backend/prisma/seed.js:315-361`): every seeded transaction sets
  `userId: customer.authId` and never sets `stripeSessionId`. Result: 100% of existing seed
  transactions evaluate to channel = "store" under `byChannel()`, even though every one of them
  is tied to a full online `Customer` account. There are zero true FTF (`temp-`) customers, zero
  anonymous walk-ins, zero online-channel (`stripeSessionId` set) transactions, and zero merged
  accounts anywhere in the seed. The channel filter and the customer merge UI currently have no
  seed data that exercises them correctly.
- **Date range gap**: transactions are `faker.date.recent({ days: 30 })` only — no month/year
  spread, so best-selling / slow-moving / peak-period reports have nothing to show.

## Target seed design

Rewrite the "Creating Transactions" block in `backend/prisma/seed.js` (currently lines 315-361)
to generate five customer/transaction archetypes instead of one flat pool:

1. **Pure online customers** — real `authId` (reuse existing `PLAYERS`-derived customers).
   Every transaction: `userId = customer.authId`, `stripeSessionId = cs_test_<random>`,
   `paymentMethod` from an online-plausible set (CARD/GCASH), `customerContact = userId`,
   `customerName = userEmail` (matches `CheckoutService.js:132-134` shape).
2. **Pure in-store (FTF) customers** — new `Customer` rows with `authId: temp-...` created
   directly (mirrors `TransactionsService.js:167-176`), never linked to a real auth account.
   Every transaction: `userId = that temp- authId`, `stripeSessionId = null`, `paymentMethod`
   from the full POS set (CASH/CARD/CHEQUE/BANK_TRANSFER/GCASH), realistic PH phone/email.
3. **Merged customers (the edge case the user asked to double-check)** — start as an FTF
   `temp-` customer with some in-store transactions, then simulate the merge: create additional
   transactions with `userId` set to a real online `authId`, `stripeSessionId` set (their online
   visits after linking), while the earlier in-store transactions keep `stripeSessionId = null`
   but get their `userId` rewritten to the same real `authId` (this *is* what the merge endpoint
   does — replicate its effect, don't call the HTTP route from the seed script). End state: one
   `authId` with both online-tagged and in-store-tagged rows. Assert in the verify step
   (Step 4) that channel tag per row is untouched by the merge.
4. **Anonymous walk-ins** — no `Customer` row at all. `userId = null`, `customerName`/
   `customerContact` free text, `stripeSessionId = null`. Exercises the string-match FTF
   grouping path (`customers.js:242-270`).
5. **Unmerged FTF customers left as-is** — a few `temp-` customers who are never merged, so the
   "Find Returning Customer" / merge UI still has real candidates to act on after reseed.

Distribution guideline (ponytail: pick simple round numbers, not a config system):
- ~10 pure online customers × 8-20 orders each, spread across 24 months.
- ~8 pure in-store customers × 5-15 orders each.
- ~4 merged customers × (3-8 pre-merge in-store orders + 3-8 post-merge mixed orders).
- ~15-20 anonymous walk-in transactions (no customer entity).
- ~5 unmerged FTF customers × 2-6 orders (left dangling on purpose).

### Date spread requirements
- Span the **last 24 months** from seed run time, every calendar month must have at least one
  transaction (iterate months explicitly, don't rely on random luck).
- Within a month, spread across at least ~4 distinct weeks (not daily) — pick a handful of
  random days per week-bucket rather than one date per month.
- Bake in an intentional **peak period**: Nov-Dec of each year gets 2-3x the transaction density
  of an average month (holiday surge), so "peak sales period" analytics has a real signal.
- Bake in an intentional **slow period**: one identifiable low-density month per year (e.g.
  Feb) for contrast.
- Skew part popularity so some parts are clear best-sellers (appear in many transactions across
  many months) and a deliberate long-tail of parts get 0-1 sales in the full 24 months (slow-moving
  stock candidates). Reuse the existing `parts` array; weight selection instead of uniform
  `faker.helpers.arrayElements`.

### Realism fixes bundled in (small, same file, don't split into a separate step)
- Online transactions: `paymentMethod` CARD/GCASH only (never CASH/CHEQUE), `invoiceNumber`
  prefixed `WEB-` to match `CheckoutService.js:131`.
- In-store transactions: `invoiceNumber` prefixed `INV-` (existing convention), full
  `paymentMethod` variety, `amountTendered`/`changeGiven` populated when CASH.
- Historical transactions (older than ~30 days from seed time) should mostly be `COMPLETED`;
  only the most recent handful get `ORDER_PLACED`/`READY_FOR_PICKUP` for realism.

## Out of scope
- No changes to `CheckoutService.js`, `TransactionsService.js`, or `customers.js` merge logic
  themselves — this plan only reseeds data to match their existing, correct behavior.
- No schema changes — `stripeSessionId`/`userId` already carry everything needed; do not add a
  `channel` column.
- Purchase orders, reviews, category/part generation blocks are unaffected — leave them as-is.

---

## Step 1 — Design the customer/transaction archetype generator shape

**Intent**: Before touching `seed.js`, sketch the concrete data structures (archetype configs:
counts, date-window helpers, weighted part-popularity table) that Steps 2-3 will implement, and
confirm they match the domain rules above exactly (channel = `stripeSessionId`, identity =
`userId`, merge rewrites `userId` only). Produce a short in-repo note (a comment block at the
top of the new seed section is enough — no separate design doc file needed).

**Tags**: design

**Acceptance**:
- A written mapping of the 5 archetypes to exact Prisma field values (`userId`,
  `stripeSessionId`, `customerName`, `customerContact`, `customerEmail`) exists, either as a
  code comment in `seed.js` or inline in the PR description.
- The mapping is checked against `TransactionsService.js:130-183` and `CheckoutService.js:124-148`
  field shapes so seeded rows are indistinguishable from real app-generated rows.

---

## Step 2 — Implement customer archetype seeding (online, FTF, merged, anonymous, unmerged)

**Intent**: Replace the single flat customer-purchase loop with generation of the 5 archetypes
from the Target seed design section: pure online customers, pure in-store `temp-` customers,
merged customers (FTF history rewritten to a real `authId`, channel tags left untouched), pure
anonymous walk-ins with no `Customer` row, and a handful of intentionally-unmerged FTF customers.

**Tags**: impl, db

**Acceptance**:
- After seeding, at least 1 customer exists whose transactions are 100% `stripeSessionId != null`
  (pure online) and at least 1 whose transactions are 100% `stripeSessionId == null` (pure
  in-store) — i.e. the "would an in-person account ever show an online purchase" check the user
  asked for holds for these two groups.
- At least 1 merged customer exists with a single `userId` spanning both `stripeSessionId` states.
- At least 1 transaction exists with `userId == null` and no matching `Customer` row.
- `npx prisma db seed` (or the project's existing seed command) runs to completion with no
  unique-constraint errors (dummy email collisions handled per `TransactionsService.js:155-165`
  pattern).

---

## Step 3 — Implement transaction date spread, peak/slow-mover skew, payment realism

**Intent**: Generate transaction dates across the last 24 months with every month represented,
holiday-season (Nov-Dec) density spikes, a deliberate slow month per year, weighted part
selection so a clear best-seller set and a clear slow-moving long-tail both emerge, and
channel-appropriate `paymentMethod`/`invoiceNumber`/`status` values.

**Tags**: impl

**Acceptance**:
- Querying seeded transactions grouped by `YYYY-MM` over the last 24 months returns zero months
  with a count of 0.
- Nov/Dec months show materially higher transaction counts than the yearly average (peak period
  signal); at least one month per year shows materially lower (slow period signal).
- At least 3 parts appear in >15 transactions (best-seller candidates) and at least 5 parts
  appear in 0-1 transactions across the full range (slow-mover candidates).
- No transaction has `stripeSessionId` set together with a non-CARD/GCASH `paymentMethod`.

---

## Step 4 — Add a seed self-check script

**Intent**: Per project convention, standalone verification scripts live in `backend/scripts/`.
Add `backend/scripts/verify_seed.js` that queries the seeded DB and asserts the invariants from
Steps 2-3 (archetype counts, channel purity per pure-type customer, merged-customer mixed
channel, 24-month coverage, peak/slow month contrast, best-seller/slow-mover part counts). Exit
non-zero on any failed assertion so it's usable as a quick post-seed sanity gate.

**Tags**: test, impl

**Acceptance**:
- `node backend/scripts/verify_seed.js` run immediately after a fresh seed exits 0.
- Each invariant from Steps 2-3's acceptance criteria has a corresponding assertion in the
  script (no silent pass-through).

---

## Step 5 — Run the reseed and validate against the actual analytics UI

**Intent**: Run the full seed against a dev database, run the Step 4 verify script, then
spot-check the admin Sales Analytics tab (channel filter, and the best-selling / slow-moving /
peak-period reports once those exist per the earlier-planned tickets) to confirm the new seed
produces a non-trivial, readable report rather than a flat/empty one. Check nothing else that
reads `seed.js` output (existing frontend tests referencing transaction shapes, e.g.
`frontend/src/components/__tests__/TransactionPOS.test.jsx`,
`frontend/src/tests/CustomerStorefront.test.jsx`) broke from the archetype/date changes.

**Tags**: review

**Acceptance**:
- Verify script (Step 4) passes against the freshly seeded DB.
- Channel filter (`ChannelSelector.jsx`) shows a non-zero, non-100% split between In-Store and
  Online in the admin Sales Analytics tab.
- Existing frontend test suites touching transaction/customer fixtures still pass (or are
  updated if they hard-coded the old 30-day/flat-channel shape).

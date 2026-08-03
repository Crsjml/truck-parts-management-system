# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences on one system:

- **Retail customers** — browse the parts catalog, check truck-model compatibility, buy, track orders, leave reviews. Public storefront + auth (Supabase).
- **Shop staff** — run the physical counter (POS/transactions), manage inventory and purchasing/vendor orders, handle staff/role administration. Role hierarchy up to `SUPERADMIN` (see `StaffRoleLevel` enum).

## Product Purpose

Runs Tarlac Truck Pitstop's parts business end-to-end: one system covers the online storefront customers buy from and the operational tools (POS, inventory, purchasing, staff management, analytics) staff use to run the shop.

## Positioning

Truck-model compatibility is the core mechanism: parts are filtered/guaranteed to fit specific truck models, not a generic parts catalog with a search box. A competing generic e-commerce or generic inventory tool doesn't encode this — it's specific to truck parts fitment.

## Operating Context

- Physical shop counter (POS/transaction flow) running alongside the online storefront — inventory and transactions are shared state between both.
- Staff roles: admin dashboard (`/admin`) and POS (`/staff`) are the operational side; customer storefront (`/`, `/catalog`) is the retail side.
- Purchasing/vendor ordering keeps inventory stocked; analytics track sales and stock movement.
- Jira-tracked work (`docs/jira/jira-breakdown.csv`), ticket-scoped commits.

## Capabilities and Constraints

- Stack: React/Vite storefront + admin, Node/Express/Prisma backend, PostgreSQL (Supabase), Supabase Auth. Docker Compose orchestration.
- Two visual tiers by design (not yet by product decision at init-time, see `docs/design.md`): Premium storefront, Minimalist admin/POS — this is an established UI convention, not a product fact to re-litigate here.
- Undecided: exact compatibility-engine matching logic (make/model/year rules) — not yet confirmed as a specific algorithm, just the product commitment that it exists.

## Brand Commitments

- Name: **Tarlac Truck Pitstop (TTP)**.
- Real operating business — real inventory, real customers, real stakes. Design and product decisions optimize for actual shop staff and paying customers, not a demo.

## Evidence on Hand

- No real customer PII, pricing, or inventory data should be fabricated into design work — pull structure/shape from the schema (Prisma) and seed/demo data (`docs/seed-accounts.md`), not invented brand claims.
- No testimonials, press, or case studies exist yet — do not invent any.

## Product Principles

1. Fitment accuracy over browsing breadth — customers trust the catalog because it won't sell them a part that doesn't fit their truck.
2. One system, two speeds — the storefront optimizes for a buyer's decision-making; the admin/POS side optimizes for staff operational speed. Neither should compromise the other's tier.
3. Real shop, real stakes — this runs an actual business; treat data integrity, transaction correctness, and role/permission boundaries as production concerns, not prototype shortcuts.

## Accessibility & Inclusion

No product-specific accessibility requirement confirmed beyond standard WCAG 2.2 AA (already mandated project-wide, see `.agents/skills/accessibility`).

---
name: ttp-workflow
description: "Instructions for building, running, and committing to the Tarlac Truck Pitstop Management System. Use this when you need a refresher on the project architecture, run scripts, or Jira commit formatting."
---

# TTP Project Workflow

You are working on the Tarlac Truck Pitstop Management System. Follow these synced guidelines:

## Architecture
- **Frontend**: Vite + React
- **Backend**: Express + Mongoose (Mongo 7)
- **Container**: Docker Compose

## Operations
- To start the server on a Mac, use `make up`. On Windows, use `.\run.bat`.
- Do NOT use plain `docker-compose up` because it interleaves messy MongoDB logs. The helper scripts isolate the logs cleanly.

## Committing (CRITICAL)
- We use the Atlassian "GitHub for Jira" integration.
- EVERY commit must have a valid Jira ticket ID in the message (e.g., `TTP-1`, `TTP-53`).
- Example: `feat(TTP-12): add responsive dashboard UI`

## Code Guidelines
- Vite proxies `/api` directly to the backend. Do not hardcode `localhost:5000` inside frontend `fetch()` requests. Use relative paths like `fetch('/api/health')`.

## Recent Architectural Context (TTP-68 & TTP-94)
- **Authentication & Identity:** The app uses Firebase Auth on the frontend (`firebaseConfig.js`) and `firebase-admin` on the backend (`authMiddleware.js`). Firebase is the primary identity source of truth; MongoDB only caches necessary user info. To allow test accounts (like `@example.com` or those in `seed_accounts.md`) to log in locally without verifying their emails, there is a hardcoded bypass in `frontend/src/components/AuthPortal.jsx`.
- **Parts Compatibility:** The `Part` schema now includes a structured `compatibleWith` array (an array of objects containing `brand` and `series`). The backend (`parseCompatibility.js`) automatically parses the legacy plain-text `compatibility` string into this structured format when a part is saved. The `CompatibilityFilter` component uses this structure to filter the catalog.
- **Reviews System:** Reviews are stored in a separate `reviews` collection in MongoDB and are linked to a part and a user via `firebaseUid`. The `GET /api/parts` route aggregates `reviewStats` (average rating and total reviews) directly into the part documents before sending them to the frontend.
- **Routing:** Unauthenticated public users are routed to `CustomerStorefront.jsx`. Once a customer successfully logs in, `App.jsx` automatically redirects them to the private `CustomerDashboard.jsx`.

## Implemented Features & Ticket History (Guideline for the Team)
The following sprints and tickets have already been successfully integrated into this repository based on our git history:

### Sprints
- **Sprint 1:** Initial UI/UX overhaul, complete catalog CRUD, categories UI, login security, MongoDB backend integration, and Docker containerization.
- **Sprint 2:** Purchasing module, supplier directory, dynamic ports fallback, Docker internal proxy routing, unified UI, Firebase authentication, and Stripe checkout.

### Core Tickets (TTP)
- **TTP-11 (Analytics & Purchasing Upgrade):** Upgraded analytics with Recharts (bar/pie charts, zoom modal) and enhanced the purchasing module with glassmorphism `react-select`, area charts, and `ReactCountryFlag`.
- **TTP-13 (API Fixes):** Enabled Part virtuals for serialized ID and restored `requireAuth` on GET transactions.
- **TTP-21 (Checkout Fix):** Aligned checkout payload with Transaction schema and fixed `jspdf-autotable` import.
- **TTP-68 (Compatibility Filter):** Implemented parts compatibility filter backend and dynamic UI dropdowns.
- **TTP-94 (Review System):** Added customer reviews section, backend logic, and star rating system.
- **TTP-102 (System UI):** Added Firebase status chip, collapse/expand toggle to system StatusBar/Footer, and added a 'My Account' profile tab to the Customer Dashboard.

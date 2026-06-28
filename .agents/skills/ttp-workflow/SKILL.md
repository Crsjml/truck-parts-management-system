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

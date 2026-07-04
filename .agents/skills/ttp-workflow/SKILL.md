---
name: ttp-workflow
description: Instructions for building, running, and committing to the Tarlac Truck Pitstop Management System. Use this when you need a refresher on the project architecture, run scripts, or Jira commit formatting.
---

# Tarlac Truck Pitstop (TTP) - Project Architecture

## Stack Overview
- **Frontend:** React + Vite, TailwindCSS, Phosphor Icons
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB Atlas (Cloud) & Local Docker MongoDB fallback
- **Auth:** Firebase Auth (Client-side and Admin SDK verification)
- **Containerization:** Docker Desktop & Docker Compose

## Development Scripts
All commands should be run from the root directory.

- `make up` - Start the local Docker Compose cluster.
- `npm run dev` (in `/frontend`) - Start the Vite dev server manually on port `5173`.
- `npm run dev` (in `/backend`) - Start the Express server manually on port `5000`.

## Architecture Details
- The frontend proxy forwards `/api` requests to the backend.
- The `SettingsContext.jsx` manages global app settings.
- Security uses `firebaseConfig.js` on the client and `authMiddleware.js` on the backend.
- The repository utilizes a custom AI Agent skill directory located at `.agents/skills`. Always verify and update these guidelines if project structures fundamentally change.

## Historical Context

### Sprints
- **Sprint 1:** Initial UI/UX overhaul, complete catalog CRUD, categories UI, login security, MongoDB backend integration, and Docker containerization. *(Includes TTP-167, TTP-168, TTP-169, TTP-170, TTP-171)*
- **Sprint 2:** Purchasing module UI and backend (Purchase Orders & Supplier Directory), dynamic ports fallback, Docker internal proxy routing, unified UI, AI Agent guidelines, Firebase authentication, and Stripe checkout.

### Core Tickets (TTP) - Epics
- **TTP-1 (Parts Catalog):** Overarching epic for parts inventory and listing. (To Do)
- **TTP-2 (User Management):** Overarching epic for admin and customer auth/roles. (To Do)
- **TTP-3 (AI Assistant):** Overarching epic for AI Agent workflows and integration. (To Do)
- **TTP-4 (Sales Management):** Overarching epic for POS, transactions, and sales reporting. (To Do)
- **TTP-5 (Stock Management):** Overarching epic for inventory stock adjustments. (To Do)
- **TTP-6 (Supplier Management):** Overarching epic for supplier records and purchase orders. (To Do)
- **TTP-7 (Customer Management):** Overarching epic for CRM and customer tracking. (To Do)
- **TTP-8 (Inventory Management):** Overarching epic for high-level inventory tracking and categories. (To Do)


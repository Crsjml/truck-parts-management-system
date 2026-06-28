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

### Core Tickets (TTP)
- **TTP-11 (Analytics & Purchasing Upgrade):** Upgraded analytics with Recharts (bar/pie charts, zoom modal) and enhanced the purchasing module with glassmorphism `react-select`, area charts, and `ReactCountryFlag`.
- **TTP-13 (API Fixes):** Enabled Part virtuals for serialized ID and restored `requireAuth` on GET transactions.
- **TTP-15 (Auth):** Implemented phone and email authentication via Firebase.
- **TTP-68 (Parts Filter):** Implemented parts compatibility filter backend and UI.
- **TTP-94 (Review System):** Added customer reviews section, backend logic, and star rating system.
- **TTP-102 (System UI):** Added Firebase status chip, collapse/expand toggle to system StatusBar/Footer, and added a 'My Account' profile tab to the Customer Dashboard.
- **TTP-167 to TTP-171 (UI/UX Overhaul):** Complete overhaul for categories, modals, and admin layout during Sprint 1.


# Backend Optimization & Architectural Migration Plan

This document outlines the step-by-step process for optimizing the backend data fetching and migrating the architecture to adhere to the `backend-dev-guidelines`.

## Step 1: Push JSON Filtering to Prisma
**Goal**: Eliminate the catastrophic in-memory JavaScript filtering in `backend/src/routes/parts.js`.
**Intent**: Implement a fix in `parts.js` to filter the `compatibleWith` JSON array directly in the Prisma `where` clause using PostgreSQL's native `array_contains` operator. This fixes pagination boundaries and drastically reduces Node.js memory consumption.
**Acceptance Criteria**: 
- `brand`, `series`, and `engineCode` filters are pushed to Prisma.
- `parts.filter(...)` in memory is removed entirely.
- End-to-end pagination (limit/skip) accurately reflects filtered counts.

## Step 2: Implement BaseController and Zod Validation
**Goal**: Centralize error handling and validate all incoming external inputs.
**Intent**: Create a new `BaseController` that implements standard `handleSuccess` and `handleError` (with Sentry) methods. Implement strict `Zod` validation for the parts list route (`page`, `limit`, `search`, etc.).
**Acceptance Criteria**:
- Invalid queries are blocked by Zod before reaching the database.
- `BaseController` handles all response formatting.

## Step 3: Layered Architecture Extraction
**Goal**: Isolate business logic and database access from Express routing.
**Intent**: Refactor `backend/src/routes/parts.js` by extracting a `PartsService` (business logic) and `PartsRepository` (Prisma encapsulation). Ensure the route strictly passes the request to the controller.
**Acceptance Criteria**:
- `routes/parts.js` contains no Prisma calls or business logic.
- `PartsRepository` owns all database interactions.
- `PartsService` orchestrates the logic via dependency injection.

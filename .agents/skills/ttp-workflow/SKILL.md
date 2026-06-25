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

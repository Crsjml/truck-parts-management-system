#!/usr/bin/env bash
# ------------------------------------------------------------
# start-all.sh  –  launch backend & frontend together
# ------------------------------------------------------------

# Exit on any error
set -e

# ---- Backend -------------------------------------------------
echo "🔧 Starting backend..."
# Use the same dynamic‑port logic already in src/index.js
npm run dev --prefix backend &
BACKEND_PID=$!

# Give the backend a moment to log its chosen port
sleep 2

# ---- Frontend ------------------------------------------------
echo "⚡️ Starting frontend..."
npm run dev --prefix frontend &
FRONTEND_PID=$!

# ------------------------------------------------------------
# Wait for both processes (press Ctrl‑C to stop both)
# ------------------------------------------------------------
wait $BACKEND_PID $FRONTEND_PID

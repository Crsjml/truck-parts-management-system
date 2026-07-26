# Backend Connectivity & Profile Save Fix

> **For agentic workers:** Use superpowers:subagent-driven-development to execute tasks. Dispatch specialized agents per task. Steps use checkbox syntax.

**Goal:** Fix backend connectivity race condition causing API failures, verify profile save works, implement permanent startup ordering fix.

**Root Cause:** Vite dev server startup race with browser requests. After container restart and wait, Vite proxy works. Needs permanent initialization ordering fix.

**Architecture:** 
1. Verify app state after restart (manual test)
2. Test profile update endpoint with real request (diagnostic)
3. Fix docker-compose startup ordering (healthcheck + depends_on)
4. Verify cold start works (end-to-end test)

**Tech Stack:** Docker Compose, Vite, Express, PostgreSQL

## Global Constraints

- Docker Compose V2 (no version field required)
- Frontend port: 5173, Backend port: 5000 (internal only)
- Vite proxy target: `http://backend:5000` (Docker internal DNS)
- Supabase auth required for customer endpoints
- No hardcoded env vars in code (use .env files)

---

## File Structure

**Configuration:**
- `docker-compose.yml` — Add frontend healthcheck, fix depends_on ordering
- `frontend/Dockerfile` — Ensure Vite starts with correct proxy config
- `.env` files — Verify backend connection string is correct

**Code (No changes needed if tests pass):**
- `backend/src/app.js` — `/api/health` and `/api/customers` endpoints
- `frontend/src/api/apiClient.js` — Uses Vite proxy (no VITE_BACKEND_URL set)
- `frontend/src/stores/authStore.js` — Profile update calls updateCustomerProfile

---

## Task 1: Verify App State After Restart

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: Running Docker containers (backend + frontend + db)
- Produces: Browser test report confirming API calls work

**Steps:**

- [ ] **Step 1: Check container health**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
# Expected: Both containers "Up" with status indicators
```

- [ ] **Step 2: Wait for Vite to be ready**
```bash
docker logs truck-system-frontend | grep "ready in"
# Expected: "ready in Xms" appears
sleep 5
```

- [ ] **Step 3: Open browser and login as admin**
```
URL: http://localhost:5173
Email: (admin test account — check .env or test data)
Password: (admin password)
```

- [ ] **Step 4: Navigate to profile completion modal**
- Click account menu → Complete Profile modal should appear
- Modal should show: "Please provide your contact number to complete your account setup"
- Input field visible for contact number

- [ ] **Step 5: Enter contact number and save**
- Type: `09214278098` (or test number)
- Click "Save Contact Number"
- Expected: Success message, modal closes, no console errors
- Actual: [Report what happens — success, error message, or "Failed to fetch"]

- [ ] **Step 6: Check browser console for errors**
```
DevTools → Console tab
Look for: red error messages about /api/customers/me
Report any errors found
```

---

## Task 2: Debug Profile Update if Save Fails

**Files:**
- `backend/src/routes/customers.js`
- `backend/src/app.js`

**Interfaces:**
- Consumes: API request from Task 1 Step 5 (profile update attempt)
- Produces: Root cause identified (endpoint issue, validation error, auth problem, or networking)

**Steps:**

- [ ] **Step 1: Check backend logs for errors**
```bash
docker logs truck-system-backend 2>&1 | grep -i "put\|customers\|error\|update" | tail -20
```

- [ ] **Step 2: Read customers route to verify endpoint exists**
```bash
grep -A 20 "router.put" backend/src/routes/customers.js | head -30
```
Expected: PUT `/me` endpoint defined with auth middleware

- [ ] **Step 3: Manually test API endpoint from frontend container**
```bash
docker exec truck-system-frontend ash -c "
  curl -X PUT http://localhost:5173/api/customers/me \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer TEST_TOKEN' \
    -d '{\"contactNumber\": \"09214278098\"}' 2>&1 | head -20
"
```
Check response: Is it 400 (validation), 401 (auth), 500 (server error), or 200 (success)?

- [ ] **Step 4: Check backend database for schema**
```bash
docker exec truck-system-backend npm run prisma -- studio
# Or run: SELECT column_name FROM information_schema.columns WHERE table_name='customers';
```
Verify: Does `contactNumber` column exist in customers table?

- [ ] **Step 5: Report findings**
- Endpoint exists? Yes/No
- contactNumber column exists? Yes/No
- Error response code? (400/401/500/200)
- Error message from backend? (copy from logs)

---

## Task 3: Fix Docker Startup Race Condition

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: Current docker-compose config (no frontend healthcheck, loose depends_on)
- Produces: Updated config with proper startup ordering (backend → frontend with health checks)

**Steps:**

- [ ] **Step 1: Read current docker-compose**
```bash
cat docker-compose.yml
```

- [ ] **Step 2: Add frontend healthcheck**

Add after `services.frontend.restart: always` (around line 53):

```yaml
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5173/ || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
```

Rationale: Vite takes ~1-2s to start, so browser requests during startup fail. Healthcheck ensures frontend is ready before marking it healthy.

- [ ] **Step 3: Update backend healthcheck start_period**

Change backend healthcheck `start_period` from `2s` to `5s`:

```yaml
    healthcheck:
      ...
      start_period: 5s  # was: 2s
```

Rationale: PostgreSQL init + Prisma migration takes >2s; allow more time.

- [ ] **Step 4: Update frontend depends_on to wait for backend health**

Change from current `depends_on` (line 50-52):

```yaml
    depends_on:
      backend:
        condition: service_healthy
```

Keep as-is (already correct). No change needed.

- [ ] **Step 5: Verify syntax and test**
```bash
docker-compose config > /dev/null && echo "Config valid" || echo "Config invalid"
```

- [ ] **Step 6: Commit changes**
```bash
git add docker-compose.yml
git commit -m "fix(TTP-QA): add frontend healthcheck and extend backend startup grace period"
```

---

## Task 4: Cold-Start Test (Verify Fix)

**Files:**
- None (testing only)

**Interfaces:**
- Consumes: Updated docker-compose.yml from Task 3
- Produces: Confirmation that app works on clean start (no manual waits needed)

**Steps:**

- [ ] **Step 1: Stop and remove containers**
```bash
docker-compose down -v
# -v removes volumes (CAUTION: clears database — only for testing!)
```

- [ ] **Step 2: Start fresh**
```bash
docker-compose up -d
# Watch logs for startup sequence
```

- [ ] **Step 3: Monitor startup**
```bash
docker-compose logs -f
# Expected sequence:
# 1. Backend container starts, runs migrations
# 2. Backend healthcheck passes
# 3. Frontend container starts
# 4. Vite server starts ("ready in Xms")
# 5. Frontend healthcheck passes
# Total time: ~20-30s
```

- [ ] **Step 4: Wait for both to be healthy**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
# Expected: Both show "Up ... (healthy)"
```

- [ ] **Step 5: Test API access without delay**
```bash
# Immediately (don't wait):
curl http://localhost:5000/api/health -s | jq .status
# Expected: "ok" (backend responds immediately)

docker exec truck-system-frontend wget -qO- http://localhost:5173/api/health -s | jq .status
# Expected: "ok" (proxy works)
```

- [ ] **Step 6: Open browser and verify profile flow**
- URL: http://localhost:5173
- Login as admin
- Navigate to profile modal
- Save contact number
- Expected: Success (no "Failed to fetch")

- [ ] **Step 7: Commit test results**
```bash
git add -A
git commit -m "test(TTP-QA): cold-start verification passed"
```

---

## Completion

All tasks complete when:
1. Profile save works (Task 1 or Task 2 confirms)
2. docker-compose.yml updated with healthchecks (Task 3)
3. Cold-start test passes without manual intervention (Task 4)
4. Commits created (Tasks 3 & 4)


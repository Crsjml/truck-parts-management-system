# Tarlac Truck Pitstop: Management System

A full-stack inventory, sales, and analytics platform built for **Tarlac Truck Pitstop (TTP)**. Includes an admin dashboard for managing parts, purchasing, and logistics, plus a customer-facing storefront with Stripe-powered checkout.

---

## Project structure

```
.
├── backend/                # Node/Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Data access
│   │   ├── routes/         # Express route definitions
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── config/
│   │   └── index.js        # Entry point
│   ├── prisma/              # Schema, migrations, seed script
│   ├── scripts/             # Standalone admin/seed/test scripts
│   └── Dockerfile
├── frontend/                # React/Vite app
│   ├── src/
│   │   ├── components/      # UI, incl. components/ui/ primitives
│   │   ├── api/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── tests/                # Playwright E2E
│   └── Dockerfile
├── docs/                     # Jira exports, setup notes, product backlog
├── docker-compose.yml
├── run.bat                   # Windows start script
└── Makefile                  # Mac/Linux start commands
```

---

## Tech stack

<details>
<summary><strong>Frontend</strong></summary>

- **React 18** + **Vite**: UI and build tooling
- **Tailwind CSS**: utility-first styling (custom HSL palette)
- **Phosphor Icons**: iconography
- **Supabase JS**: client-side auth session management
- **Stripe.js**: checkout redirect

</details>

<details>
<summary><strong>Backend</strong></summary>

- **Node.js (v20)** + **Express.js**: HTTP server and routing
- **Prisma ORM**: type-safe database client
- **PostgreSQL via Supabase**: cloud-managed relational database
- **Supabase Auth**: JWT-based authentication (Admin SDK on backend)
- **Stripe**: payment processing

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

- **Docker + Docker Compose**: container orchestration
</details>

---

## Quick start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- Git

### Step 1: clone the repo
```bash
git clone <repo-url> ttp
cd ttp
```

### Step 2: create your `.env` files

**`backend/.env`**: get these values from a teammate or the shared credentials vault.
```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**`frontend/.env`**: public keys, safe to share with the team.
```env
VITE_SUPABASE_URL="https://zzefrhwkiydjgvejnkmd.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_PDRqOyG3VNmWnL4pOdS8xg_UXh4TjIz"
```

### Step 3: start the app

Helper scripts run attached, so logs print to your terminal and `Ctrl+C` stops both containers.

**Windows:**
```powershell
.\run.bat
```

**Mac/Linux:**
```bash
make up
```

**Docker directly (any platform, runs detached):**
```bash
docker-compose up -d --build
```

### Step 4: open the app
| Service | URL |
|---|---|
| **Customer Storefront** | http://localhost:5173 |
| **Admin Dashboard** | http://localhost:5173/admin |
| **Backend API** | http://localhost:5000 (internal) |

---

## Daily workflow

```powershell
# Start everything
.\run.bat                     # Windows
make up                       # Mac/Linux
docker-compose up -d --build  # Manual

# Stop everything
docker-compose down           # Windows / Manual
make down                     # Mac/Linux
```

> **Note:** On first run, Docker builds the images and runs `npm install` inside the containers automatically. Subsequent starts are faster since images are cached.

---

## Database

The app uses **Supabase (PostgreSQL)** managed via **Prisma ORM**.

- Schema is defined in [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)
- Prisma client is generated automatically during the Docker build (`npx prisma generate`)
- To seed test data (first-time only):
  ```bash
  # Inside backend/ with node_modules installed:
  node scripts/seed-supabase-auth.js   # Creates Auth users in Supabase
  npx prisma db seed                   # Seeds the database tables
  ```

### Test accounts (local dev only)

Throwaway credentials for the local/dev Supabase project only, not shared with production.

| Role | Email | Password |
|---|---|---|
| Customer | `lionel.messi@example.com` | `Password123!` |
| Customer | `cristiano.ronaldo@example.com` | `Password123!` |
| Admin | `admin@tarlactruckparts.local` | `admin123` |

---

## Staff access

Superadmins assign roles from **Staff Management** when adding a member or changing
the role in the roster. Existing Admin and Superadmin assignments are preserved.

| Role | Admin pages |
|---|---|
| Cashier | Sales POS, Customer Management |
| Warehouse | Parts Inventory, Category Management, Purchasing (including suppliers, receiving, returns and payment tracking) |
| Admin | Dashboard, inventory, POS, analytics, categories, purchasing and customers |
| Superadmin | All Admin pages, Staff Management and System Settings |

All staff can access their own account. Menu visibility, keyboard shortcuts and
backend authorization enforce the same access rules. Public catalog lookup and
customer checkout remain available independently of admin page access.

After updating, restart the backend with `docker compose up -d --force-recreate backend`.
Its startup command regenerates Prisma Client and syncs the schema, including the
new `CASHIER` and `WAREHOUSE` enum values. A database connection is required. A SQL
migration is also included for environments that deploy Prisma migrations.

## Parts Assistant (local AI)

The storefront has a "Parts Assistant" chat for signed-in customers. It runs on a **local** model through
[Ollama](https://ollama.com), so no paid cloud API is involved. It can find parts by name, SKU, OEM number or
vehicle, quote the selling price and stock, and explain how to order, pay, track orders, return items and
contact the store. It only reads published, non-archived parts and never sees supplier cost, markup or
minimum-stock data. Part cards appear under its replies.

### Prerequisites

1. Install Ollama on the **host** (not in Docker) and make sure it is running (`ollama serve`, API on `:11434`).
2. Pull the model:

   ```bash
   ollama pull qwen2.5:3b-instruct      # default, fits an 8 GB machine
   ollama pull qwen2.5:7b-instruct      # optional: better tool-calling, needs >= 16 GB RAM
   ```

   A 7B model fails to load on an 8 GB machine that is also running Docker. To switch, set `OLLAMA_MODEL` in
   `backend/.env` (fallback model: `llama3.1:8b`) and recreate the backend container.
3. The backend container reaches the host through `extra_hosts: "host.docker.internal:host-gateway"` in
   `docker-compose.yml` (already present). After any compose change, run `docker compose up -d backend` so the
   container is recreated.

### Configuration

All variables are optional, go in `backend/.env`, and are listed in `backend/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | `ollama` or `mock` (deterministic stub for e2e/CI) |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Where the backend reaches Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b-instruct` | Model used for chat |
| `OLLAMA_KEEP_ALIVE` | `30m` | How long Ollama keeps the model loaded between chats |
| `LLM_TIMEOUT_MS` | `120000` | Timeout for one Ollama request (cold model load takes about 30 s) |
| `LLM_TURN_MAX_MS` | `150000` | Wall-clock cap for a whole reply; on expiry the upstream call is aborted and a friendly "unavailable" message is returned |
| `LLM_MAX_CONCURRENT` | `2` | Max assistant replies running at once across all users; extra requests get a 503 `assistant_busy` with a friendly message |

### Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | One-shot JSON reply (also the fallback for streaming). Requires a signed-in user |
| `POST /api/chat/stream` | Same, streamed as NDJSON (text deltas, then part cards) |
| `GET /api/chat/health` | Open health check: `{ ok, modelPresent }`; `503` when Ollama is unreachable |

Requests are validated (1-20 messages, 2,000 characters each) and limited to 10 per minute with one in-flight
request per user.

### Tests

```bash
cd backend && npx vitest run            # unit tests (mocked LLM and Prisma)
cd frontend && npx vitest run

# Deterministic e2e, no Ollama needed: run the backend with LLM_PROVIDER=mock, then
cd frontend && E2E_LLM_MOCK=1 npx playwright test tests/parts-assistant.spec.ts --project=chromium

# Live e2e against the real model (stack and Ollama running; read-only, seed customer login only)
cd frontend && npx playwright test tests/parts-assistant.spec.ts --project=chromium
```

### Troubleshooting

- Check `curl http://localhost:5173/api/chat/health` (through the frontend proxy). `modelPresent: false` means
  `ollama pull` has not been run for `OLLAMA_MODEL`. A `503` means Ollama is not running or not reachable from
  the container.
- The first reply after a cold start takes about 30 s while the model loads. Later replies are faster because of
  `OLLAMA_KEEP_ALIVE`.
- Replies that never arrive are cut off after `LLM_TURN_MAX_MS` and show the "assistant is unavailable" message.
  Close memory-hungry apps or use the smaller model.
- "Tenant or user not found" in the backend logs comes from the Supabase pooler and means the Supabase project is
  paused. Restore it in the Supabase dashboard and retry.

---

## Environment variables reference

| Variable | File | Description |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | Supabase pooled connection (PgBouncer) |
| `DIRECT_URL` | `backend/.env` | Supabase direct connection (for migrations) |
| `SUPABASE_URL` | `backend/.env` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Backend admin key, **never expose to frontend** |
| `STRIPE_SECRET_KEY` | `backend/.env` | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | `backend/.env` | Verifies incoming Stripe webhook signatures |
| `LLM_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_KEEP_ALIVE`, `LLM_TIMEOUT_MS`, `LLM_TURN_MAX_MS`, `LLM_MAX_CONCURRENT` | `backend/.env` | Optional, see [Parts Assistant](#parts-assistant-local-ai) |
| `VITE_SUPABASE_URL` | `frontend/.env` | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Supabase anon/public key |

---

## Commit convention

We use **GitHub for Jira** integration. Every commit **must** include a Jira ticket ID:

```
feat(TTP-12): implement purchasing module
fix(TTP-8): resolve docker port conflict
```

---

## License

Coursework project for BSIS at De La Salle University. All rights reserved.

---

_Developed by Team THISGROUPATE, De La Salle University, BSIS._

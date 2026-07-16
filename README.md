# Tarlac Truck Pitstop — Management System

A full-stack enterprise-grade inventory, sales, and analytics platform built for **Tarlac Truck Pitstop (TTP)**. Includes a comprehensive admin dashboard for managing parts, purchasing, and logistics, plus a customer-facing storefront with Stripe-powered checkout.

---

## ⚡ Tech Stack

<details>
<summary><strong>Frontend</strong></summary>

- **React 18** + **Vite** — UI and build tooling
- **Tailwind CSS** — Utility-first styling (custom HSL palette)
- **Phosphor Icons** — Iconography
- **Supabase JS** — Client-side auth session management
- **Stripe.js** — Checkout redirect

</details>

<details>
<summary><strong>Backend</strong></summary>

- **Node.js (v20)** + **Express.js** — HTTP server & routing
- **Prisma ORM** — Type-safe database client
- **PostgreSQL via Supabase** — Cloud-managed relational database
- **Supabase Auth** — JWT-based authentication (Admin SDK on backend)
- **Stripe** — Payment processing

</details>

<details>
<summary><strong>Infrastructure</strong></summary>

- **Docker + Docker Compose** — Container orchestration
</details>

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and **running**
- Git

### Step 1 — Clone the repo
```bash
git clone <repo-url>
cd ISANDE_ITISDEV
```

### Step 2 — Create your `.env` files

**`backend/.env`** — get these values from a teammate or the shared credentials vault:
```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
STRIPE_SECRET_KEY="sk_test_..."
```

**`frontend/.env`** — public keys, safe to share with the team:
```env
VITE_SUPABASE_URL="https://zzefrhwkiydjgvejnkmd.supabase.co"
VITE_SUPABASE_ANON_KEY="sb_publishable_PDRqOyG3VNmWnL4pOdS8xg_UXh4TjIz"
```

### Step 3 — Start the app

You can start the app using your platform's helper script, or by using Docker manually.

**Using Windows Helper:**
```powershell
.\run.bat
```

**Using Mac/Linux Helper:**
```bash
make up
```

**Using Docker Manually (Any Platform):**
```bash
docker-compose up -d --build
```

### Step 4 — Open the app
| Service | URL |
|---|---|
| **Customer Storefront** | http://localhost:5173 |
| **Admin Dashboard** | http://localhost:5173/admin |
| **Backend API** | http://localhost:5000 (internal) |

---

## 🔄 Daily Workflow

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

## 🗄️ Database

The app uses **Supabase (PostgreSQL)** managed via **Prisma ORM**.

- Schema is defined in [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma)
- Prisma client is generated automatically during the Docker build (`npx prisma generate`)
- To seed test data (first-time only):
  ```bash
  # Inside backend/ with node_modules installed:
  node scripts/seed-supabase-auth.js   # Creates Auth users in Supabase
  npx prisma db seed                   # Seeds the database tables
  ```

### Test Accounts (local dev only)
| Role | Email | Password |
|---|---|---|
| Customer | `lionel.messi@example.com` | `Password123!` |
| Customer | `cristiano.ronaldo@example.com` | `Password123!` |
| Admin | `admin@tarlactruckparts.local` | `admin123` |

---

## 🔑 Environment Variables Reference

| Variable | File | Description |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | Supabase pooled connection (PgBouncer) |
| `DIRECT_URL` | `backend/.env` | Supabase direct connection (for migrations) |
| `SUPABASE_URL` | `backend/.env` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Backend admin key — **never expose to frontend** |
| `STRIPE_SECRET_KEY` | `backend/.env` | Stripe server-side key |
| `VITE_SUPABASE_URL` | `frontend/.env` | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Supabase anon/public key |

---

## 📝 Commit Convention

We use **GitHub for Jira** integration. Every commit **must** include a Jira ticket ID:

```
feat(TTP-12): implement purchasing module
fix(TTP-8): resolve docker port conflict
```

---

<p align="center">
  <i>Developed by Team ISANDE — Tarlac State University, BSIT.</i>
</p>

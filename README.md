# Tarlac Truck Parts - Management System

A **full‑stack N‑E‑R‑M** (Node.js, Express, React, MongoDB) application for managing truck parts inventory, sales, and analytics. The project follows **industry‑standard file naming and directory conventions** to make onboarding new developers painless.

---

## ⚡ Tech Stack

- **Node.js** (v20) – backend runtime
- **Express** – HTTP server & routing
- **MongoDB Atlas** – managed cloud database (or local `mongo` service)
- **React 18** – UI library
- **Vite** – fast dev/build tooling for React
- **Tailwind CSS** – utility‑first styling (custom HSL palette)
- **Lucide React** – icon set
- **jsPDF + jsPDF‑AutoTable** – client‑side PDF invoice generation

---

## 📂 Project Structure

```
truck-parts-management-system/
├─ backend/                     # Express API
│   ├─ Dockerfile               # Docker image for backend (named "truck-system")
│   ├─ src/
│   │   ├─ config/              # env loader + MongoDB connection
│   │   │   ├─ env.js
│   │   │   └─ db.js
│   │   ├─ models/              # Mongoose schemas
│   │   │   └─ User.js
│   │   ├─ routes/              # Auth & future feature routes
│   │   │   └─ auth.js
│   │   └─ index.js             # Server entry point (dynamic port logic)
│   └─ package.json
├─ frontend/                    # React UI
│   ├─ Dockerfile               # Docker image for Vite dev server
│   ├─ src/                     # React components & pages
│   │   └─ ...
│   ├─ index.html
│   └─ package.json
├─ docker-compose.yml           # Orchestrates backend, frontend (and optional Mongo)
├─ .dockerignore                # Prevents node_modules, build artefacts from image
├─ .gitignore
├─ atlas-credentials.env        # **Never commit** – contains MONGODB_URI, ADMIN creds, JWT secret
├─ start-all.sh                 # Convenience script to run both services locally (non‑Docker)
└─ README.md                    # This file
```

### Naming Conventions (N‑E‑R‑M)
| Layer | Directory | Typical file name | Reason |
|-------|-----------|------------------|--------|
| **Node** (backend) | `backend/src` | `index.js` (app entry) | Consistent entry point across Node projects |
| **Express** | `backend/src/routes` | `auth.js`, `users.js`, `parts.js` | One file per resource – aligns with REST conventions |
| **MongoDB Model** | `backend/src/models` | `User.js`, `Part.js` | Capitalised singular model names – Mongoose best practice |
| **Config** | `backend/src/config` | `env.js`, `db.js` | Isolated configuration, easy to test |
| **React** (frontend) | `frontend/src` | `components/`, `pages/`, `hooks/` | Mirrors CRA/Vite community layout |
| **Docker** | Project root | `Dockerfile` per service, `docker-compose.yml` | Clear separation of concerns |

---

## 🐳 Running with Docker (recommended)

1. **Prerequisite** – Docker Desktop (or Docker Engine) installed.
2. **Setup Credentials** – Copy the example environment file and fill in your MongoDB connection string and secrets:
   ```bash
   cp atlas-credentials.env.example atlas-credentials.env
   # Edit atlas-credentials.env with your actual MongoDB URI and secure JWT_SECRET
   ```
3. From the project root, build and start everything in the background:
   ```bash
   docker compose up -d --build
   ```
   - Backend container is named **`truck-system-backend`** and is mapped to port **3001** on your host.
     ```
     🚀 Backend listening on http://localhost:5000 (accessible via http://localhost:3001)
     ```
   - Frontend container is named **`truck-system-frontend`** and runs on **`http://localhost:5173`**.
4. To view logs for the backend:
   ```bash
   docker logs -f truck-system-backend
   ```
5. The containers will keep running until you stop them:
   ```bash
   docker compose down
   ```

---

## ⚙️ Local Development (without Docker)

If you prefer to run services directly on your machine (e.g., for debugging), you can use the provided `start-all.sh` script:

```bash
# From the project root
./start-all.sh
```
The script:
- Starts the backend (`npm run dev` in `backend`).
- Starts the Vite frontend (`npm run dev` in `frontend`).
- Prints the exact URLs and ports being used.

> **Note** – The backend already contains *dynamic port selection*: if `5000` is occupied it will try `5001`, `5002`, … until it finds a free port and logs the chosen one.

---

## 📄 API Overview (backend)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/admin/login` | Admin login – uses credentials from `atlas-credentials.env` |
| `POST` | `/api/auth/register` | Customer registration (creates a `User` with role `customer`) |
| `POST` | `/api/auth/login` | Customer login |
| `POST` | `/api/auth/reset-request` | Returns a JWT reset token (in a real app you’d email it) |
| `POST` | `/api/auth/reset/:token` | Reset password using the token |
| `GET`  | `/api/ping` | Simple health check (`{ msg: "pong" }`) |

---

## 🎨 UI / Frontend Notes

- All React components live under `frontend/src/`. Follow the **feature‑folder** pattern (`components/`, `pages/`, `hooks/`).
- Tailwind configuration (`tailwind.config.js`) uses the project‑wide HSL color palette for a premium dark‑mode‑ready look.
- Environment variables prefixed with `VITE_` are exposed to the browser. The dev server reads `VITE_BACKEND_URL` to know where the API lives.

---

## ✅ Quick Validation

1. **Backend health** – after `docker compose up` or `./start-all.sh` run:
   ```bash
   curl http://localhost:5000/api/ping
   # → { "msg": "pong" }
   ```
2. **Admin login** – use the credentials you set in `atlas-credentials.env`:
   ```bash
   curl -X POST http://localhost:5000/api/auth/admin/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@tarlactruckparts.local","password":"Admin@12345"}'
   ```
   You should receive a JWT token.
3. Open the **frontend** at `http://localhost:5173` – the UI should load without errors and be able to hit the backend endpoints (login, register, etc.).

---

## 📦 Production Build (optional)

If you need a production‑ready bundle:
```bash
# Backend
docker build -t truck-system:prod -f backend/Dockerfile .
# Frontend
cd frontend && npm run build && npx serve -s dist   # or add a prod Docker stage
```
Serve the static `dist/` folder behind a reverse proxy (NGINX, Caddy, etc.).

---

## 📚 Further Reading & Resources
- **Express & Mongoose** – https://expressjs.com/ & https://mongoosejs.com/
- **Vite + React** – https://vitejs.dev/guide/#scaffolding-your-first-vite-project
- **Docker Best Practices** – https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- **N‑E‑R‑M Boilerplate Guides** – many open‑source templates follow the same layout; this repo mirrors those conventions.

---

### 🎉 Happy coding!
Feel free to open an issue if you spot a missing file, naming inconsistency, or want to extend the stack.

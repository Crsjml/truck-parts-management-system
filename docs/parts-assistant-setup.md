# Parts Assistant: AI setup guide

The storefront Parts Assistant runs on a **local** model through [Ollama](https://ollama.com). No cloud API key or
paid service is involved. This guide gets it working from a fresh clone, either with Docker or running natively.
For the feature overview, endpoints and tuning variables see the "Parts Assistant (local AI)" section of the
[README](../README.md#parts-assistant-local-ai).

## What you need

| Item | Notes |
|---|---|
| Ollama | Installed on the **host machine**, never inside Docker |
| Model `qwen2.5:3b-instruct` | About 2 GB; fits an 8 GB machine. Default and the model the eval was tuned on |
| Free RAM | About 3 GB for the model while it is loaded |
| A signed-in customer account | The assistant is login-only (see `docs/seed-accounts.md` for local test accounts) |

## 1. Install Ollama and pull the model

```bash
# macOS: brew install ollama      (or download from https://ollama.com)
ollama serve                      # skip if the desktop app is already running
ollama pull qwen2.5:3b-instruct
```

Check it is up and the model is present:

```bash
curl http://localhost:11434/api/tags      # should list qwen2.5:3b-instruct
```

A 7B model (`qwen2.5:7b-instruct`) gives better tool-calling but needs 16 GB or more, and will not load on an 8 GB
machine that is also running Docker. Switch with `OLLAMA_MODEL` in `backend/.env`.

## 2. Point the backend at Ollama

The backend finds Ollama through `OLLAMA_BASE_URL`. The right value depends on **where the backend runs**:

| How you run the backend | `OLLAMA_BASE_URL` |
|---|---|
| Native (`node src/index.js`, `npm run dev` in `backend/`) | `http://localhost:11434` |
| Docker (`docker compose up`) | `http://host.docker.internal:11434` |

Why two values: inside a container, `localhost` is the container itself, and outside Docker the name
`host.docker.internal` does not resolve (`ENOTFOUND`).

The repo handles this for you:

- `docker-compose.yml` pins `OLLAMA_BASE_URL=http://host.docker.internal:11434` for the backend container, and adds
  `extra_hosts: host.docker.internal:host-gateway` so Linux hosts resolve it too. This overrides `backend/.env`.
- For native runs, add this line to your own `backend/.env` (it is gitignored):

  ```bash
  OLLAMA_BASE_URL=http://localhost:11434
  ```

If you leave it unset, the code default is `http://host.docker.internal:11434`, which only works in Docker.

## 3. Start the stack

### Option A: Docker

```bash
docker compose up -d
```

If you changed `docker-compose.yml` or `.env`, recreate the backend: `docker compose up -d backend`.

### Option B: Native

```bash
# terminal 1
cd backend && npm install && npm run dev        # node --watch: reloads on code changes

# terminal 2
cd frontend && npm install && npm run dev       # http://localhost:5173
```

The backend listens on port 5000. **On macOS, AirPlay Receiver holds port 5000** and the backend fails with
`EADDRINUSE`. Either turn it off (System Settings > General > AirDrop & Handoff > AirPlay Receiver) or use another
port and tell Vite where it is:

```bash
cd backend  && PORT=5001 node --env-file=.env src/index.js
cd frontend && BACKEND_PROXY_TARGET=http://localhost:5001 npm run dev
```

`npm run dev` reloads on code changes, but restart it after editing `.env`. If you start it with plain `node
src/index.js` instead, it never reloads.

## 4. Verify

```bash
curl http://localhost:5173/api/chat/health      # through the Vite proxy
# {"ok":true,"modelPresent":true}
```

Then sign in as a customer, open the storefront and click the chat button. The first reply after a cold start takes
about 30 seconds while the model loads; later replies take roughly 5 to 15 seconds.

## 5. Quality checks

```bash
cd backend && npx vitest run         # unit tests, LLM mocked, no Ollama needed
cd frontend && npx vitest run

# Live golden-question eval: 28 typical customer questions against the real model and database.
# Manual tool, not a CI gate; read the pass rate and latency it prints. Aim for 90% or better.
cd backend && node --env-file=.env scripts/assistant-eval.mjs
cd backend && node --env-file=.env scripts/assistant-eval.mjs --only=E1,F2     # a subset

# Browser tests. Mock mode needs the backend started with LLM_PROVIDER=mock; no Ollama.
cd frontend && E2E_LLM_MOCK=1 npx playwright test tests/parts-assistant.spec.ts --project=chromium
# Live mode (stack and Ollama running; read-only, uses the seed customer login)
cd frontend && npx playwright test tests/parts-assistant.spec.ts --project=chromium
```

The eval is non-deterministic: a small model can pass a question on one run and miss it on the next, so judge the
overall rate rather than single failures. It uses `OLLAMA_BASE_URL` from `backend/.env`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Chat says "The parts assistant is unavailable right now" and health shows `modelPresent: false` | The backend cannot reach Ollama. Native run with `OLLAMA_BASE_URL` unset (falls back to `host.docker.internal`): set it to `http://localhost:11434` and restart the backend. Confirm with `curl localhost:11434/api/tags` |
| Health returns `503` | Ollama is not running, or not reachable from the container. Start `ollama serve`; for Docker confirm the `extra_hosts` entry and recreate the backend |
| `modelPresent: false` but Ollama is reachable | The model is not pulled. Run `ollama pull <OLLAMA_MODEL>` |
| Backend exits with `EADDRINUSE :5000` (macOS) | AirPlay Receiver owns the port. Disable it or use `PORT=5001` as above |
| Replies never arrive or are cut off | Capped at `LLM_TURN_MAX_MS` (150 s). The machine is probably overloaded; close heavy apps, or check that no other process is using the model |
| Everything slow, eval takes minutes per question | High system load. Ollama shares the CPU/GPU with everything else; retry when the machine is quiet |
| "assistant_busy" (503) | More than `LLM_MAX_CONCURRENT` replies are running at once. Retry in a few seconds |
| "Tenant or user not found" in backend logs | The Supabase project is paused. Restore it in the Supabase dashboard |

## Safety behaviour you should not break

These are enforced in code and covered by tests; keep them intact when changing the assistant:

- Login required, with rate limiting (10 requests per minute per user, one in flight) and a global cap on
  concurrent replies.
- The model only gets read-only tools, and every part goes through an allow-list projection
  (`toCustomerPart` in `backend/src/services/AssistantTools.js`). It never sees cost, supplier, markup, reserved
  stock or minimum stock, and never sees unpublished or archived parts.
- Questions about supplier, cost price or margin are declined by a deterministic guard in `ChatService.js`
  before the model or any tool runs, because a 3B model otherwise sometimes answers with the selling price.
- Tool results and user text are treated as data, not instructions.

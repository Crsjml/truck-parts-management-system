# Local AI Parts Assistant — Implementation Plan

**Goal:** Replace the mock `/api/chat/simulate` reply behind the existing storefront
"Parts Assistant" (`frontend/src/components/StorefrontChatbot.jsx`) with a locally hosted
LLM that helps customers use the site: find parts, get recommendations by vehicle/fitment,
check stock and price, and get help with things like ordering, saved parts, and checkout.

> **Status (2026-11-26): Steps 1-8 are complete.** Live testing with `qwen2.5:3b-instruct` led to follow-up
> fixes that are also done: store-currency `priceDisplay` and card price, `stockStatus` instead of `minStock`
> in tool output, token-based assistant search, `keep_alive` plus an overall per-turn cap (`LLM_TURN_MAX_MS`),
> and a shorter system prompt. See `README.md` ("Parts Assistant (local AI)") for setup and operation.

## Current state (verified 2026-11-25)

- UI already exists: `StorefrontChatbot.jsx` uses `@assistant-ui/react` (`useLocalRuntime`),
  posts `{ messages: [{ role, content }] }` to `/api/chat/simulate`, and expects
  `{ content: [ {type:'text', text} | {type:'tool-call', toolName:'show_part', toolCallId, args:{ part }} ] }`.
  `show_part` renders `MiniPartCardTool` (uses `part.name, sku, oem, price, stock, minStock`).
  Only the latest user message is sent; history is dropped. A `mockPart` constant is still in the file.
- Backend: `backend/src/routes/chat.js` returns hard-coded keyword replies with a 1s `setTimeout`.
  Mounted at `/api/chat` in `backend/src/app.js` with **no auth, no validation, no rate limit**.
- Data: `Part` model (Prisma) has `name, sku, oem, oemNumbers[], price (cost), markupOverride,
  stock, reservedStock, min_stock, compatibility, compatibleWith (Json), description, published, archived`.
  `PartsService.getParts({ search, category, brand, series, engineCode, published, ... })` already does
  catalogue search.
- Runtime: Ollama is installed on the host (`/usr/local/bin/ollama`, API on `:11434`), **no models pulled**.
  The backend runs in Docker (`truck-system-backend`), so it must reach the host via `host.docker.internal`.

## Constraints

- Local model only: no paid cloud LLM APIs.
- The assistant may only cite parts that the backend tools actually returned. No invented SKUs, prices, or stock levels.
- Customers must never see internal fields: supplier cost (`price` before markup), `markupOverride`,
  supplier, `reservedStock` internals, or unpublished/archived parts.
- Do not `prisma db push` (shared Supabase DB). This feature needs **no schema change**.

---

## Step 1 — Design the local model runtime and chat contract

Choose the model and wiring, and write it down: Ollama on the host, reached from the backend container via
`OLLAMA_BASE_URL=http://host.docker.internal:11434` (add `extra_hosts: host.docker.internal:host-gateway`
to `docker-compose.yml`), and `OLLAMA_MODEL` defaulting to a tool-calling-capable ~7–8B instruct model
(e.g. `qwen2.5:3b-instruct` on 8 GB machines, `qwen2.5:7b-instruct` on >=16 GB, with `llama3.1:8b` as the fallback). Define the request/response contract,
keeping the existing UI content shape (`text` + `show_part` tool-call parts) so the frontend changes stay small.
Decide between non-streaming JSON first and streaming later.

Acceptance: an ADR section is appended to this plan with the model choice, env vars, the
tool list, and the response contract. The `.env.example` keys are listed.

## Step 2 — Implement the Ollama client service

Add `backend/src/services/LlmClient.js`, a thin wrapper over Ollama `/api/chat` (native `fetch`, no new SDK).
It covers the timeout (AbortController), model/env config, tool-call parsing, and a health check
(`GET /api/tags` confirms the model is present). Errors map to typed results (`unavailable`, `timeout`, `bad_response`)
instead of throwing raw errors to the route.

Acceptance: unit tests with mocked `fetch` cover success, tool-call parsing, timeout, and Ollama-down.
`/api/chat/health` reports model availability.

## Step 3 — Implement customer-safe assistant tools

Add `backend/src/services/AssistantTools.js` with read-only tools backed by `PartsService`/Prisma:
`search_parts(query, category?, brand?, series?, engineCode?)`, `get_part(id|sku)`,
`list_categories()`, and `site_help(topic)`. `site_help` is a static FAQ covering ordering, checkout,
saved parts, and account. Every tool returns a **customer-safe projection**: published and not archived,
selling price computed with the same markup logic the storefront uses, and available stock = `stock - reservedStock`.
No cost, supplier, or markup fields. Cap results at 5.

Acceptance: tests prove unpublished/archived parts are never returned. Tests prove that the cost, supplier,
and markup fields are absent and that the price equals the storefront selling price.

## Step 4 — Implement the /api/chat endpoint with a tool-calling loop

Replace `/simulate` with `POST /api/chat`. The system prompt scopes the assistant to truck parts and site help.
The loop sends the conversation to the LLM, executes the requested tools, feeds the results back, and stops after 4 rounds max.
It then maps the output to the existing UI contract and emits one `show_part` tool-call per recommended part.
The server **re-validates every part id against the tool results** before emitting a card.
It also adds `requireAuth` (the chatbot is customer-session only), zod validation (max 20 messages, max 2,000 chars each),
a per-user rate limit, and friendly fallbacks when Ollama is unavailable.

Acceptance: integration tests with a mocked LlmClient cover the tool loop, the card mapping, hallucinated-id dropping,
400 on invalid body, 401 unauthenticated, 429 on burst, and a 503-style friendly message when Ollama is down.

## Step 5 — Wire the existing chatbot UI to the real endpoint

Update `StorefrontChatbot.jsx`. It sends the full thread history (`messages` from the runtime) to `POST /api/chat`.
Remove `mockPart`, keep `MiniPartCardTool` but read the projected fields, and make "View details" call
`onOpenPartDetail` with the real part. Show clear states for slow, unavailable, and rate-limited replies.
Update the header hint text to cover recommendations and site help.

Acceptance: component tests cover multi-turn history being sent, a real part card opening part detail,
and an error message rendering when the API returns 503/429. No mock data remains in the component.

## Step 6 — Stream assistant replies

Add `POST /api/chat/stream` (NDJSON or SSE) that streams text tokens from Ollama (`stream: true`)
and emits part cards once tools resolve. Switch the frontend `useLocalRuntime` adapter to an async generator
so text appears progressively. Keep the JSON endpoint as the fallback.

Acceptance: first token renders before the full reply completes. Aborting the chat (close/new chat)
cancels the upstream Ollama request. Tests cover the stream parsing.

## Step 7 — End-to-end tests for the assistant flow

Add a Playwright spec: log in as a seed customer, open the Parts Assistant, ask for a part by vehicle/OEM,
see a part card, click through to part detail, and ask a site-help question. Use a stubbed
LLM (env flag `LLM_PROVIDER=mock`) so CI does not need Ollama.

Acceptance: the e2e spec passes headless with the mock provider. It also passes locally against real Ollama when
`OLLAMA_MODEL` is pulled.

## Step 8 — Document setup and operation

Update `README.md` with the setup steps: `ollama pull <model>`, the env vars, and the docker-compose `extra_hosts` entry.
Add how to switch models, hardware notes (RAM for 7B/8B), and the troubleshooting `/api/chat/health` endpoint.
Add an `activity-log.md` entry.

Acceptance: a fresh clone can follow the README to a working assistant. The env keys are documented in `.env.example`.

## ADR — Local model runtime

Status: accepted (Step 1).

- **Runtime:** Ollama runs on the host, not in compose. The backend container reaches it at
  `OLLAMA_BASE_URL=http://host.docker.internal:11434`; `docker-compose.yml` adds
  `extra_hosts: ["host.docker.internal:host-gateway"]` to the backend service so this also works on Linux.
- **Model:** `OLLAMA_MODEL` defaults to `qwen2.5:3b-instruct` (fits an 8 GB machine; the 7B failed to load on an 8 GB M3). Use `qwen2.5:7b-instruct` (better tool-calling) on machines with >=16 GB; fallback `llama3.1:8b`.
- **Config (code defaults, documented in `backend/.env.example`):** `LLM_PROVIDER=ollama|mock`,
  `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `LLM_TIMEOUT_MS` (default 120000; cold model load takes ~30s). `mock` is a deterministic stub for e2e/CI.
- **Client:** `backend/src/services/LlmClient.js`, native fetch against Ollama `POST /api/chat` (`stream:false`).
  `chat({messages, tools})` returns `{ok:true, message:{content, toolCalls:[{name, arguments}]}}` or
  `{ok:false, error:'unavailable'|'timeout'|'bad_response'}`; it never throws and never exposes upstream details.
  `GET /api/chat/health` reports `{ok, provider, model, modelPresent}` (503 when Ollama is down).
- **Tools exposed to the model:** `search_parts`, `get_part`, `list_categories`, `site_help`.
- **Response contract (unchanged):** `{content:[{type:'text',text} | {type:'tool-call',toolName:'show_part',toolCallId,args:{part}}]}`.
- **Delivery:** non-streaming JSON first (Steps 2-5); streaming added in Step 6 with the JSON endpoint kept as fallback.

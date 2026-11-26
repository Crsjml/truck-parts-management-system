# Parts Assistant: keep the chat log per session + follow the display currency

Date: 2026-11-26
Area: storefront `StorefrontChatbot` (frontend only, no backend change needed)

## Problems (root causes confirmed)

1. **Chat log is lost when the drawer closes.**
   `ui/Drawer.jsx:158` renders `<AnimatePresence>{isOpen && <DrawerPanel/>}</AnimatePresence>`, so closing
   the drawer unmounts `ChatbotContent`. `useLocalRuntime(chatModelAdapter)` lives inside `ChatbotContent`
   (`StorefrontChatbot.jsx:142`), so the thread is destroyed on every close. Leaving the storefront
   (route change / `customerSession` gate at `CustomerStorefront.jsx:846`) unmounts the whole chatbot too.

2. **Assistant reply text ignores the display currency.**
   Part cards already convert live (`PartCard` uses `formatBaseCurrency`, which converts base → `displayCurrency`).
   But the LLM's sentence quotes `priceDisplay`, which the backend formats in the store **base** currency
   (`backend/src/services/AssistantTools.js:149`, system-prompt rule 4 in `ChatService.js:35`). So with USD selected
   the card says `$21.50` while the text says `₱1,234.00`.

## Step 1: Persist the chat thread per browser session

Lift the runtime out of the part that unmounts and persist messages to `sessionStorage`.

- Own the runtime in `StorefrontChatbot` (always mounted while on the storefront), not inside the drawer body.
  Wrap the drawer content in the `AssistantRuntimeProvider` from there.
- Persist the thread's messages (text parts + `show_part` tool-call parts) to `sessionStorage` under a key scoped to
  the signed-in user, e.g. `partsAssistant:thread:<userId>`, and restore them on mount (assistant-ui 0.15
  `useLocalRuntime(adapter, { initialMessages })` or a history adapter; pick whichever the installed version supports).
- "New Chat" (broom button) clears the thread **and** the stored entry. Today it bumps a `key`; replace that with a
  runtime reset that also wipes storage.
- Clear the stored thread on sign-out so the next user on a shared device never sees it.
- Do not persist an in-flight/streaming assistant message as finished; drop a trailing incomplete assistant turn on restore.
- Cap what is stored (the backend accepts at most 20 messages; keep the last 20) and tolerate corrupt JSON (start fresh).

Acceptance:
- Open the assistant → ask → close → reopen: the same messages and part cards are shown.
- Navigate away from the storefront and back (same tab): the thread is still there. A new tab/browser session starts empty.
- New Chat empties the thread and it stays empty after close/reopen. Sign-out → sign-in as another user shows an empty thread.

## Step 2: Make assistant price text follow the display currency

Keep it frontend-only and deterministic (no trust in client exchange rates on the server, no LLM placeholders).

- Each assistant message already carries the `show_part` tool-call parts with `part.price` (base selling price, markup
  applied) and `part.priceDisplay` (the exact string the model was told to copy).
- Render assistant text through a custom text component (`MessagePrimitive.Content components={{ Text: ... }}`)
  that replaces every occurrence of a sibling part's `priceDisplay` with `formatBaseCurrency(part.price)`.
  Never re-apply markup (`part.price` is already the selling price).
- Because conversion happens at render time from `useSettings()`, switching currency re-renders **old** messages too,
  including restored ones from Step 1.
- Put the replacement in a pure, unit-tested util (e.g. `utils/chatPriceText.js`): escape the search strings, longest
  first, no-op when there are no parts or no match.

Acceptance:
- With display currency USD, the reply text and the card show the same USD amount for each part.
- Switch PHP → USD → EUR with the drawer open: existing messages update without re-asking.
- Text with no matching price string is unchanged.

## Step 3: Verify end to end

- Unit: `StorefrontChatbot.test.jsx` covers close/reopen keeping messages, New Chat clearing, storage restore, sign-out clear.
- Unit: the price-text util (matches, no match, multiple parts, regex-special characters in `₱1,234.00`).
- E2E (Playwright, live stack): ask about a part, close/reopen, switch display currency, assert text + card agree.

## Status (2026-11-26)

Steps 1-3 are done and uncommitted. Results: `parts-assistant.spec.ts` passes 5/5 on chromium, and the unit suite passes 542/546. The 4 failures are all outside the chat files: PurchasingProductModal ×2 (pre-existing), PurchasingProductFitment ×1 (another session's work), and CustomerStorefront ×1 (load-flaky).
Files: `StorefrontChatbot.jsx`, `CustomerStorefront.jsx` (userId prop), `App.jsx` + `MyAccount.jsx` (clearAllThreads on sign-out),
`utils/chatThreadStorage.js`, `utils/chatPriceText.js` (+ tests), `StorefrontChatbot.test.jsx`, `frontend/tests/parts-assistant.spec.ts`.

## Step 4: Convert leftover base-currency prices that have no card (TODO)

Problem found in Step 3: for broad questions the model mentions more parts in its text (e.g. 5) than get `show_part`
cards (e.g. 3). `localizePriceText` only rewrites the `priceDisplay` strings of parts with a card in the same message,
so with USD selected the uncarded prices still show as `₱60,333.59`. Every price shown must follow the display currency,
for both text and cards, live on currency switch, including restored threads.

- Extend `frontend/src/utils/chatPriceText.js`. After the exact `priceDisplay` replacement, run a fallback pass that finds any
  remaining amount written in the store BASE currency and converts it with the same `formatBaseCurrency(amount)`.
  - Base currency comes from `useSettings().settings.base_currency`, default PHP. Match the symbol Intl produces for it
    (`new Intl.NumberFormat('en-PH',{style:'currency',currency:base}).formatToParts(0)` gives the currency part, e.g. `₱`)
    and also the ISO code (`PHP 1,234.00`, `PHP1,234.00`). Amount grammar: digits with optional `,` thousands groups,
    optional `.dd`. Allow a normal or non-breaking space between the symbol/code and the amount.
  - Amounts in base currency are already selling prices: convert only, never apply markup.
  - When displayCurrency === base currency, the output must equal the input, unchanged (no reformatting).
  - Don't touch numbers without a currency marker (SKUs, OEM numbers, quantities, years). Don't double-convert text
    produced by the first pass. Do both passes over the ORIGINAL text in one combined replacement, not sequentially.
  - Never throw; on any error return the original text.
- `PriceAwareText` in `StorefrontChatbot.jsx` passes the base currency into the util. Keep it rendering plain text.
- Tests first: unit tests for the fallback (uncarded ₱ amount converted; carded and uncarded mixed in one message; `PHP 1,234`
  form; no decimals; base==display unchanged; SKU-like numbers untouched; no double conversion). Add a component test where
  a message mentions a part with no card, then switch currency and assert the text updates. Optionally extend the
  e2e currency test to ask the broad "Do you have brake linings in stock? What is the price?" and assert no `₱` remains
  in the assistant bubble after switching to USD (the e2e needs a backend that can reach Ollama; see note below).
- Note: the Docker backend currently can't reach Ollama (`/api/chat/health` gives `ok:false`, and the `docker` command hangs). Step 3 ran the
  e2e against a temporary local backend `PORT=5001 OLLAMA_BASE_URL=http://127.0.0.1:11434` plus a local Vite on `:5174`
  proxying to it. If you do the same, stop both afterwards and delete any temp config. Don't restart Docker.

## Constraints

- Shared checkout: another session has uncommitted Purchasing/AddPartDrawer changes. Only touch
  `StorefrontChatbot.jsx`, new chat utils/tests, the auth sign-out hook point, and the Parts Assistant e2e spec.
  Do not stage or modify `AddPartDrawer*`, `PurchasingModule.jsx`, `CompatibilityEditor*`, `PurchasingAtoms.jsx`,
  `SellsAtHint.jsx`, `compatibilityModels.js`.
- No commits; leave changes in the working tree for review.

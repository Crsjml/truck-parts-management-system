import express from 'express';
import { z } from 'zod';
import llmClient from '../services/LlmClient.js';
import { respond, respondStream, UNAVAILABLE_ERROR, UNAVAILABLE_TEXT } from '../services/ChatService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { createUserRateLimit } from '../middleware/userRateLimit.js';
import { createGlobalConcurrencyLimit } from '../middleware/globalConcurrency.js';

const MAX_MESSAGES = 20;
const MAX_CONTENT = 2000;
const HEALTH_TTL_MS = 10_000;

// The client may only send user/assistant turns. Extra keys (including any
// `role: 'system' | 'tool'` attempt) are rejected by the enum / stripped by zod.
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(MAX_CONTENT)
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES)
}).refine((b) => b.messages.at(-1)?.role === 'user', {
  message: 'The last message must come from the user.'
});

export const createChatRouter = ({
  authenticate = requireAuth,
  rateLimit = createUserRateLimit(),
  chat = respond,
  chatStream = respondStream,
  llm = llmClient,
  maxConcurrent,
  concurrency = createGlobalConcurrencyLimit({ max: maxConcurrent }),
  now = Date.now
} = {}) => {
  const router = express.Router();

  // Open on purpose (ops troubleshooting) but reveals no hostnames or model names.
  // The upstream check is cached briefly (success or failure) so this unauthenticated
  // endpoint cannot be used to hammer Ollama.
  let healthCache = null; // { at, status }
  router.get('/health', async (_req, res) => {
    if (!healthCache || now() - healthCache.at >= HEALTH_TTL_MS) {
      const at = now();
      healthCache = { at, status: Promise.resolve().then(() => llm.health()).catch(() => ({ ok: false })) };
    }
    const status = await healthCache.status;
    res.status(status.ok ? 200 : 503).json({ ok: Boolean(status.ok), modelPresent: Boolean(status.modelPresent) });
  });

  const rejectInvalid = (res) =>
    res.status(400).json({ error: 'invalid_request', msg: 'Send 1-20 messages (user or assistant), each 1-2000 characters, ending with a user message.' });

  // Same auth + per-user rate limit/concurrency slot + global LLM cap as the JSON route (the slot is
  // released on res 'close', which also fires when the client disconnects).
  router.post('/stream', authenticate, rateLimit, concurrency, async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return rejectInvalid(res);

    // Not req 'close': since Node 16 that fires once the request body is read.
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableFinished) abort.abort(); });

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    // no-transform makes the global compression() middleware skip this response,
    // so each event reaches the client immediately instead of sitting in a gzip buffer.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx-style proxies
    res.flushHeaders();

    let terminal = false;
    const send = (event) => {
      if (res.writableEnded || res.destroyed) return;
      if (event.type === 'done' || event.type === 'error') terminal = true;
      res.write(`${JSON.stringify(event)}\n`);
      res.flush?.();
    };
    try {
      await chatStream({ messages: parsed.data.messages, userId: req.auth.userId }, { onEvent: send, signal: abort.signal });
    } catch (err) {
      console.error('[chat] stream failed:', err?.message);
    }
    if (!terminal && !abort.signal.aborted) send({ type: 'error', error: UNAVAILABLE_ERROR, text: UNAVAILABLE_TEXT });
    res.end();
  });

  router.post('/', authenticate, rateLimit, concurrency, async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return rejectInvalid(res);
    // Cancel the upstream LLM call if the client goes away before we replied.
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableFinished) abort.abort(); });
    try {
      const result = await chat({ messages: parsed.data.messages, userId: req.auth.userId }, { signal: abort.signal });
      if (!result?.ok) throw new Error(result?.error ?? UNAVAILABLE_ERROR);
      return res.json({ content: result.content });
    } catch (err) {
      console.error('[chat] assistant failed:', err?.message);
      return res.status(503).json({ content: [{ type: 'text', text: UNAVAILABLE_TEXT }], error: UNAVAILABLE_ERROR });
    }
  });

  return router;
};

export default createChatRouter();

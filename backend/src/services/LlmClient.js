// Thin wrapper over Ollama's /api/chat (native fetch, no deps). Never throws:
// every failure is mapped to a typed { ok: false, error } so callers can show a
// friendly message without leaking hostnames or stack traces.

const DEFAULT_BASE_URL = 'http://host.docker.internal:11434';
const DEFAULT_MODEL = 'qwen2.5:3b-instruct';
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_KEEP_ALIVE = '30m'; // keep the model resident between chats (avoids reload stalls)
const HEALTH_TIMEOUT_MS = 5000;
// Upstream size caps: a misbehaving/compromised upstream must not exhaust memory.
const MAX_LINE_CHARS = 64 * 1024; // one NDJSON line / its unfinished tail
const MAX_CONTENT_CHARS = 64 * 1024; // accumulated streamed reply
const MAX_BODY_CHARS = 256 * 1024; // non-stream response body

const fail = (error) => ({ ok: false, error });

const parseArguments = (raw) => {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object') throw new TypeError('arguments must be an object');
  return parsed;
};

const parseToolCalls = (rawCalls) =>
  (Array.isArray(rawCalls) ? rawCalls : []).map((call) => {
    const name = call?.function?.name;
    if (typeof name !== 'string' || !name) throw new TypeError('tool call without a name');
    return { name, arguments: parseArguments(call.function.arguments) };
  });

const toResult = (body) => {
  const message = body?.message;
  if (!message || typeof message !== 'object') return fail('bad_response');
  try {
    return {
      ok: true,
      message: {
        content: typeof message.content === 'string' ? message.content : '',
        toolCalls: parseToolCalls(message.tool_calls)
      }
    };
  } catch {
    return fail('bad_response');
  }
};

// Runs a fetch with a hard timeout. Resolves to { response } or { error }.
const timedFetch = async (fetchImpl, url, init, timeoutMs, externalSignal) => {
  if (externalSignal?.aborted) return { error: 'aborted' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  try {
    return { response: await fetchImpl(url, { ...init, signal: controller.signal }) };
  } catch (err) {
    if (err?.name !== 'AbortError') return { error: 'unavailable' };
    return { error: externalSignal?.aborted ? 'aborted' : 'timeout' };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
};

const readJson = async (response) => {
  if (!response.ok) return null;
  try {
    const raw = await response.text();
    return raw.length > MAX_BODY_CHARS ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const safeToken = (onToken, delta) => {
  try { onToken?.(delta); } catch { /* a faulty consumer must not break the stream */ }
};

// Reads Ollama NDJSON from a ReadableStream reader. Lines may be split across
// network chunks, so bytes are decoded incrementally and only complete lines parse.
const readStream = async (reader, { arm, onToken }) => {
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const rawCalls = [];
  let sawMessage = false;
  let done = false;

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    let event;
    try { event = JSON.parse(trimmed); } catch { return false; }
    if (!event || typeof event !== 'object' || event.error) return false;
    const message = event.message;
    if (message && typeof message === 'object') {
      sawMessage = true;
      if (typeof message.content === 'string' && message.content) {
        if (content.length + message.content.length > MAX_CONTENT_CHARS) return false;
        content += message.content;
        safeToken(onToken, message.content);
      }
      if (Array.isArray(message.tool_calls)) rawCalls.push(...message.tool_calls);
    }
    if (event.done === true) done = true;
    return true;
  };

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    arm();
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl !== -1) {
      if (!handleLine(buffer.slice(0, nl))) return fail('bad_response');
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf('\n');
    }
    if (buffer.length > MAX_LINE_CHARS) return fail('bad_response'); // unterminated oversized line
  }
  buffer += decoder.decode();
  if (buffer.trim() && !handleLine(buffer)) return fail('bad_response');
  if (!sawMessage || !done) return fail('bad_response'); // truncated stream

  try {
    return { ok: true, message: { content, toolCalls: parseToolCalls(rawCalls) } };
  } catch {
    return fail('bad_response');
  }
};

const createOllamaClient = ({ baseUrl, model, timeoutMs, fetchImpl, keepAlive }) => {
  const root = baseUrl.replace(/\/+$/, '');

  const chat = async ({ messages, tools, signal } = {}) => {
    if (!Array.isArray(messages) || messages.length === 0) return fail('bad_response');
    const payload = { model, messages, stream: false, keep_alive: keepAlive };
    if (Array.isArray(tools) && tools.length > 0) payload.tools = tools;

    const { response, error } = await timedFetch(fetchImpl, `${root}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, timeoutMs, signal);
    if (error) return fail(error);

    const body = await readJson(response);
    return body ? toResult(body) : fail('bad_response');
  };

  // Streaming variant: NDJSON lines from Ollama (stream:true). The timeout is an
  // idle timeout (reset on every chunk) so long replies are fine but a stalled
  // upstream is cut. An external signal aborts the upstream request too.
  const chatStream = async ({ messages, tools, signal, onToken } = {}) => {
    if (!Array.isArray(messages) || messages.length === 0) return fail('bad_response');
    if (signal?.aborted) return fail('aborted');
    const payload = { model, messages, stream: true, keep_alive: keepAlive };
    if (Array.isArray(tools) && tools.length > 0) payload.tools = tools;

    const controller = new AbortController();
    let timedOut = false;
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    };
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener('abort', onExternalAbort, { once: true });
    const abortError = () => (signal?.aborted ? 'aborted' : timedOut ? 'timeout' : 'unavailable');

    let reader;
    try {
      arm();
      const response = await fetchImpl(`${root}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response?.ok || !response.body?.getReader) return fail('bad_response');
      reader = response.body.getReader();
      return await readStream(reader, { arm, onToken });
    } catch (err) {
      return fail(err?.name === 'AbortError' ? abortError() : 'unavailable');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onExternalAbort);
      if (reader) {
        reader.cancel().catch(() => {});
        try { reader.releaseLock(); } catch { /* pending read already settled */ }
      }
    }
  };

  const health = async () => {
    const down = { ok: false, provider: 'ollama', model, modelPresent: false };
    const { response, error } = await timedFetch(fetchImpl, `${root}/api/tags`, { method: 'GET' }, Math.min(timeoutMs, HEALTH_TIMEOUT_MS));
    if (error) return down;
    const body = await readJson(response);
    if (!body) return down;
    const models = Array.isArray(body.models) ? body.models : [];
    const modelPresent = models.some((m) => m?.name === model || m?.model === model);
    return { ok: true, provider: 'ollama', model, modelPresent };
  };

  return { chat, chatStream, health };
};

// Deterministic provider for e2e/CI (LLM_PROVIDER=mock): searches on the first
// round when the user mentions a part, then answers in text once a tool result exists.
const PART_HINT = /\b(part|parts|filter|oem|sku|brake|price|stock|belt|pad|pads|gasket|bearing)\b/i;

const createMockClient = () => {
  const chat = async ({ messages } = {}) => {
    if (!Array.isArray(messages) || messages.length === 0) return fail('bad_response');
    const last = messages[messages.length - 1];
    if (last.role === 'tool') {
      return { ok: true, message: { content: 'Here is what I found in our catalog.', toolCalls: [] } };
    }
    const userText = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    if (PART_HINT.test(userText)) {
      return { ok: true, message: { content: '', toolCalls: [{ name: 'search_parts', arguments: { query: userText } }] } };
    }
    return { ok: true, message: { content: 'I can help with parts and with using this site.', toolCalls: [] } };
  };
  // Streams the deterministic reply word-by-word in a few chunks.
  const chatStream = async ({ messages, tools, signal, onToken } = {}) => {
    if (signal?.aborted) return fail('aborted');
    const result = await chat({ messages, tools });
    if (!result.ok) return result;
    const words = result.message.content.split(/(?<=\s)/).filter(Boolean);
    for (const word of words) {
      if (signal?.aborted) return fail('aborted');
      safeToken(onToken, word);
    }
    return result;
  };
  const health = async () => ({ ok: true, provider: 'mock', model: 'mock', modelPresent: true });
  return { chat, chatStream, health };
};

const toTimeout = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
};

export const createLlmClient = (options = {}) => {
  const env = options.env ?? process.env;
  const provider = options.provider ?? env.LLM_PROVIDER ?? 'ollama';
  if (provider === 'mock') return createMockClient();
  return createOllamaClient({
    baseUrl: options.baseUrl ?? env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
    model: options.model ?? env.OLLAMA_MODEL ?? DEFAULT_MODEL,
    timeoutMs: toTimeout(options.timeoutMs ?? env.LLM_TIMEOUT_MS),
    keepAlive: options.keepAlive ?? env.OLLAMA_KEEP_ALIVE ?? DEFAULT_KEEP_ALIVE,
    fetchImpl: options.fetchImpl ?? globalThis.fetch
  });
};

// Resolve env per call so tests/ops can flip LLM_PROVIDER without a restart.
const llmClient = {
  chat: (args) => createLlmClient().chat(args),
  chatStream: (args) => createLlmClient().chatStream(args),
  health: () => createLlmClient().health()
};

export default llmClient;

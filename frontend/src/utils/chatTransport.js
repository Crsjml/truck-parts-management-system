// Pure helpers for the storefront Parts Assistant: build the /api/chat request
// from the assistant-ui thread and normalise the response into message content.

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_CHARS = 2000;
// Cold local-model load can take ~30s; stay above the backend's LLM timeout.
export const CHAT_TIMEOUT_MS = 130000;

const text = (value) => ({ type: 'text', text: value });
const fallback = (value) => [text(value)];

export const GENERIC_ERROR = "Sorry, I couldn't get an answer right now. Please try again in a moment.";
export const NETWORK_ERROR = "I couldn't reach the assistant. Please check your connection and try again.";

const flattenText = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((p) => p?.type === 'text' && typeof p.text === 'string').map((p) => p.text).join(' ');
};

// Thread messages -> [{role, content}] (user/assistant only, non-empty, last 20, <=2000 chars).
export function toChatMessages(threadMessages) {
  return (Array.isArray(threadMessages) ? threadMessages : [])
    .filter((m) => m?.role === 'user' || m?.role === 'assistant')
    .map((m) => ({ role: m.role, content: flattenText(m.content).trim().slice(0, MAX_CHAT_CHARS) }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_CHAT_MESSAGES);
}

const isPlainPart = (p) => p && typeof p === 'object' && p.part !== null;

// Keep only text and show_part tool-calls; give tool-calls the fields assistant-ui expects.
export function normalizeContent(content) {
  if (!Array.isArray(content)) return [];
  const out = [];
  for (const p of content) {
    if (p?.type === 'text' && typeof p.text === 'string' && p.text.length > 0) {
      out.push(text(p.text));
    } else if (p?.type === 'tool-call' && p.toolName === 'show_part' && isPlainPart(p.args) && p.args.part) {
      out.push({
        type: 'tool-call',
        toolName: 'show_part',
        toolCallId: String(p.toolCallId ?? `show_part_${out.length}`),
        args: p.args,
        argsText: JSON.stringify(p.args),
        result: { shown: true }
      });
    }
  }
  return out;
}

// Turns an apiPost result into the content array to render.
export function contentFromResponse({ ok, status, data } = {}) {
  const friendly = status === 429 || status === 503;
  if (ok || friendly) {
    const content = normalizeContent(data?.content);
    if (content.length > 0) return content;
  }
  return fallback(GENERIC_ERROR);
}

export const networkErrorContent = () => fallback(NETWORK_ERROR);

// ---- Streaming (POST /api/chat/stream, NDJSON) ----

// Yields parsed JSON events from an NDJSON fetch Response. Lines may be split
// across chunks. The reader is always cancelled/released (early exit, abort, error).
export async function* readNdjson(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const parse = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    try { return JSON.parse(trimmed); } catch { return null; } // skip a corrupt line
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl = buffer.indexOf('\n');
      while (nl !== -1) {
        const event = parse(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
        if (event) yield event;
        nl = buffer.indexOf('\n');
      }
    }
    const last = parse(buffer + decoder.decode());
    if (last) yield last;
  } finally {
    reader.cancel().catch(() => {});
    try { reader.releaseLock(); } catch { /* read already settled */ }
  }
}

export const initialStreamState = () => ({ text: '', parts: [], finished: false, failed: false });

// Pure reducer: folds one stream event into { text, parts, finished, failed }.
export function foldStreamEvent(state, event) {
  switch (event?.type) {
    case 'text-delta':
      return typeof event.text === 'string' ? { ...state, text: state.text + event.text } : state;
    case 'part': {
      const [card] = normalizeContent([{ ...event.part, toolCallId: event.part?.toolCallId ?? `show_part_${state.parts.length}` }]);
      return card ? { ...state, parts: [...state.parts, card] } : state;
    }
    case 'error': {
      const message = typeof event.text === 'string' && event.text ? event.text : GENERIC_ERROR;
      return { ...state, text: state.text ? `${state.text}\n\n${message}` : message, finished: true, failed: true };
    }
    case 'done':
      return { ...state, finished: true };
    default:
      return state;
  }
}

// Accumulated message content for the current stream state (what assistant-ui renders).
export const contentFromStreamState = ({ text, parts }) => [...(text ? [{ type: 'text', text }] : []), ...parts];

export const STREAM_INTERRUPTED = 'The reply was interrupted. Please try again.';

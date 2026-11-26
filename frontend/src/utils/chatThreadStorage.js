// Per-user Parts Assistant thread persistence in sessionStorage (tab-scoped, cleared on sign-out).
// Only chat text and `show_part` cards (public part data already shown) are stored.

export const THREAD_KEY_PREFIX = 'partsAssistant:thread:';
export const MAX_STORED_MESSAGES = 20; // the backend accepts at most 20 messages
const CARD_TOOL = 'show_part';

export const threadKey = (userId) => (userId ? `${THREAD_KEY_PREFIX}${userId}` : null);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const toStoredPart = (p) => {
  if (p?.type === 'text' && typeof p.text === 'string') return { type: 'text', text: p.text };
  if (p?.type === 'tool-call' && p.toolName === CARD_TOOL && isObject(p.args?.part)) {
    return { type: 'tool-call', toolCallId: String(p.toolCallId ?? ''), toolName: CARD_TOOL, args: p.args };
  }
  return null;
};

// Drop leading assistant turns and a trailing unanswered user turn, then keep the last 20 starting on a user turn.
const normalize = (messages) => {
  let list = messages;
  while (list.length > 0 && list.at(-1).role === 'user') list = list.slice(0, -1);
  list = list.slice(-MAX_STORED_MESSAGES);
  const firstUser = list.findIndex((m) => m.role === 'user');
  return firstUser < 0 ? [] : list.slice(firstUser);
};

// Live runtime ThreadMessages -> storable plain objects. Pure; never mutates the input.
export function serializeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const kept = [];
  for (const m of messages) {
    if (m?.role !== 'user' && m?.role !== 'assistant') continue;
    if (m.role === 'assistant' && m.status?.type !== 'complete') continue;
    const content = (Array.isArray(m.content) ? m.content : []).map(toStoredPart).filter(Boolean);
    if (content.length > 0) kept.push({ role: m.role, content });
  }
  return normalize(kept);
}

const isValidStoredMessage = (m) =>
  isObject(m) &&
  (m.role === 'user' || m.role === 'assistant') &&
  Array.isArray(m.content) &&
  m.content.length > 0 &&
  m.content.every((p) => toStoredPart(p) !== null);

// Raw string -> ThreadMessageLike[] for `initialMessages`. Anything invalid means start fresh.
export function parseStoredMessages(raw) {
  if (typeof raw !== 'string') return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data) || !data.every(isValidStoredMessage)) return [];
  return normalize(data).map((m) => ({
    role: m.role,
    content: m.content.map(toStoredPart),
    ...(m.role === 'assistant' ? { status: { type: 'complete', reason: 'stop' } } : {})
  }));
}

const store = () => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};

export function loadThread(userId) {
  const key = threadKey(userId);
  if (!key) return [];
  try {
    return parseStoredMessages(store()?.getItem(key));
  } catch {
    return [];
  }
}

export function clearThread(userId) {
  const key = threadKey(userId);
  if (!key) return;
  try {
    store()?.removeItem(key);
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function saveThread(userId, messages) {
  const key = threadKey(userId);
  if (!key) return;
  const stored = serializeMessages(messages);
  if (stored.length === 0) {
    clearThread(userId);
    return;
  }
  try {
    store()?.setItem(key, JSON.stringify(stored));
  } catch {
    // quota/denied: persistence is best effort
  }
}

// Sign-out: remove every user's stored thread so a shared device shows nothing.
export function clearAllThreads() {
  try {
    const s = store();
    if (!s) return;
    const keys = [];
    for (let i = 0; i < s.length; i += 1) keys.push(s.key(i));
    keys.filter((k) => k?.startsWith(THREAD_KEY_PREFIX)).forEach((k) => s.removeItem(k));
  } catch {
    // storage unavailable: nothing to clear
  }
}

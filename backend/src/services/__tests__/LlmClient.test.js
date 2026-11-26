import { describe, expect, it, vi } from 'vitest';
import { createLlmClient } from '../LlmClient.js';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body)
});

const abortableFetch = () =>
  vi.fn((url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      reject(err);
    });
  }));

const make = (fetchImpl, extra = {}) =>
  createLlmClient({ provider: 'ollama', baseUrl: 'http://ollama:11434/', model: 'qwen2.5:7b-instruct', timeoutMs: 50, fetchImpl, ...extra });

const messages = [{ role: 'user', content: 'hi' }];

describe('LlmClient (ollama)', () => {
  it('posts a non-streaming chat request and returns the text message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: { role: 'assistant', content: 'Hello!' } }));
    const tools = [{ type: 'function', function: { name: 'search_parts' } }];

    const result = await make(fetchImpl).chat({ messages, tools });

    expect(result).toEqual({ ok: true, message: { content: 'Hello!', toolCalls: [] } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://ollama:11434/api/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ model: 'qwen2.5:7b-instruct', messages, tools, stream: false, keep_alive: '30m' });
  });

  it('sends keep_alive from options/env and defaults to 30m', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: { content: 'ok' } }));
    await make(fetchImpl, { keepAlive: '1h' }).chat({ messages });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).keep_alive).toBe('1h');
    await make(fetchImpl, { env: { OLLAMA_KEEP_ALIVE: '10m' } }).chat({ messages });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).keep_alive).toBe('10m');
  });

  it('aborts the upstream request when an external signal fires', async () => {
    const ctl = new AbortController();
    const fetchImpl = vi.fn((_u, init) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' })));
    }));
    const p = make(fetchImpl, { timeoutMs: 5000 }).chat({ messages, signal: ctl.signal });
    ctl.abort();
    expect(await p).toEqual({ ok: false, error: 'aborted' });
  });

  it('omits tools from the request when none are given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: { content: 'ok' } }));
    await make(fetchImpl).chat({ messages });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('tools');
  });

  it('parses tool calls with object and JSON-string arguments', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      message: {
        content: '',
        tool_calls: [
          { function: { name: 'search_parts', arguments: { query: 'air filter' } } },
          { function: { name: 'get_part', arguments: '{"id":"p1"}' } }
        ]
      }
    }));

    const result = await make(fetchImpl).chat({ messages });

    expect(result.ok).toBe(true);
    expect(result.message.toolCalls).toEqual([
      { name: 'search_parts', arguments: { query: 'air filter' } },
      { name: 'get_part', arguments: { id: 'p1' } }
    ]);
  });

  it('returns bad_response for unparsable tool arguments', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      message: { content: '', tool_calls: [{ function: { name: 'get_part', arguments: '{nope' } }] }
    }));
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('returns bad_response when the body has no message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ nope: true }));
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('returns bad_response on a non-2xx status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'model not found' }, 404));
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('returns bad_response when the body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{not json' });
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('returns timeout when the request exceeds timeoutMs', async () => {
    const result = await make(abortableFetch(), { timeoutMs: 20 }).chat({ messages });
    expect(result).toEqual({ ok: false, error: 'timeout' });
  });

  it('returns unavailable when Ollama is unreachable, without leaking internals', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed ECONNREFUSED 10.0.0.5:11434'));
    const result = await make(fetchImpl).chat({ messages });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  it('rejects an invalid messages argument as bad_response without calling fetch', async () => {
    const fetchImpl = vi.fn();
    expect(await make(fetchImpl).chat({ messages: [] })).toEqual({ ok: false, error: 'bad_response' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('LlmClient health (ollama)', () => {
  it('reports ok and modelPresent when the model is installed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: 'qwen2.5:7b-instruct' }] }));
    const result = await make(fetchImpl).health();
    expect(result).toEqual({ ok: true, provider: 'ollama', model: 'qwen2.5:7b-instruct', modelPresent: true });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://ollama:11434/api/tags');
  });

  it('reports modelPresent false when the model is not pulled', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: 'llama3.1:8b' }] }));
    expect((await make(fetchImpl).health()).modelPresent).toBe(false);
  });

  it('reports ok false when Ollama is down', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await make(fetchImpl).health()).toEqual({ ok: false, provider: 'ollama', model: 'qwen2.5:7b-instruct', modelPresent: false });
  });
});

describe('LlmClient (mock provider)', () => {
  const mock = () => createLlmClient({ provider: 'mock' });

  it('answers a part question with a search_parts tool call first', async () => {
    const result = await mock().chat({ messages: [{ role: 'user', content: 'Do you have an air filter?' }] });
    expect(result.ok).toBe(true);
    expect(result.message.toolCalls).toEqual([{ name: 'search_parts', arguments: { query: 'Do you have an air filter?' } }]);
  });

  it('replies with text once a tool result is present', async () => {
    const result = await mock().chat({ messages: [
      { role: 'user', content: 'air filter part' },
      { role: 'tool', content: '[]' }
    ] });
    expect(result.message.toolCalls).toEqual([]);
    expect(result.message.content).toMatch(/\S/);
  });

  it('replies with plain text for non-part questions', async () => {
    const result = await mock().chat({ messages: [{ role: 'user', content: 'How do I reset my password?' }] });
    expect(result.message.toolCalls).toEqual([]);
  });

  it('reports healthy', async () => {
    expect(await mock().health()).toEqual({ ok: true, provider: 'mock', model: 'mock', modelPresent: true });
  });
});

describe('LlmClient chatStream (ollama)', () => {
  const enc = new TextEncoder();
  const line = (o) => `${JSON.stringify(o)}\n`;
  const streamResponse = (chunks, { status = 200 } = {}) => ({
    ok: status < 300,
    status,
    body: new ReadableStream({
      start(c) { chunks.forEach((ch) => c.enqueue(enc.encode(ch))); c.close(); }
    })
  });
  const tok = (content) => line({ message: { role: 'assistant', content }, done: false });
  const doneLine = line({ message: { role: 'assistant', content: '' }, done: true });

  it('sends stream:true, emits deltas and returns the accumulated message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([tok('Hel'), tok('lo'), doneLine]));
    const onToken = vi.fn();
    const result = await make(fetchImpl).chatStream({ messages, onToken });
    expect(result).toEqual({ ok: true, message: { content: 'Hello', toolCalls: [] } });
    expect(onToken.mock.calls.map((c) => c[0])).toEqual(['Hel', 'lo']);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ stream: true, model: 'qwen2.5:7b-instruct', keep_alive: '30m' });
  });

  it('reassembles JSON lines split across chunk boundaries (even mid multibyte char)', async () => {
    const whole = tok('héllo ') + tok('wörld') + doneLine;
    const bytes = enc.encode(whole);
    const pieces = [];
    for (let i = 0; i < bytes.length; i += 7) pieces.push(bytes.slice(i, i + 7));
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({ start(c) { pieces.forEach((p) => c.enqueue(p)); c.close(); } })
    });
    const onToken = vi.fn();
    const result = await make(fetchImpl).chatStream({ messages, onToken });
    expect(result.message.content).toBe('héllo wörld');
    expect(onToken.mock.calls.map((c) => c[0]).join('')).toBe('héllo wörld');
  });

  it('accumulates tool calls and handles a final line without trailing newline', async () => {
    const call = line({ message: { content: '', tool_calls: [{ function: { name: 'search_parts', arguments: { query: 'x' } } }] }, done: false });
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([call, doneLine.trimEnd()]));
    const result = await make(fetchImpl).chatStream({ messages });
    expect(result.message.toolCalls).toEqual([{ name: 'search_parts', arguments: { query: 'x' } }]);
  });

  it('returns bad_response for garbage lines, upstream errors, non-2xx and truncated streams', async () => {
    const bad = (chunks, status) => make(vi.fn().mockResolvedValue(streamResponse(chunks, { status }))).chatStream({ messages });
    expect(await bad(['not json\n'])).toEqual({ ok: false, error: 'bad_response' });
    expect(await bad([line({ error: 'model not found' })])).toEqual({ ok: false, error: 'bad_response' });
    expect(await bad([tok('hi')])).toEqual({ ok: false, error: 'bad_response' });
    expect(await bad([], 404)).toEqual({ ok: false, error: 'bad_response' });
  });

  it('returns unavailable when fetch fails, without leaking internals', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed ECONNREFUSED 10.0.0.5'));
    expect(await make(fetchImpl).chatStream({ messages })).toEqual({ ok: false, error: 'unavailable' });
  });

  it('a throwing onToken does not break the stream', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse([tok('a'), doneLine]));
    const result = await make(fetchImpl).chatStream({ messages, onToken: () => { throw new Error('x'); } });
    expect(result.ok).toBe(true);
  });

  it('aborts the upstream request when the external signal fires mid-stream', async () => {
    let upstreamSignal;
    const fetchImpl = vi.fn((url, init) => {
      upstreamSignal = init.signal;
      return Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(c) {
            c.enqueue(enc.encode(tok('partial')));
            init.signal.addEventListener('abort', () => c.error(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }
        })
      });
    });
    const external = new AbortController();
    const onToken = vi.fn(() => external.abort());
    const result = await make(fetchImpl, { timeoutMs: 1000 }).chatStream({ messages, signal: external.signal, onToken });
    expect(result).toEqual({ ok: false, error: 'aborted' });
    expect(upstreamSignal.aborted).toBe(true);
  });

  it('does not call fetch when the signal is already aborted', async () => {
    const fetchImpl = vi.fn();
    const external = new AbortController();
    external.abort();
    expect(await make(fetchImpl).chatStream({ messages, signal: external.signal })).toEqual({ ok: false, error: 'aborted' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('times out when the stream stalls (idle timeout)', async () => {
    const fetchImpl = vi.fn((url, init) => Promise.resolve({
      ok: true,
      body: new ReadableStream({
        start(c) { init.signal.addEventListener('abort', () => c.error(Object.assign(new Error('aborted'), { name: 'AbortError' }))); }
      })
    }));
    expect(await make(fetchImpl, { timeoutMs: 20 }).chatStream({ messages })).toEqual({ ok: false, error: 'timeout' });
  });

  it('mock provider streams its reply in several chunks', async () => {
    const onToken = vi.fn();
    const result = await createLlmClient({ provider: 'mock' }).chatStream({ messages: [{ role: 'user', content: 'hello there' }], onToken });
    expect(result.ok).toBe(true);
    expect(onToken.mock.calls.length).toBeGreaterThan(2);
    expect(onToken.mock.calls.map((c) => c[0]).join('')).toBe(result.message.content);
  });
});

describe('LlmClient upstream size caps', () => {
  const enc = new TextEncoder();
  const line = (o) => `${JSON.stringify(o)}\n`;
  const streamOf = (chunks) => ({
    ok: true,
    status: 200,
    body: new ReadableStream({ start(c) { chunks.forEach((ch) => c.enqueue(enc.encode(ch))); c.close(); } })
  });
  const doneLine = line({ message: { role: 'assistant', content: '' }, done: true });

  it('chatStream rejects a single NDJSON line over 64 KB (no newline) as bad_response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(streamOf(['{"message":{"content":"', 'x'.repeat(70 * 1024)]));
    expect(await make(fetchImpl).chatStream({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('chatStream rejects accumulated content over 64 KB as bad_response', async () => {
    const chunk = line({ message: { role: 'assistant', content: 'y'.repeat(10 * 1024) }, done: false });
    const fetchImpl = vi.fn().mockResolvedValue(streamOf([...Array(8).fill(chunk), doneLine]));
    expect(await make(fetchImpl).chatStream({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('chatStream still accepts content just under the caps', async () => {
    const chunk = line({ message: { role: 'assistant', content: 'z'.repeat(10 * 1024) }, done: false });
    const fetchImpl = vi.fn().mockResolvedValue(streamOf([...Array(5).fill(chunk), doneLine]));
    const out = await make(fetchImpl).chatStream({ messages });
    expect(out.ok).toBe(true);
    expect(out.message.content.length).toBe(50 * 1024);
  });

  it('chat rejects a non-stream body over 256 KB as bad_response', async () => {
    const big = JSON.stringify({ message: { role: 'assistant', content: 'q'.repeat(300 * 1024) } });
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => big });
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: false, error: 'bad_response' });
  });

  it('chat parses a normal text() body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ message: { content: 'ok' } }) });
    expect(await make(fetchImpl).chat({ messages })).toEqual({ ok: true, message: { content: 'ok', toolCalls: [] } });
  });
});

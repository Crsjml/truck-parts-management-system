import { describe, expect, it, vi } from 'vitest';
import { respond, respondStream, MAX_ROUNDS, SYSTEM_PROMPT } from '../ChatService.js';
import { TOOL_DEFINITIONS } from '../AssistantTools.js';

const part = (n, extra = {}) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, name: `Brake Pad ${n}`, sku: `BRK-${n}`, oem: `OEM-${n}`,
  price: 100 + n, priceDisplay: `₱${100 + n}.00`, stock: 5, stockStatus: 'in_stock', category: 'Brakes', ...extra
});
const say = (content) => ({ ok: true, message: { content, toolCalls: [] } });
const call = (name, args = {}) => ({ ok: true, message: { content: '', toolCalls: [{ name, arguments: args }] } });
const scripted = (...replies) => ({ chat: vi.fn(async () => replies.shift() ?? say('done')) });
const input = { messages: [{ role: 'user', content: 'brake pads for elf' }], userId: 'u1' };
const run = (llm, tools) => respond(input, {}, { llm, executeTool: tools, toolDeps: {} });

describe('SYSTEM_PROMPT', () => {
  it('tells the model to search first and to decline internal-data requests', () => {
    expect(SYSTEM_PROMPT).toMatch(/call search_parts FIRST/);
    expect(SYSTEM_PROMPT).toMatch(/Do not ask for brand, series or engine first/);
    expect(SYSTEM_PROMPT).toMatch(/NO access to costs, supplier info, margins/);
    expect(SYSTEM_PROMPT).toMatch(/do NOT offer to look it up/);
  });

  it('quotes prices only via priceDisplay, keeps replies short and hides stock minimums', () => {
    expect(SYSTEM_PROMPT).toMatch(/priceDisplay/);
    expect(SYSTEM_PROMPT).toMatch(/exactly as given|verbatim/i);
    expect(SYSTEM_PROMPT).toMatch(/1-3 short sentences/);
    expect(SYSTEM_PROMPT).toMatch(/cards? .*shown|shown .*cards?/i);
    expect(SYSTEM_PROMPT).toMatch(/do not list/i);
    expect(SYSTEM_PROMPT).toMatch(/minimum stock/i);
    expect(SYSTEM_PROMPT).toMatch(/stockStatus/);
  });

  it('stays compact for a small model', () => {
    expect(SYSTEM_PROMPT.length).toBeLessThan(1800);
  });
});

describe('per-turn wall-clock cap', () => {
  const hang = (signal) => new Promise((resolve) => { signal?.addEventListener('abort', () => resolve({ ok: false, error: 'aborted' })); });

  it('respond() returns the unavailable error and aborts the upstream call when the cap is exceeded', async () => {
    let seen;
    const llm = { chat: vi.fn(({ signal }) => { seen = signal; return hang(signal); }) };
    const out = await respond(input, {}, { llm, executeTool: vi.fn(), toolDeps: {}, turnMaxMs: 20 });
    expect(out).toEqual({ ok: false, error: 'assistant_unavailable' });
    expect(seen.aborted).toBe(true);
  });

  it('respond() still times out when the llm ignores the signal', async () => {
    const llm = { chat: vi.fn(() => new Promise(() => {})) };
    const out = await respond(input, {}, { llm, executeTool: vi.fn(), toolDeps: {}, turnMaxMs: 20 });
    expect(out).toEqual({ ok: false, error: 'assistant_unavailable' });
  });

  it('respond() aborts the upstream call when the caller signal fires', async () => {
    let seen;
    const llm = { chat: vi.fn(({ signal }) => { seen = signal; return hang(signal); }) };
    const ac = new AbortController();
    const pending = respond(input, { signal: ac.signal }, { llm, executeTool: vi.fn(), toolDeps: {} });
    await vi.waitFor(() => expect(llm.chat).toHaveBeenCalled());
    ac.abort();
    await pending;
    expect(seen.aborted).toBe(true);
  });

  it('respondStream() emits the friendly error event and aborts upstream on cap', async () => {
    let seen;
    const llm = { chatStream: vi.fn(({ signal }) => { seen = signal; return hang(signal); }) };
    const events = [];
    const out = await respondStream(input, { onEvent: (e) => events.push(e) }, { llm, executeTool: vi.fn(), toolDeps: {}, turnMaxMs: 20 });
    expect(out).toEqual({ ok: false });
    expect(events).toEqual([{ type: 'error', error: 'assistant_unavailable', text: expect.stringMatching(/unavailable/i) }]);
    expect(seen.aborted).toBe(true);
  });

  it('a client abort is still reported as aborted, not as an error', async () => {
    const ctl = new AbortController();
    const llm = { chatStream: vi.fn(({ signal }) => hang(signal)) };
    const events = [];
    const p = respondStream(input, { onEvent: (e) => events.push(e), signal: ctl.signal }, { llm, executeTool: vi.fn(), toolDeps: {}, turnMaxMs: 5000 });
    setTimeout(() => ctl.abort(), 10);
    expect(await p).toEqual({ ok: false, aborted: true });
    expect(events).toEqual([]);
  });

  it('reads LLM_TURN_MAX_MS from the environment', async () => {
    vi.stubEnv('LLM_TURN_MAX_MS', '20');
    const llm = { chat: vi.fn(() => new Promise(() => {})) };
    const out = await respond(input, {}, { llm, executeTool: vi.fn(), toolDeps: {} });
    vi.unstubAllEnvs();
    expect(out.ok).toBe(false);
  });
});

describe('ChatService.respond', () => {
  it('runs the tool loop, feeds results back and returns text', async () => {
    const llm = scripted(call('search_parts', { query: 'brake pad' }), say('Try BRK-1.'));
    const exec = vi.fn(async () => ({ parts: [part(1)] }));
    const out = await run(llm, exec);

    expect(exec).toHaveBeenCalledWith('search_parts', { query: 'brake pad' }, {});
    const second = llm.chat.mock.calls[1][0].messages;
    expect(second[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
    expect(second.at(-2).tool_calls[0].function.name).toBe('search_parts');
    expect(second.at(-1).role).toBe('tool');
    expect(llm.chat.mock.calls[0][0].tools).toBe(TOOL_DEFINITIONS);
    expect(out.ok).toBe(true);
    expect(out.content[0]).toEqual({ type: 'text', text: 'Try BRK-1.' });
    expect(out.content[1]).toMatchObject({ type: 'tool-call', toolName: 'show_part', args: { part: { sku: 'BRK-1', name: 'Brake Pad 1' } } });
  });

  it('stops after MAX_ROUNDS LLM calls and forces the last call to be tool-free', async () => {
    const llm = { chat: vi.fn(async ({ tools }) => (tools ? call('list_categories') : say('Final answer.'))) };
    const out = await run(llm, vi.fn(async () => ({ categories: [] })));
    expect(llm.chat).toHaveBeenCalledTimes(MAX_ROUNDS);
    expect(llm.chat.mock.calls.at(-1)[0].tools).toBeUndefined();
    expect(out.content[0].text).toBe('Final answer.');
  });

  it('stops even if the model keeps asking for tools on the last round', async () => {
    const llm = { chat: vi.fn(async () => call('list_categories')) };
    const exec = vi.fn(async () => ({ categories: [] }));
    const out = await run(llm, exec);
    expect(llm.chat).toHaveBeenCalledTimes(MAX_ROUNDS);
    expect(exec).toHaveBeenCalledTimes(MAX_ROUNDS - 1);
    expect(out.ok).toBe(true);
    expect(out.content).toHaveLength(1);
  });

  it('only cards parts that came from tool results (hallucinated sku/name dropped)', async () => {
    const llm = scripted(call('search_parts'), say('Get BRK-1, or the Ghost Rotor GHOST-9.'));
    const out = await run(llm, async () => ({ parts: [part(1)] }));
    const cards = out.content.filter((c) => c.type === 'tool-call');
    expect(cards.map((c) => c.args.part.sku)).toEqual(['BRK-1']);
  });

  it('emits no card when no tool returned parts, even if text names a part', async () => {
    const out = await run(scripted(say('We sell BRK-1 for 100.')), vi.fn());
    expect(out.content).toEqual([{ type: 'text', text: 'We sell BRK-1 for 100.' }]);
  });

  it('shows 1-3 tool parts when text mentions none, but not 4+', async () => {
    const three = await run(scripted(call('search_parts'), say('Here are some options.')), async () => ({ parts: [part(1), part(2), part(3)] }));
    expect(three.content.filter((c) => c.type === 'tool-call')).toHaveLength(3);
    const four = await run(scripted(call('search_parts'), say('Here are some options.')), async () => ({ parts: [part(1), part(2), part(3), part(4)] }));
    expect(four.content.filter((c) => c.type === 'tool-call')).toHaveLength(0);
  });

  it('caps mentioned cards at 3 and dedupes repeated parts', async () => {
    const parts = [part(1), part(2), part(3), part(4)];
    const out = await run(scripted(call('search_parts'), call('get_part'), say('BRK-1 BRK-2 BRK-3 BRK-4')), async () => ({ parts }));
    expect(out.content.filter((c) => c.type === 'tool-call')).toHaveLength(3);
  });

  it('handles get_part results and matches by name mention', async () => {
    const llm = scripted(call('get_part', { sku: 'BRK-2' }), say('The brake pad 2 is in stock.'));
    const out = await run(llm, async () => ({ part: part(2) }));
    expect(out.content[1].args.part.sku).toBe('BRK-2');
  });

  it('card part carries the fields the UI reads', async () => {
    const out = await run(scripted(call('search_parts'), say('BRK-1')), async () => ({ parts: [part(1)] }));
    expect(Object.keys(out.content[1].args.part)).toEqual(expect.arrayContaining(['id', 'name', 'sku', 'oem', 'price', 'stock', 'stockStatus', 'category']));
  });

  it('returns assistant_unavailable when the LLM fails (first or mid-loop)', async () => {
    expect(await run({ chat: async () => ({ ok: false, error: 'unavailable' }) }, vi.fn()))
      .toEqual({ ok: false, error: 'assistant_unavailable' });
    expect(await run(scripted(call('search_parts'), { ok: false, error: 'timeout' }), async () => ({ parts: [] })))
      .toEqual({ ok: false, error: 'assistant_unavailable' });
  });

  it('uses a fallback text when the model returns nothing', async () => {
    const out = await run(scripted(say('  ')), vi.fn());
    expect(out.content[0].text).toMatch(/couldn't/);
  });

  it('limits tool calls per round', async () => {
    const many = { ok: true, message: { content: '', toolCalls: Array.from({ length: 10 }, () => ({ name: 'list_categories', arguments: {} })) } };
    const exec = vi.fn(async () => ({ categories: [] }));
    await run(scripted(many, say('ok')), exec);
    expect(exec).toHaveBeenCalledTimes(3);
  });
});

describe('ChatService.respondStream', () => {
  const makeLlm = (...replies) => ({
    chatStream: vi.fn(async ({ onToken }) => {
      const r = replies.shift() ?? say('done');
      if (r.ok && r.stream) r.stream.forEach((t) => onToken(t));
      else if (r.ok && r.message.content) onToken(r.message.content);
      return r;
    }),
    chat: vi.fn()
  });
  const streamed = (chunks, toolCalls = []) => ({ ok: true, stream: chunks, message: { content: chunks.join(''), toolCalls } });
  const collect = async (llm, exec = vi.fn(async () => ({ parts: [] })), signal) => {
    const events = [];
    const out = await respondStream(input, { onEvent: (e) => events.push(e), signal }, { llm, executeTool: exec, toolDeps: {} });
    return { events, out };
  };

  it('emits text-delta*, part*, done in order and shares the card logic', async () => {
    const llm = makeLlm(call('search_parts'), streamed(['Try ', 'BRK-', '1.']));
    const { events, out } = await collect(llm, async () => ({ parts: [part(1)] }));
    expect(out).toEqual({ ok: true });
    expect(events.map((e) => e.type)).toEqual(['text-delta', 'text-delta', 'text-delta', 'part', 'done']);
    expect(events.filter((e) => e.type === 'text-delta').map((e) => e.text).join('')).toBe('Try BRK-1.');
    expect(events[3].part).toMatchObject({ type: 'tool-call', toolName: 'show_part', args: { part: { sku: 'BRK-1' } } });
    expect(llm.chat).not.toHaveBeenCalled();
  });

  it('matches respond() content for the same script', async () => {
    const script = () => [call('search_parts'), say('BRK-1 is great')];
    const exec = async () => ({ parts: [part(1), part(2)] });
    const json = await respond(input, {}, { llm: scripted(...script()), executeTool: exec, toolDeps: {} });
    const { events } = await collect(makeLlm(...script()), exec);
    const text = events.filter((e) => e.type === 'text-delta').map((e) => e.text).join('');
    const parts = events.filter((e) => e.type === 'part').map((e) => e.part);
    expect([{ type: 'text', text }, ...parts]).toEqual(json.content);
  });

  it('tool rounds never leak raw tool-call JSON as text', async () => {
    const rawJson = { ok: true, stream: ['{"name":"search_', 'parts","arguments":{}}'], message: { content: '{"name":"search_parts","arguments":{}}', toolCalls: [{ name: 'search_parts', arguments: {} }] } };
    const llm = makeLlm(rawJson, streamed(['Found it.']));
    const { events } = await collect(llm, async () => ({ parts: [] }));
    const text = events.filter((e) => e.type === 'text-delta').map((e) => e.text).join('');
    expect(text).toBe('Found it.');
    expect(JSON.stringify(events)).not.toContain('arguments');
  });

  it('releases held JSON-looking text when the round has no tool calls', async () => {
    const llm = makeLlm(streamed(['{', 'not a call}']));
    const { events } = await collect(llm);
    expect(events.filter((e) => e.type === 'text-delta').map((e) => e.text).join('')).toBe('{not a call}');
  });

  it('separates stray pre-tool text from the final answer', async () => {
    const llm = makeLlm(streamed(['Let me check.'], [{ name: 'search_parts', arguments: {} }]), streamed(['Done.']));
    const { events } = await collect(llm, async () => ({ parts: [] }));
    expect(events.filter((e) => e.type === 'text-delta').map((e) => e.text).join('')).toBe('Let me check.\n\nDone.');
  });

  it('streams the fallback text when the model returns nothing', async () => {
    const { events } = await collect(makeLlm(say('  ')));
    expect(events[0]).toMatchObject({ type: 'text-delta', text: expect.stringMatching(/couldn't/) });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits a single friendly error event when the LLM fails', async () => {
    const { events, out } = await collect(makeLlm({ ok: false, error: 'unavailable' }));
    expect(out).toEqual({ ok: false });
    expect(events).toEqual([{ type: 'error', error: 'assistant_unavailable', text: expect.stringContaining('unavailable right now') }]);
  });

  it('on abort emits nothing more, stops the loop and skips tools', async () => {
    const ac = new AbortController();
    const llm = { chatStream: vi.fn(async () => { ac.abort(); return { ok: false, error: 'aborted' }; }) };
    const exec = vi.fn();
    const { events, out } = await collect(llm, exec, ac.signal);
    expect(out).toEqual({ ok: false, aborted: true });
    expect(events).toEqual([]);
    expect(exec).not.toHaveBeenCalled();
    expect(llm.chatStream.mock.calls[0][0].signal.aborted).toBe(true); // upstream signal follows the client abort
  });

  it('aborting between tool calls stops before the next LLM round', async () => {
    const ac = new AbortController();
    const llm = makeLlm(call('search_parts'), streamed(['never']));
    const exec = vi.fn(async () => { ac.abort(); return { parts: [] }; });
    const { events } = await collect(llm, exec, ac.signal);
    expect(llm.chatStream).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
  });
});

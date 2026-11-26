import { describe, it, expect } from 'vitest';
import { toChatMessages, contentFromResponse, readNdjson, foldStreamEvent, initialStreamState, contentFromStreamState } from './chatTransport';

describe('toChatMessages', () => {
  it('flattens text parts, skips empty, keeps last 20, truncates to 2000', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: [{ type: 'text', text: `m${i}` }] }));
    msgs.push({ role: 'assistant', content: [{ type: 'tool-call', toolName: 'show_part' }] });
    msgs.push({ role: 'user', content: [{ type: 'text', text: 'x'.repeat(3000) }] });
    const out = toChatMessages(msgs);
    expect(out).toHaveLength(20);
    expect(out.at(-1).content).toHaveLength(2000);
    expect(out.some((m) => m.content === '')).toBe(false);
  });
});

describe('contentFromResponse', () => {
  it('drops unknown parts and falls back when nothing is renderable', () => {
    expect(contentFromResponse({ ok: true, status: 200, data: { content: [{ type: 'weird' }] } })[0].text).toMatch(/couldn't get an answer/);
    expect(contentFromResponse({ ok: false, status: 500, data: { content: [{ type: 'text', text: 'leak' }] } })[0].text).not.toBe('leak');
  });
});

describe('readNdjson', () => {
  const enc = new TextEncoder();
  const respFrom = (chunks) => ({ body: new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } }) });
  const collect = async (res) => { const out = []; for await (const e of readNdjson(res)) out.push(e); return out; };

  it('parses lines split across chunks, a final unterminated line, and skips corrupt lines', async () => {
    const out = await collect(respFrom(['{"type":"text-del', 'ta","text":"a"}\n{"type":"x"', '}\nnot json\n\n{"type":"done"}']));
    expect(out).toEqual([{ type: 'text-delta', text: 'a' }, { type: 'x' }, { type: 'done' }]);
  });

  it('cancels the underlying stream when the consumer stops early', async () => {
    let cancelled = false;
    const body = new ReadableStream({ start(c) { c.enqueue(enc.encode('{"type":"a"}\n')); }, cancel() { cancelled = true; } });
    for await (const e of readNdjson({ body })) { expect(e.type).toBe('a'); break; }
    expect(cancelled).toBe(true);
  });
});

describe('foldStreamEvent', () => {
  it('accumulates text, normalises cards, and marks done/error', () => {
    let s = initialStreamState();
    s = foldStreamEvent(s, { type: 'text-delta', text: 'Hel' });
    s = foldStreamEvent(s, { type: 'text-delta', text: 'lo' });
    s = foldStreamEvent(s, { type: 'part', part: { type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part: { id: '1', name: 'N', sku: 'S' } } } });
    s = foldStreamEvent(s, { type: 'junk' });
    expect(contentFromStreamState(s)).toEqual([
      { type: 'text', text: 'Hello' },
      expect.objectContaining({ type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', result: { shown: true } })
    ]);
    expect(foldStreamEvent(s, { type: 'done' }).finished).toBe(true);
    const err = foldStreamEvent(s, { type: 'error', text: 'Offline.' });
    expect(err).toMatchObject({ finished: true, failed: true, text: 'Hello\n\nOffline.' });
  });

  it('ignores unrenderable parts', () => {
    expect(foldStreamEvent(initialStreamState(), { type: 'part', part: { type: 'tool-call', toolName: 'other' } }).parts).toEqual([]);
  });
});

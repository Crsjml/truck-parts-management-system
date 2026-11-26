import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  THREAD_KEY_PREFIX,
  MAX_STORED_MESSAGES,
  threadKey,
  serializeMessages,
  parseStoredMessages,
  loadThread,
  saveThread,
  clearThread,
  clearAllThreads
} from '../chatThreadStorage';

const complete = { type: 'complete', reason: 'stop' };
const user = (text) => ({ role: 'user', content: [{ type: 'text', text }] });
const assistant = (text, extra = {}) => ({ role: 'assistant', status: complete, content: [{ type: 'text', text }], ...extra });
const partCall = { type: 'tool-call', toolCallId: 'c1', toolName: 'show_part', args: { part: { id: 'p1', name: 'Pad', price: 5 } }, result: undefined };

beforeEach(() => sessionStorage.clear());

describe('threadKey', () => {
  it('is scoped per user and null without a user id', () => {
    expect(threadKey('u1')).toBe(`${THREAD_KEY_PREFIX}u1`);
    expect(threadKey('u2')).not.toBe(threadKey('u1'));
    expect(threadKey('')).toBeNull();
    expect(threadKey(undefined)).toBeNull();
  });
});

describe('serializeMessages', () => {
  it('keeps text and show_part parts only, with plain fields', () => {
    const out = serializeMessages([user('hi'), assistant('found', { content: [{ type: 'text', text: 'found' }, partCall, { type: 'reasoning', text: 'x' }] })]);
    expect(out).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'found' }, { type: 'tool-call', toolCallId: 'c1', toolName: 'show_part', args: partCall.args }] }
    ]);
  });

  it('drops incomplete/running assistant messages and a trailing unanswered user message', () => {
    const running = assistant('par', { status: { type: 'running' } });
    expect(serializeMessages([user('a'), assistant('b'), user('c'), running])).toEqual(serializeMessages([user('a'), assistant('b')]));
    expect(serializeMessages([user('a'), assistant('b'), user('c')])).toHaveLength(2);
  });

  it('keeps only the last 20 messages and starts on a user message', () => {
    const many = [];
    for (let i = 0; i < 15; i += 1) many.push(user(`q${i}`), assistant(`a${i}`));
    const out = serializeMessages(many);
    expect(out.length).toBeLessThanOrEqual(MAX_STORED_MESSAGES);
    expect(out).toHaveLength(20);
    expect(out[0].role).toBe('user');
    expect(out.at(-1).content[0].text).toBe('a14');
  });

  it('does not mutate its input', () => {
    const input = [user('a'), assistant('b')];
    const snapshot = JSON.stringify(input);
    serializeMessages(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('returns [] for non-arrays', () => {
    expect(serializeMessages(null)).toEqual([]);
  });
});

describe('parseStoredMessages', () => {
  it('rejects corrupt JSON and wrong shapes', () => {
    expect(parseStoredMessages('{not json')).toEqual([]);
    expect(parseStoredMessages('{"a":1}')).toEqual([]);
    expect(parseStoredMessages(null)).toEqual([]);
    expect(parseStoredMessages(JSON.stringify([{ role: 'system', content: [] }]))).toEqual([]);
    expect(parseStoredMessages(JSON.stringify([{ role: 'user', content: 'str' }]))).toEqual([]);
    expect(parseStoredMessages(JSON.stringify([{ role: 'user', content: [{ type: 'text' }] }]))).toEqual([]);
    expect(parseStoredMessages(JSON.stringify([{ role: 'assistant', content: [{ type: 'tool-call', toolName: 'evil', args: {} }] }]))).toEqual([]);
  });

  it('restores messages, marking assistant ones complete, and trims a dangling tail', () => {
    const stored = JSON.stringify([...serializeMessages([user('a'), assistant('b')]), { role: 'user', content: [{ type: 'text', text: 'dangling' }] }]);
    const out = parseStoredMessages(stored);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ role: 'assistant', status: { type: 'complete', reason: 'stop' } });
  });

  it('caps at 20 on restore too', () => {
    const many = [];
    for (let i = 0; i < 30; i += 1) many.push({ role: 'user', content: [{ type: 'text', text: `q${i}` }] }, { role: 'assistant', content: [{ type: 'text', text: `a${i}` }] });
    expect(parseStoredMessages(JSON.stringify(many))).toHaveLength(20);
  });
});

describe('load/save/clear', () => {
  it('round-trips per user without leaking across users', () => {
    saveThread('u1', [user('a'), assistant('b')]);
    expect(loadThread('u1')).toHaveLength(2);
    expect(loadThread('u2')).toEqual([]);
    expect(sessionStorage.getItem(`${THREAD_KEY_PREFIX}u1`)).toBeTruthy();
  });

  it('does nothing without a user id', () => {
    saveThread(null, [user('a'), assistant('b')]);
    expect(sessionStorage.length).toBe(0);
    expect(loadThread(null)).toEqual([]);
  });

  it('saving an empty/unpersistable thread removes the entry', () => {
    saveThread('u1', [user('a'), assistant('b')]);
    saveThread('u1', []);
    expect(sessionStorage.getItem(threadKey('u1'))).toBeNull();
  });

  it('starts fresh on corrupt stored JSON', () => {
    sessionStorage.setItem(threadKey('u1'), '{{{');
    expect(loadThread('u1')).toEqual([]);
  });

  it('clearThread removes one user; clearAllThreads removes every thread key only', () => {
    saveThread('u1', [user('a'), assistant('b')]);
    saveThread('u2', [user('a'), assistant('b')]);
    sessionStorage.setItem('other', 'keep');
    clearThread('u1');
    expect(loadThread('u1')).toEqual([]);
    expect(loadThread('u2')).toHaveLength(2);
    clearAllThreads();
    expect(loadThread('u2')).toEqual([]);
    expect(sessionStorage.getItem('other')).toBe('keep');
  });

  it('never throws when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const spy2 = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(loadThread('u1')).toEqual([]);
    expect(() => saveThread('u1', [user('a'), assistant('b')])).not.toThrow();
    spy.mockRestore();
    spy2.mockRestore();
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const apiPost = vi.fn();
const apiStream = vi.fn();
vi.mock('../../api/apiClient', () => ({ apiPost: (...a) => apiPost(...a), apiStream: (...a) => apiStream(...a) }));
vi.mock('../../supabaseClient', () => ({ supabase: { tag: 'supabase' } }));
vi.mock('../ui/Drawer', () => ({ Drawer: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null) }));

import StorefrontChatbot from '../StorefrontChatbot';

const part = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Brake Pad Set',
  sku: 'BRK-1',
  oem: 'OEM-9',
  price: 123.5,
  stock: 3,
  stockStatus: 'low_stock',
  category: 'Brakes',
  image: ''
};
const reply = (content, extra = {}) => ({ ok: true, status: 200, data: { content }, ...extra });

const openChat = (onOpenPartDetail = vi.fn()) => {
  render(<StorefrontChatbot onOpenPartDetail={onOpenPartDetail} />);
  fireEvent.click(screen.getByText('Parts Assistant'));
  return onOpenPartDetail;
};
const send = async (msg) => {
  const input = screen.getByPlaceholderText(/ask for a part/i);
  fireEvent.change(input, { target: { value: msg } });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
};

// Controllable NDJSON stream response.
const enc = new TextEncoder();
const makeStream = ({ status = 200, contentType = 'application/x-ndjson' } = {}) => {
  let controller;
  let cancelled = false;
  const body = new ReadableStream({ start(c) { controller = c; }, cancel() { cancelled = true; } });
  return {
    response: { ok: status < 300, status, headers: { get: () => contentType }, body, json: async () => ({ content: [{ type: 'text', text: 'Slow down please.' }] }) },
    push: (event) => controller.enqueue(enc.encode(`${JSON.stringify(event)}\n`)),
    pushRaw: (str) => controller.enqueue(enc.encode(str)),
    close: () => controller.close(),
    error: (e) => controller.error(e),
    isCancelled: () => cancelled
  };
};

beforeEach(() => {
  apiPost.mockReset();
  apiStream.mockReset();
  apiStream.mockRejectedValue(new Error('stream down')); // default: legacy JSON tests exercise the fallback path
});

describe('StorefrontChatbot', () => {
  it('sends the full multi-turn history to /api/chat', async () => {
    apiPost.mockResolvedValueOnce(reply([{ type: 'text', text: 'First answer' }]));
    apiPost.mockResolvedValueOnce(reply([{ type: 'text', text: 'Second answer' }]));
    openChat();
    await send('air filter?');
    await screen.findByText('First answer');
    await send('for a Volvo');
    await screen.findByText('Second answer');

    expect(apiPost).toHaveBeenCalledTimes(2);
    const [url, body, opts] = apiPost.mock.calls[1];
    expect(url).toBe('/api/chat');
    expect(body.messages).toEqual([
      { role: 'user', content: 'air filter?' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'for a Volvo' }
    ]);
    expect(opts.supabase).toEqual({ tag: 'supabase' });
    expect(opts.timeoutMs).toBeGreaterThan(60000);
  });

  it('renders a part card with real fields and View details opens the part', async () => {
    apiPost.mockResolvedValueOnce(reply([
      { type: 'text', text: 'Found BRK-1.' },
      { type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part } }
    ]));
    const onOpen = openChat();
    await send('brake pads');
    const card = await screen.findByRole('button', { name: /view details.*brake pad set/i });
    expect(within(card).getByText('Brake Pad Set')).toBeInTheDocument();
    expect(card).toHaveTextContent('BRK-1');
    expect(card).toHaveTextContent('OEM-9');
    expect(card).toHaveTextContent('₱123.50');
    expect(card).toHaveTextContent(/low stock/i);
    expect(card).toHaveTextContent('Brakes');
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(part);
  });

  it('shows Out of Stock when available stock is 0', async () => {
    apiPost.mockResolvedValueOnce(reply([{ type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part: { ...part, stock: 0, stockStatus: 'out_of_stock' } } }]));
    openChat();
    await send('brake pads');
    expect(await screen.findByText(/out of stock/i)).toBeInTheDocument();
  });

  it('shows In Stock for in_stock and ignores any minStock field', async () => {
    apiPost.mockResolvedValueOnce(reply([{ type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part: { ...part, stock: 3, minStock: 99, stockStatus: 'in_stock' } } }]));
    openChat();
    await send('brake pads');
    const card = await screen.findByRole('button', { name: /view details/i });
    expect(card).toHaveTextContent(/in stock/i);
    expect(card).not.toHaveTextContent(/low stock/i);
  });

  it('shows the price in the storefront display currency without re-applying markup', async () => {
    const { SettingsContext } = await import('../../context/SettingsContext');
    const formatBaseCurrency = vi.fn((n) => `USD ${n.toFixed(2)}`);
    const formatCurrency = vi.fn(() => 'WRONG');
    apiPost.mockResolvedValueOnce(reply([{ type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part } }]));
    render(
      <SettingsContext.Provider value={{ formatBaseCurrency, formatCurrency }}>
        <StorefrontChatbot onOpenPartDetail={vi.fn()} />
      </SettingsContext.Provider>
    );
    fireEvent.click(screen.getByText('Parts Assistant'));
    await send('brake pads');
    const card = await screen.findByRole('button', { name: /view details/i });
    expect(card).toHaveTextContent('USD 123.50');
    expect(formatCurrency).not.toHaveBeenCalled();
  });

  it('renders the friendly content of a 503 and a 429', async () => {
    apiPost.mockResolvedValueOnce({ ok: false, status: 503, data: { content: [{ type: 'text', text: 'Assistant is offline.' }] } });
    apiPost.mockResolvedValueOnce({ ok: false, status: 429, data: { content: [{ type: 'text', text: 'Slow down please.' }] } });
    openChat();
    await send('hi');
    expect(await screen.findByText('Assistant is offline.')).toBeInTheDocument();
    await send('again');
    expect(await screen.findByText('Slow down please.')).toBeInTheDocument();
  });

  it('falls back to friendly text on 400/401 and on network errors', async () => {
    apiPost.mockResolvedValueOnce({ ok: false, status: 401, data: { msg: 'nope' } });
    apiPost.mockRejectedValueOnce(new Error('boom'));
    openChat();
    await send('hi');
    expect(await screen.findByText(/couldn't get an answer/i)).toBeInTheDocument();
    await send('hello');
    expect(await screen.findByText(/couldn't reach the assistant/i)).toBeInTheDocument();
  });

  it('renders model text as text, not HTML', async () => {
    apiPost.mockResolvedValueOnce(reply([{ type: 'text', text: '<img src=x onerror=alert(1)>' }]));
    const { container } = render(<div />);
    openChat();
    await send('x');
    await waitFor(() => expect(document.body.textContent).toContain('<img src=x'));
    expect(document.querySelector('img[src="x"]')).toBeNull();
    container.remove();
  });

  it('updates the header hint and leaves no mock data in the source', () => {
    openChat();
    expect(screen.getByText(/find parts, check stock, or ask how to order/i)).toBeInTheDocument();
    const src = fs.readFileSync(path.resolve(__dirname, '../StorefrontChatbot.jsx'), 'utf8');
    expect(src).not.toMatch(/mockPart|MOCK-1|simulate|mocking|dangerouslySetInnerHTML/);
  });
});

describe('StorefrontChatbot streaming', () => {
  it('renders tokens progressively, keeps Thinking until the first token, then shows the card at the end', async () => {
    const stream = makeStream();
    apiStream.mockResolvedValueOnce(stream.response);
    const onOpen = openChat();
    await send('brake pads');

    expect(await screen.findByText(/thinking/i)).toBeInTheDocument();
    stream.push({ type: 'text-delta', text: 'Found ' });
    await screen.findByText('Found');
    expect(screen.queryByText(/thinking/i)).toBeNull();
    stream.push({ type: 'text-delta', text: 'BRK-1.' });
    await screen.findByText('Found BRK-1.');
    expect(screen.queryByRole('button', { name: /view details/i })).toBeNull();

    stream.push({ type: 'part', part: { type: 'tool-call', toolName: 'show_part', toolCallId: 'c1', args: { part } } });
    stream.push({ type: 'done' });
    stream.close();
    const card = await screen.findByRole('button', { name: /view details.*brake pad set/i });
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(part);
    expect(apiPost).not.toHaveBeenCalled();

    const [url, body, opts] = apiStream.mock.calls[0];
    expect(url).toBe('/api/chat/stream');
    expect(body.messages).toEqual([{ role: 'user', content: 'brake pads' }]);
    expect(opts.supabase).toEqual({ tag: 'supabase' });
  });

  it('handles an event split across network chunks', async () => {
    const stream = makeStream();
    apiStream.mockResolvedValueOnce(stream.response);
    openChat();
    await send('hi');
    const line = `${JSON.stringify({ type: 'text-delta', text: 'Split reply' })}\n`;
    stream.pushRaw(line.slice(0, 10));
    stream.pushRaw(line.slice(10));
    stream.push({ type: 'done' });
    stream.close();
    expect(await screen.findByText('Split reply')).toBeInTheDocument();
  });

  it('passes the runtime abort signal to the stream and releases the reader when New Chat is clicked', async () => {
    const stream = makeStream();
    // like real fetch: aborting the signal errors the body read
    apiStream.mockImplementationOnce(async (_u, _b, { signal }) => {
      signal.addEventListener('abort', () => stream.error(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      return stream.response;
    });
    openChat();
    await send('hi');
    stream.push({ type: 'text-delta', text: 'Partial' });
    await screen.findByText('Partial');

    const signal = apiStream.mock.calls[0][2].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    await waitFor(() => expect(signal.aborted).toBe(true));
    await waitFor(() => expect(stream.response.body.locked).toBe(false));
    expect(apiPost).not.toHaveBeenCalled(); // an abort must not trigger the JSON fallback
  });

  it('falls back to POST /api/chat once when the stream fails before any token', async () => {
    apiStream.mockResolvedValueOnce(makeStream({ status: 404, contentType: 'text/html' }).response);
    apiPost.mockResolvedValueOnce(reply([{ type: 'text', text: 'From JSON' }]));
    openChat();
    await send('hi');
    expect(await screen.findByText('From JSON')).toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost.mock.calls[0][0]).toBe('/api/chat');
  });

  it('falls back to JSON when the stream ends before any event', async () => {
    const stream = makeStream();
    apiStream.mockResolvedValueOnce(stream.response);
    apiPost.mockResolvedValueOnce(reply([{ type: 'text', text: 'From JSON 2' }]));
    openChat();
    await send('hi');
    stream.close();
    expect(await screen.findByText('From JSON 2')).toBeInTheDocument();
  });

  it('keeps streamed text and notes the interruption when the stream dies mid-reply (no JSON retry)', async () => {
    const stream = makeStream();
    apiStream.mockResolvedValueOnce(stream.response);
    openChat();
    await send('hi');
    stream.push({ type: 'text-delta', text: 'Half an answ' });
    await screen.findByText('Half an answ');
    stream.close();
    expect(await screen.findByText(/reply was interrupted/i)).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('renders the friendly text of an error event without falling back', async () => {
    const stream = makeStream();
    apiStream.mockResolvedValueOnce(stream.response);
    openChat();
    await send('hi');
    stream.push({ type: 'error', error: 'assistant_unavailable', text: 'The assistant is offline right now.' });
    stream.close();
    expect(await screen.findByText('The assistant is offline right now.')).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('shows the friendly 429 text without retrying the JSON endpoint', async () => {
    apiStream.mockResolvedValueOnce(makeStream({ status: 429, contentType: 'application/json' }).response);
    openChat();
    await send('hi');
    expect(await screen.findByText('Slow down please.')).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });
});


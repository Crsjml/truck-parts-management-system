import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_DEFINITIONS, executeTool } from '../AssistantTools.js';
import { computeSellingPrice } from '../../utils/pricing.js';

const UUID = '3f2b8c1e-6d4a-4b7e-9a10-1c2d3e4f5a6b';

// Shape returned by PartsService.getParts (already includes internal fields).
const rawPart = (overrides = {}) => ({
  id: UUID,
  name: 'Brake Pad Set',
  sku: 'BRK-PRT-00001',
  oem: 'OEM-111',
  oemNumbers: ['OEM-111', 'OEM-222'],
  category: 'Brakes',
  category_id: 'cat-1',
  price: 1000, // supplier COST
  markupOverride: null,
  stock: 10,
  reservedStock: 3,
  minStock: 4,
  compatibility: 'Isuzu Elf',
  compatibleWith: [{ brand: 'Isuzu', series: 'ELF', engineCode: '4HK1', supplierId: 'leak' }],
  description: 'Heavy duty pads',
  image: 'http://img/1.png',
  published: true,
  archived: false,
  reviewStats: { averageRating: 4, totalReviews: 2 },
  supplier: 'ACME Supply',
  supplierId: 'sup-1',
  ...overrides
});

const FORBIDDEN = ['markupOverride', 'reservedStock', 'supplier', 'supplierId', 'cost', 'category_id', 'published', 'archived', 'minStock', 'min_stock'];

const makeDeps = (parts = [rawPart()], markup = 20) => ({
  partsService: { getParts: vi.fn().mockResolvedValue({ parts, totalCount: parts.length }) },
  partsRepository: {
    searchCustomerParts: vi.fn().mockResolvedValue(parts),
    findCategories: vi.fn().mockResolvedValue([{ name: 'Brakes' }, { name: 'Filters' }]),
    findCustomerPart: vi.fn()
  },
  getMarkup: vi.fn().mockResolvedValue(markup),
  getCurrency: vi.fn().mockResolvedValue('PHP')
});

const keysDeep = (value, acc = new Set()) => {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, acc));
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => { acc.add(k); keysDeep(v, acc); });
  }
  return acc;
};

describe('TOOL_DEFINITIONS', () => {
  it('declares the four function tools with descriptions', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.function.name);
    expect(names).toEqual(['search_parts', 'get_part', 'list_categories', 'site_help']);
    TOOL_DEFINITIONS.forEach((t) => {
      expect(t.type).toBe('function');
      expect(t.function.description.length).toBeGreaterThan(30);
      expect(t.function.parameters.type).toBe('object');
    });
  });
});

describe('search_parts', () => {
  let deps;
  beforeEach(() => { deps = makeDeps(); });

  it('tokenizes the query (stopwords, short tokens, plural stems) and folds filters in as tokens', async () => {
    await executeTool('search_parts', { query: 'Do you have brake linings for the Fuso Canter?', brand: 'Fuso', engineCode: '4HK1' }, deps);
    const arg = deps.partsRepository.searchCustomerParts.mock.calls[0][0];
    expect(arg.mode).toBe('all');
    expect(arg.tokens).toEqual(['brake', 'lining', 'fuso', 'canter', '4hk1']);
    expect(arg.limit).toBeGreaterThanOrEqual(5);
  });

  it('retries as an OR search ranked by matched tokens when AND finds nothing', async () => {
    const a = rawPart({ id: 'a', name: 'Canter Clutch', sku: 'C-1', compatibility: 'Fuso Canter', description: '' });
    const b = rawPart({ id: 'b', name: 'Brake Lining Canter', sku: 'B-1', compatibility: 'Fuso Canter', description: '' });
    deps.partsRepository.searchCustomerParts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([a, b]);
    const res = await executeTool('search_parts', { query: 'brake lining canter' }, deps);
    const calls = deps.partsRepository.searchCustomerParts.mock.calls;
    expect(calls[0][0].mode).toBe('all');
    expect(calls[1][0].mode).toBe('any');
    expect(res.parts.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('does not retry for a single token or when AND has results', async () => {
    await executeTool('search_parts', { query: 'brake' }, deps);
    expect(deps.partsRepository.searchCustomerParts).toHaveBeenCalledTimes(1);
    deps.partsRepository.searchCustomerParts.mockClear().mockResolvedValue([]);
    await executeTool('search_parts', { query: 'xyzzy' }, deps);
    expect(deps.partsRepository.searchCustomerParts).toHaveBeenCalledTimes(1);
  });

  it('caps the tokens sent to the repository at 8 (query plus filters, after dedupe)', async () => {
    const query = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima alpha';
    await executeTool('search_parts', { query, brand: 'mike', engineCode: 'november' }, deps);
    const { tokens } = deps.partsRepository.searchCustomerParts.mock.calls[0][0];
    expect(tokens).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel']);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('returns no parts (without querying) when the query is only stopwords', async () => {
    const res = await executeTool('search_parts', { query: 'do you have any' }, deps);
    expect(res.parts).toEqual([]);
    expect(deps.partsRepository.searchCustomerParts).not.toHaveBeenCalled();
  });

  it('prices at the storefront selling price using the global markup', async () => {
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts[0].price).toBe(computeSellingPrice(1000, 20));
    expect(res.parts[0].price).toBe(1200);
  });

  it('uses markupOverride (including 0) over the global markup', async () => {
    deps = makeDeps([rawPart({ markupOverride: 50 }), rawPart({ id: 'b', markupOverride: 0 })]);
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts[0].price).toBe(1500);
    expect(res.parts[1].price).toBe(1000);
  });

  it('computes available stock as stock - reservedStock, never below 0', async () => {
    deps = makeDeps([rawPart(), rawPart({ id: 'b', stock: 2, reservedStock: 5 })]);
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts[0].stock).toBe(7);
    expect(res.parts[1].stock).toBe(0);
  });

  it('never returns unpublished or archived parts even if the service leaks them', async () => {
    deps = makeDeps([
      rawPart({ id: 'draft', published: false }),
      rawPart({ id: 'old', archived: true }),
      rawPart({ id: 'ok' })
    ]);
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts.map((p) => p.id)).toEqual(['ok']);
  });

  it('omits cost, supplier, markup and reserved fields at any depth', async () => {
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    const keys = keysDeep(res);
    FORBIDDEN.forEach((k) => expect(keys.has(k)).toBe(false));
    expect(JSON.stringify(res)).not.toContain('ACME');
    expect(JSON.stringify(res)).not.toContain('leak');
  });

  it('exposes the documented safe fields', async () => {
    const [p] = (await executeTool('search_parts', { query: 'brake' }, deps)).parts;
    expect(Object.keys(p).sort()).toEqual([
      'category', 'compatibility', 'compatibleWith', 'description', 'id', 'image',
      'name', 'oem', 'oemNumbers', 'price', 'priceDisplay', 'sku', 'stock', 'stockStatus'
    ]);
  });

  it('preformats the price in the store currency from the already-marked-up price', async () => {
    deps = makeDeps([rawPart({ price: 5504.39 })], 20); // 5504.39 * 1.2 = 6605.27
    const [p] = (await executeTool('search_parts', { query: 'brake' }, deps)).parts;
    expect(p.price).toBe(6605.27);
    expect(p.priceDisplay).toBe('₱6,605.27');
  });

  it('formats priceDisplay with the store base currency setting', async () => {
    deps.getCurrency.mockResolvedValue('USD');
    const [p] = (await executeTool('search_parts', { query: 'brake' }, deps)).parts;
    expect(p.priceDisplay).toMatch(/1,200\.00$/);
    expect(p.priceDisplay).not.toContain('₱');
  });

  it('derives stockStatus server-side from available vs minimum stock', async () => {
    deps = makeDeps([
      rawPart({ id: 'in', stock: 20, reservedStock: 0, minStock: 4 }),
      rawPart({ id: 'low', stock: 5, reservedStock: 1, minStock: 4 }),
      rawPart({ id: 'out', stock: 2, reservedStock: 2, minStock: 4 })
    ]);
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts.map((p) => p.stockStatus)).toEqual(['in_stock', 'low_stock', 'out_of_stock']);
    expect(JSON.stringify(res)).not.toMatch(/minStock|min_stock/);
  });

  it('caps results at 5', async () => {
    const many = Array.from({ length: 12 }, (_, i) => rawPart({ id: `p${i}` }));
    deps = makeDeps(many);
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res.parts).toHaveLength(5);
  });

  it('truncates long descriptions', async () => {
    deps = makeDeps([rawPart({ description: 'x'.repeat(1000) })]);
    const [p] = (await executeTool('search_parts', { query: 'brake' }, deps)).parts;
    expect(p.description.length).toBeLessThanOrEqual(201);
  });

  it('returns a JSON-serializable error object for invalid args', async () => {
    for (const args of [{}, { query: '' }, { query: 123 }, { query: 'x'.repeat(500) }, null, 'str']) {
      const res = await executeTool('search_parts', args, deps);
      expect(res).toEqual({ error: expect.any(String) });
    }
    expect(deps.partsRepository.searchCustomerParts).not.toHaveBeenCalled();
  });

  // Small local models invent wrapper keys (e.g. `filters: {}`); rejecting the
  // whole call made the assistant apologize instead of searching.
  it('ignores unknown argument keys instead of rejecting the call', async () => {
    const res = await executeTool('search_parts', { query: 'brake', filters: {}, sort: 'price' }, deps);
    expect(res.error).toBeUndefined();
    expect(res.parts).toHaveLength(1);
    expect(deps.partsRepository.searchCustomerParts.mock.calls[0][0].tokens).toEqual(['brake']);
  });

  it('lifts known filter fields nested under "filters" to the top level', async () => {
    await executeTool('search_parts', { query: 'brake', filters: { brand: 'Isuzu', bogus: 'x' } }, deps);
    expect(deps.partsRepository.searchCustomerParts.mock.calls[0][0].tokens).toEqual(['brake', 'isuzu']);
  });

  it('turns a service failure into a generic error without leaking details', async () => {
    deps.partsRepository.searchCustomerParts.mockRejectedValue(new Error('connect ECONNREFUSED db.secret:5432'));
    const res = await executeTool('search_parts', { query: 'brake' }, deps);
    expect(res).toEqual({ error: expect.any(String) });
    expect(JSON.stringify(res)).not.toContain('secret');
  });
});

describe('get_part', () => {
  it('looks up by id and returns the safe projection', async () => {
    const deps = makeDeps();
    deps.partsRepository.findCustomerPart.mockResolvedValue({
      ...rawPart(), category: { name: 'Brakes' }, categoryId: 'cat-1', min_stock: 4
    });
    const res = await executeTool('get_part', { id: UUID }, deps);
    expect(deps.partsRepository.findCustomerPart).toHaveBeenCalledWith({ id: UUID });
    expect(res.part).toMatchObject({ id: UUID, category: 'Brakes', price: 1200, stock: 7, stockStatus: 'in_stock' });
    FORBIDDEN.forEach((k) => expect(keysDeep(res).has(k)).toBe(false));
  });

  it('looks up by sku', async () => {
    const deps = makeDeps();
    deps.partsRepository.findCustomerPart.mockResolvedValue(null);
    const res = await executeTool('get_part', { sku: 'BRK-PRT-00001' }, deps);
    expect(deps.partsRepository.findCustomerPart).toHaveBeenCalledWith({ sku: 'BRK-PRT-00001' });
    expect(res).toEqual({ error: expect.stringMatching(/not found/i) });
  });

  it('refuses unpublished or archived parts as not found', async () => {
    const deps = makeDeps();
    deps.partsRepository.findCustomerPart.mockResolvedValue({ ...rawPart({ published: false }), category: { name: 'Brakes' } });
    expect(await executeTool('get_part', { id: UUID }, deps)).toEqual({ error: expect.stringMatching(/not found/i) });
    deps.partsRepository.findCustomerPart.mockResolvedValue({ ...rawPart({ archived: true }), category: { name: 'Brakes' } });
    expect(await executeTool('get_part', { sku: 'S' }, deps)).toEqual({ error: expect.stringMatching(/not found/i) });
  });

  it('rejects missing or malformed identifiers', async () => {
    const deps = makeDeps();
    expect(await executeTool('get_part', {}, deps)).toEqual({ error: expect.any(String) });
    expect(await executeTool('get_part', { id: 'not-a-uuid' }, deps)).toEqual({ error: expect.any(String) });
    expect(deps.partsRepository.findCustomerPart).not.toHaveBeenCalled();
  });
});

describe('list_categories', () => {
  it('returns category names only', async () => {
    const deps = makeDeps();
    deps.partsRepository.findCategories.mockResolvedValue([{ name: 'Brakes', id: 'x' }, { name: 'Filters', id: 'y' }]);
    expect(await executeTool('list_categories', {}, deps)).toEqual({ categories: ['Brakes', 'Filters'] });
  });
});

describe('site_help', () => {
  const topics = ['ordering', 'payment', 'saved_parts', 'order_tracking', 'account', 'returns', 'contact'];

  it.each(topics)('answers the %s topic', async (topic) => {
    const res = await executeTool('site_help', { topic }, makeDeps());
    expect(res).toEqual({ topic, answer: expect.any(String) });
    expect(res.answer.length).toBeGreaterThan(20);
  });

  it('falls back to contact guidance for unknown free-text topics', async () => {
    const res = await executeTool('site_help', { topic: 'bulk fleet discounts' }, makeDeps());
    expect(res.answer).toMatch(/contact/i);
  });

  it('rejects a missing topic', async () => {
    expect(await executeTool('site_help', {}, makeDeps())).toEqual({ error: expect.any(String) });
  });
});

describe('executeTool', () => {
  it('returns an error object for unknown tools', async () => {
    expect(await executeTool('drop_tables', {}, makeDeps())).toEqual({ error: expect.stringMatching(/unknown tool/i) });
    expect(await executeTool('constructor', {}, makeDeps())).toEqual({ error: expect.stringMatching(/unknown tool/i) });
  });

  it('never throws, even with no deps', async () => {
    await expect(executeTool('list_categories', {}, undefined)).resolves.toEqual({ error: expect.any(String) });
    await expect(executeTool(undefined, undefined, undefined)).resolves.toEqual({ error: expect.any(String) });
  });
});

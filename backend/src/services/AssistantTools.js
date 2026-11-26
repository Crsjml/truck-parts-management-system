// Read-only, customer-safe tools for the Parts Assistant. The LLM only ever sees
// what these functions return, so every part goes through toCustomerPart(), an
// allow-list projection (never a deny-list). executeTool() never throws.

import { z } from 'zod';
import { sellingPriceForPart } from '../utils/pricing.js';

const MAX_RESULTS = 5;
const FETCH_LIMIT = 25; // over-fetch, then re-filter and cap
const MIN_TOKEN_LENGTH = 2;
const MAX_TOKENS = 8; // bound the repository query fan-out (each token is an AND/OR clause)
const DEFAULT_CURRENCY = 'PHP';

// Words that carry no search meaning in a customer question.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'of', 'in', 'on', 'at', 'to', 'with', 'and', 'or', 'my', 'me', 'we', 'you', 'your', 'our', 'it', 'its',
  'do', 'does', 'did', 'have', 'has', 'had', 'got', 'any', 'some', 'is', 'are', 'was', 'be', 'there', 'can', 'could', 'would',
  'how', 'much', 'many', 'what', 'whats', 'which', 'need', 'needs', 'want', 'looking', 'look', 'find', 'show', 'get', 'buy',
  'sell', 'selling', 'please', 'pls', 'price', 'prices', 'cost', 'costs', 'stock', 'available', 'part', 'parts', 'item', 'items',
  'i', 'im', 'ill', 'this', 'that', 'than', 'then', 'yes', 'no'
]);
const MAX_DESCRIPTION = 200;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'search_parts',
      description:
        'Search the truck parts catalogue. Use this whenever the customer asks for a part, a part number (SKU or OEM), or parts for a truck. ' +
        'Put the main keyword(s) in "query" (part name, SKU or OEM number, e.g. "brake pad"). Pass category, brand, series or engineCode as separate top-level arguments, only when the customer named them. ' +
        'Returns up to 5 parts with priceDisplay (the price text to quote) and stockStatus. Never invent parts; only mention parts returned here.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Part name, SKU, or OEM number, e.g. "oil filter".' },
          category: { type: 'string', description: 'Optional category name, e.g. "Brakes". Use list_categories to see valid names.' },
          brand: { type: 'string', description: 'Optional truck brand, e.g. "Isuzu", "Hino", "Fuso".' },
          series: { type: 'string', description: 'Optional truck series/model, e.g. "ELF", "Ranger".' },
          engineCode: { type: 'string', description: 'Optional engine code, e.g. "4HK1".' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_part',
      description:
        'Get full details (price, available stock, compatibility) for ONE specific part. Provide either "id" (from an earlier search result) or "sku". ' +
        'Use this to confirm details before recommending a part.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Part id (UUID) returned by search_parts.' },
          sku: { type: 'string', description: 'Part SKU, e.g. "BRK-PRT-00001".' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'List all part category names in the store. Use when the customer asks what kinds of parts are sold or you need a valid category filter.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'site_help',
      description:
        'Answer questions about using the website and the store (not about specific parts). ' +
        'Topics: ordering (cart and checkout), payment, saved_parts, order_tracking (My Purchases), account (sign in, register, profile), returns (return policy), contact (address, phone, hours).',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['ordering', 'payment', 'saved_parts', 'order_tracking', 'account', 'returns', 'contact'],
            description: 'The help topic.'
          }
        },
        required: ['topic']
      }
    }
  }
];

// ---------------------------------------------------------------------------
// Customer-safe projection
// ---------------------------------------------------------------------------

const pickCompat = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const out = {};
  for (const key of ['brand', 'series', 'model', 'engineCode', 'year', 'yearFrom', 'yearTo']) {
    if (typeof entry[key] === 'string' || typeof entry[key] === 'number') out[key] = entry[key];
  }
  return Object.keys(out).length ? out : null;
};

const shorten = (text) => {
  const s = typeof text === 'string' ? text.trim() : '';
  return s.length > MAX_DESCRIPTION ? `${s.slice(0, MAX_DESCRIPTION)}…` : s;
};

const formatPrice = (amount, currency) => {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: DEFAULT_CURRENCY, minimumFractionDigits: 2 }).format(amount);
  }
};

const stockStatusFor = (available, minStock) => {
  if (available <= 0) return 'out_of_stock';
  return available <= minStock ? 'low_stock' : 'in_stock';
};

// Lowercase alphanumeric tokens, stopwords/short tokens dropped, simple plural stem.
export const tokenize = (text) => {
  const seen = new Set();
  for (const raw of String(text ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < MIN_TOKEN_LENGTH || STOPWORDS.has(raw)) continue;
    const token = raw.length > 3 && raw.endsWith('s') && !raw.endsWith('ss') ? raw.slice(0, -1) : raw;
    if (!STOPWORDS.has(token)) seen.add(token);
  }
  return [...seen];
};

export const isCustomerVisible = (part) => part?.published === true && part?.archived === false;

export function toCustomerPart(part, globalMarkup, currency = DEFAULT_CURRENCY) {
  const categoryName = typeof part.category === 'string' ? part.category : part.category?.name;
  const price = sellingPriceForPart(part, globalMarkup);
  const stock = Math.max(0, (Number(part.stock) || 0) - (Number(part.reservedStock) || 0));
  const minStock = Number(part.minStock ?? part.min_stock) || 0; // internal: only used to derive stockStatus
  return {
    id: part.id,
    name: part.name,
    sku: part.sku,
    oem: part.oem || '',
    oemNumbers: Array.isArray(part.oemNumbers) ? part.oemNumbers.filter((n) => typeof n === 'string') : [],
    category: categoryName || 'Uncategorized',
    price,
    priceDisplay: formatPrice(price, currency),
    stock,
    stockStatus: stockStatusFor(stock, minStock),
    compatibility: typeof part.compatibility === 'string' ? part.compatibility : '',
    compatibleWith: (Array.isArray(part.compatibleWith) ? part.compatibleWith : []).map(pickCompat).filter(Boolean),
    description: shorten(part.description),
    image: typeof part.image === 'string' ? part.image : ''
  };
}

// ---------------------------------------------------------------------------
// Static FAQ (based on what CustomerStorefront and its components provide)
// ---------------------------------------------------------------------------

const CONTACT_TEXT =
  'Tarlac Truck Pitstop, McArthur Highway, Tarlac City 2300. Phone +63 917 123 4567, email wholesale@tarlactruckparts.local. ' +
  'Open Monday to Saturday, 8:00 AM to 5:00 PM, closed Sunday.';

const FAQ = {
  ordering:
    'Browse the Catalog tab, open a part, and add it to your cart (cart icon in the top bar). Quantity cannot exceed available stock. ' +
    'Press Checkout in the cart; you must be signed in first. Checkout continues on a secure online payment page, and after paying you are taken to your purchases.',
  payment:
    'Payment is taken on the secure online checkout page after you press Checkout in the cart. Prices shown include the store markup and are in the store currency. ' +
    'For other payment arrangements, please contact the store: ' + CONTACT_TEXT,
  saved_parts:
    'Saving parts for later is not available on the site yet. Your cart is kept while you browse, even if you sign out. ' +
    'For anything else, please contact the store.',
  order_tracking:
    'Open the account menu (top right) and choose My Purchases. Orders are grouped as Order Placed, Ready for Pickup, and Completed, and you can download an invoice PDF for past orders.',
  account:
    'Use Sign In or Register in the top right of the store. Once signed in, the account menu has My Purchases and My Profile, where you can manage your details. You can sign out from the same menu.',
  returns:
    'Unused, uninstalled, undamaged items can be returned within 30 days in original packaging. Parts have a 90-day fitment guarantee if they do not fit the vehicle specified in the catalog. ' +
    'Electrical components (sensors, ECMs, relays) are non-refundable once unsealed, special-order parts cannot be returned, and a 15% restocking fee applies to returns not caused by the store. ' +
    'For return authorization, email wholesale@tarlactruckparts.local.',
  contact: CONTACT_TEXT
};

const ALIASES = [
  ['saved_parts', /sav(e|ed)|wish|favou?rite|heart/],
  ['order_tracking', /track|status|my_?(orders|purchases)|invoice|pickup|pick_up|receipt/],
  ['returns', /return|refund|warranty|exchange|guarantee/],
  ['payment', /pay|card|stripe|price|vat|currency/],
  ['ordering', /order|cart|checkout|buy|purchase/],
  ['account', /account|login|log_?in|sign|regist|profile|password/],
  ['contact', /contact|phone|address|hours|email|location|open|call/]
];

const resolveTopic = (raw) => {
  const key = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (Object.hasOwn(FAQ, key)) return key;
  return ALIASES.find(([, re]) => re.test(key))?.[0] ?? null;
};

const siteHelp = ({ topic }) => {
  const resolved = resolveTopic(topic);
  if (resolved) return { topic: resolved, answer: FAQ[resolved] };
  return { topic: 'contact', answer: `I do not have specific information on that. Please contact the store. ${CONTACT_TEXT}` };
};

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

const optionalText = z.string().trim().min(1).max(100).optional();

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Small local models sometimes wrap optional fields in an invented `filters`
// object. Lift them to the top level (explicit top-level values win).
const liftFilters = (args) =>
  isPlainObject(args) && isPlainObject(args.filters) ? { ...args.filters, ...args } : args;

// Schemas strip unknown keys rather than reject them: one invented key must not
// fail the whole call (the model then apologizes instead of answering).
const SCHEMAS = {
  search_parts: z.preprocess(liftFilters, z.object({
    query: z.string().trim().min(1).max(200),
    category: optionalText,
    brand: optionalText,
    series: optionalText,
    engineCode: optionalText
  })),
  get_part: z.object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(1).max(100).optional()
  }).refine((v) => v.id || v.sku, { message: 'Provide either id or sku.' }),
  list_categories: z.object({}).passthrough(),
  site_help: z.object({ topic: z.string().trim().min(1).max(100) })
};

const searchText = (part) => [
  part.name, part.sku, part.oem, ...(Array.isArray(part.oemNumbers) ? part.oemNumbers : []),
  part.compatibility, part.description, typeof part.category === 'string' ? part.category : part.category?.name
].filter((v) => typeof v === 'string').join(' ').toLowerCase();

// Stable sort: more matched tokens first.
const rankByTokenMatches = (parts, tokens) =>
  parts
    .map((part, index) => {
      const text = searchText(part);
      return { part, index, score: tokens.filter((t) => text.includes(t)).length };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.part);

const getCurrency = async (deps) => (await deps.getCurrency?.()) || DEFAULT_CURRENCY;

const HANDLERS = {
  async search_parts(args, deps) {
    const { query, category, brand, series, engineCode } = args;
    // Filters are folded in as extra AND tokens (brand/series/engine live in compatibility text).
    const tokens = tokenize([query, category, brand, series, engineCode].filter(Boolean).join(' ')).slice(0, MAX_TOKENS);
    if (tokens.length === 0) return { parts: [] };
    const repo = deps.partsRepository;
    let rows = (await repo.searchCustomerParts({ tokens, mode: 'all', limit: FETCH_LIMIT })).filter(isCustomerVisible);
    if (rows.length === 0 && tokens.length >= 2) {
      const partial = (await repo.searchCustomerParts({ tokens, mode: 'any', limit: FETCH_LIMIT })).filter(isCustomerVisible);
      rows = rankByTokenMatches(partial, tokens);
    }
    const [markup, currency] = await Promise.all([deps.getMarkup(), getCurrency(deps)]);
    return { parts: rows.slice(0, MAX_RESULTS).map((p) => toCustomerPart(p, markup, currency)) };
  },

  async get_part(args, deps) {
    const part = await deps.partsRepository.findCustomerPart(args.id ? { id: args.id } : { sku: args.sku });
    if (!isCustomerVisible(part)) return { error: 'Part not found.' };
    return { part: toCustomerPart(part, await deps.getMarkup(), await getCurrency(deps)) };
  },

  async list_categories(_args, deps) {
    const rows = await deps.partsRepository.findCategories({ select: { name: true }, orderBy: { name: 'asc' } });
    return { categories: rows.map((c) => c.name) };
  },

  async site_help(args) {
    return siteHelp(args);
  }
};

/**
 * deps: { partsRepository: {searchCustomerParts, findCategories, findCustomerPart}, getMarkup: () => Promise<number>, getCurrency?: () => Promise<string> }
 * Always resolves to a JSON-serializable object; failures become { error }.
 */
export async function executeTool(name, args, deps) {
  if (typeof name !== 'string' || !Object.hasOwn(HANDLERS, name)) return { error: `Unknown tool: ${String(name).slice(0, 60)}` };
  const parsed = SCHEMAS[name].safeParse(args ?? {});
  if (!parsed.success || args === null || typeof args !== 'object' || Array.isArray(args)) {
    return { error: `Invalid arguments for ${name}: ${parsed.success ? 'expected an object' : parsed.error.issues.map((i) => i.message).join('; ').slice(0, 200)}` };
  }
  if (!deps) return { error: 'Assistant tools are not configured.' };
  try {
    return await HANDLERS[name](parsed.data, deps);
  } catch (err) {
    console.error(`[assistant-tools] ${name} failed:`, err?.message);
    return { error: 'The catalogue is temporarily unavailable. Please try again.' };
  }
}

/** Production wiring (lazy so unit tests never load Prisma). */
export async function createDefaultDeps() {
  const [{ partsService }, { partsRepository }, { prisma }] = await Promise.all([
    import('./PartsService.js'),
    import('../repositories/PartsRepository.js'),
    import('../config/prisma.js')
  ]);
  return {
    partsService,
    partsRepository,
    getMarkup: async () => (await prisma.setting.findFirst())?.active_markup || 0,
    getCurrency: async () => (await prisma.setting.findFirst())?.base_currency || DEFAULT_CURRENCY
  };
}

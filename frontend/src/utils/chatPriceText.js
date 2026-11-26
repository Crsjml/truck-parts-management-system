// Rewrites the backend-formatted price strings in assistant text into the viewer's display currency.
// Prices of base-currency amounts with no card are converted too (see localizePriceText).
// part.price is already the selling price (markup applied server-side): only convert, never re-apply markup.

const isUsable = (part) =>
  part && typeof part.priceDisplay === 'string' && part.priceDisplay !== '' && Number.isFinite(Number(part.price)) && part.price !== null && part.price !== '';

export function showPartParts(content) {
  if (!Array.isArray(content)) return [];
  return content
    .filter((c) => c?.type === 'tool-call' && c.toolName === 'show_part' && c.args?.part)
    .map((c) => c.args.part);
}

const DEFAULT_BASE_CURRENCY = 'PHP';
// Digits with optional "," thousands groups and optional decimals; allows a normal or non-breaking space after the marker.
const AMOUNT = '[ \\u00A0]?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)';
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function currencySymbol(code) {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: code }).formatToParts(0).find((x) => x.type === 'currency')?.value || '';
  } catch {
    return '';
  }
}

// Matches "<symbol|ISO code><amount>"; the ISO code must be a standalone token (not inside a word or SKU).
function baseAmountSource(baseCurrency) {
  const code = String(baseCurrency).toUpperCase();
  const symbol = currencySymbol(code);
  const markers = [escapeRegExp(code).replace(/^/, '(?<![A-Za-z0-9_])')];
  if (symbol && symbol !== code) markers.unshift(escapeRegExp(symbol));
  return `(?:${markers.join('|')})${AMOUNT}`;
}

/**
 * Rewrites base-currency prices in assistant text into the display currency.
 * Carded parts: exact `priceDisplay` literals map to `part.price`. Everything else written with the base
 * currency symbol or ISO code is parsed and converted. Both happen in ONE regex pass over the original text.
 * Without `displayCurrency` only the carded replacement runs. No markup is applied. Returns the input unchanged when display === base, and on any error.
 * @param {string} text
 * @param {Array<{price:number, priceDisplay:string}>} parts show_part parts of the same message
 * @param {(amount:number)=>string} format base -> display currency formatter (formatBaseCurrency)
 * @param {{baseCurrency?:string, displayCurrency?:string}} [options]
 * @returns {string}
 */
export function localizePriceText(text, parts, format, options = {}) {
  const source = typeof text === 'string' ? text : '';
  const { baseCurrency = DEFAULT_BASE_CURRENCY, displayCurrency } = options || {};
  if (!source || displayCurrency === baseCurrency) return source;
  try {
    const byDisplay = new Map();
    for (const part of Array.isArray(parts) ? parts : []) {
      if (isUsable(part) && !byDisplay.has(part.priceDisplay)) byDisplay.set(part.priceDisplay, Number(part.price));
    }
    const literals = [...byDisplay.keys()].filter((d) => source.includes(d)).sort((a, b) => b.length - a.length);
    const literalAlt = literals.map((d) => `(${escapeRegExp(d)})`);
    // The base-currency fallback needs to know the display currency; legacy callers without it get carded replacement only.
    const fallback = displayCurrency ? [baseAmountSource(baseCurrency)] : [];
    if (literalAlt.length + fallback.length === 0) return source;
    const pattern = new RegExp([...literalAlt, ...fallback].join('|'), 'g');
    return source.replace(pattern, (match, ...groups) => {
      const literal = literals.length ? groups.slice(0, literals.length).find(Boolean) : undefined;
      if (literal !== undefined) return String(format(byDisplay.get(literal)));
      const amount = groups[literals.length];
      return String(format(Number(amount.replace(/,/g, ''))));
    });
  } catch {
    return source;
  }
}

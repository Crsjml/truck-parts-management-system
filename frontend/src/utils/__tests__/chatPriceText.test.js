import { describe, it, expect } from 'vitest';
import { localizePriceText, showPartParts } from '../chatPriceText';

const fmt = (n) => `USD ${Number(n).toFixed(2)}`;
const p = (price, priceDisplay) => ({ price, priceDisplay });

describe('localizePriceText', () => {
  it('replaces a single part price', () => {
    expect(localizePriceText('It costs ₱1,234.00 today', [p(1234, '₱1,234.00')], fmt)).toBe('It costs USD 1234.00 today');
  });
  it('replaces every occurrence, across multiple parts', () => {
    const parts = [p(100, '₱100.00'), p(200, '₱200.00')];
    expect(localizePriceText('A ₱100.00, B ₱200.00, again ₱100.00', parts, fmt)).toBe('A USD 100.00, B USD 200.00, again USD 100.00');
  });
  it('handles longer strings first so overlapping prices are not partially replaced', () => {
    const parts = [p(234, '₱234.00'), p(1234, '₱1,234.00')];
    expect(localizePriceText('₱1,234.00 and ₱234.00', parts, fmt)).toBe('USD 1234.00 and USD 234.00');
  });
  it('dedupes identical priceDisplay values', () => {
    const parts = [p(5, '₱5.00'), p(5, '₱5.00')];
    expect(localizePriceText('₱5.00', parts, fmt)).toBe('USD 5.00');
  });
  it('does not re-replace text produced by the formatter', () => {
    const parts = [p(5, '₱5.00'), p(9, 'USD 5.00')];
    expect(localizePriceText('₱5.00', parts, fmt)).toBe('USD 5.00');
  });
  it('returns text unchanged with no match or no parts', () => {
    expect(localizePriceText('no prices', [p(1, '₱1.00')], fmt)).toBe('no prices');
    expect(localizePriceText('₱1.00', [], fmt)).toBe('₱1.00');
    expect(localizePriceText('₱1.00', undefined, fmt)).toBe('₱1.00');
  });
  it('treats regex-special characters literally', () => {
    expect(localizePriceText('x $1.00 y $100', [p(1, '$1.00')], fmt)).toBe('x USD 1.00 y $100');
    expect(localizePriceText('(a+b) $1', [p(1, '(a+b)')], fmt)).toBe('USD 1.00 $1');
  });
  it('matches non-breaking-space formats', () => {
    expect(localizePriceText('Only 1.234,00 € left', [p(1234, '1.234,00 €')], fmt)).toBe('Only USD 1234.00 left');
  });
  it('skips parts with invalid price or missing priceDisplay', () => {
    const parts = [p(NaN, '₱1.00'), p(undefined, '₱2.00'), p(3, ''), p(4, undefined), null, p(5, '₱5.00')];
    expect(localizePriceText('₱1.00 ₱2.00 ₱5.00', parts, fmt)).toBe('₱1.00 ₱2.00 USD 5.00');
  });
  it('never throws on bad input or a throwing formatter', () => {
    expect(localizePriceText(undefined, [p(1, '₱1.00')], fmt)).toBe('');
    expect(localizePriceText('₱1.00', [p(1, '₱1.00')], () => { throw new Error('x'); })).toBe('₱1.00');
  });
});

describe('localizePriceText base-currency fallback (uncarded prices)', () => {
  const opts = { baseCurrency: 'PHP', displayCurrency: 'USD' };
  const run = (text, parts = []) => localizePriceText(text, parts, fmt, opts);

  it('converts an uncarded ₱ amount when there are no parts', () => {
    expect(run('Brake lining is ₱60,333.59 today')).toBe('Brake lining is USD 60333.59 today');
  });
  it('converts carded and uncarded prices together in one message', () => {
    expect(run('A ₱100.00 and B ₱60,333.59, A again ₱100.00', [p(100, '₱100.00')]))
      .toBe('A USD 100.00 and B USD 60333.59, A again USD 100.00');
  });
  it('handles PHP code forms with and without a space', () => {
    expect(run('PHP 1,234 or PHP1,234.00')).toBe('USD 1234.00 or USD 1234.00');
  });
  it('handles a non-breaking space after the marker', () => {
    expect(run('Only ₱\u00A02,500 or PHP\u00A02,500.50')).toBe('Only USD 2500.00 or USD 2500.50');
  });
  it('handles amounts without decimals or thousands separators', () => {
    expect(run('₱75 and ₱1234567')).toBe('USD 75.00 and USD 1234567.00');
  });
  it('does not swallow sentence punctuation', () => {
    expect(run('Costs ₱100.00.')).toBe('Costs USD 100.00.');
  });
  it('returns identical text when display equals base currency', () => {
    const text = 'A ₱100.00 B PHP 5,000 and ₱ 7';
    expect(localizePriceText(text, [p(100, '₱100.00')], fmt, { baseCurrency: 'PHP', displayCurrency: 'PHP' })).toBe(text);
  });
  it('leaves numbers without a currency marker untouched', () => {
    const text = 'SKU 12345-678, OEM 04465-0K240, qty 12, year 2019, PHPX 50, XPHP 50, AB123 1,234.00';
    expect(run(text)).toBe(text);
  });
  it('does not double convert converted output', () => {
    const dollar = (n) => `$${Number(n).toFixed(2)} (PHP 9)`;
    expect(localizePriceText('₱100.00 and ₱5.00', [p(100, '₱100.00')], dollar, opts))
      .toBe('$100.00 (PHP 9) and $5.00 (PHP 9)');
  });
  it('converts a carded priceDisplay exactly once', () => {
    const calls = [];
    const spy = (n) => { calls.push(n); return `USD ${n}`; };
    expect(localizePriceText('₱1,234.00', [p(1234, '₱1,234.00')], spy, opts)).toBe('USD 1234');
    expect(calls).toEqual([1234]);
  });
  it('uses the supplied base currency symbol and defaults to PHP', () => {
    expect(localizePriceText('€10.00 and ₱10.00', [], fmt, { baseCurrency: 'EUR', displayCurrency: 'USD' })).toBe('USD 10.00 and ₱10.00');
    expect(localizePriceText('₱10.00', [], fmt, { displayCurrency: 'USD' })).toBe('USD 10.00');
  });
  it('returns the original text if the formatter throws', () => {
    expect(localizePriceText('₱5.00', [], () => { throw new Error('x'); }, opts)).toBe('₱5.00');
  });
});

describe('showPartParts', () => {
  it('extracts show_part args.part from message content', () => {
    const content = [
      { type: 'text', text: 'hi' },
      { type: 'tool-call', toolName: 'show_part', args: { part: p(1, '₱1.00') } },
      { type: 'tool-call', toolName: 'other', args: { part: p(2, '₱2.00') } },
      { type: 'tool-call', toolName: 'show_part', args: {} }
    ];
    expect(showPartParts(content)).toEqual([p(1, '₱1.00')]);
    expect(showPartParts(undefined)).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { formatCurrencyCode } from '../currencyFormat';

describe('formatCurrencyCode', () => {
  it('prints an ASCII-safe ISO code instead of a symbol', () => {
    expect(formatCurrencyCode(1234.5, 'PHP')).toBe('PHP 1,234.50');
    expect(formatCurrencyCode(1234.5, 'USD')).toBe('USD 1,234.50');
  });

  it('never emits non-ASCII characters (jsPDF Helvetica cannot encode them)', () => {
    // eslint-disable-next-line no-control-regex
    expect(formatCurrencyCode(99, 'JPY')).toMatch(/^[\x00-\x7F]+$/);
  });

  it('treats a missing amount as zero', () => {
    expect(formatCurrencyCode(undefined, 'PHP')).toBe('PHP 0.00');
  });
});

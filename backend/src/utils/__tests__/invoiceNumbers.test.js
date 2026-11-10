import { describe, it, expect, vi } from 'vitest';
import { nextInvoiceNumber, isUniqueViolation, retryOnUniqueViolation } from '../invoiceNumbers.js';

const collision = (field) => Object.assign(new Error(`Unique constraint failed on (${field})`), {
  code: 'P2002',
  meta: { target: [field] }
});

describe('nextInvoiceNumber', () => {
  it('queries the Manila day prefix and continues the sequence', async () => {
    const findFirst = vi.fn().mockResolvedValue({ invoiceNumber: 'INV-20261110-0012' });
    const tx = { transaction: { findFirst } };

    // 23:30 UTC on Nov 9 is Nov 10 in Manila.
    const result = await nextInvoiceNumber(tx, 'INV', new Date('2026-11-09T23:30:00Z'));

    expect(findFirst).toHaveBeenCalledWith({
      where: { invoiceNumber: { startsWith: 'INV-20261110-' } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true }
    });
    expect(result).toBe('INV-20261110-0013');
  });

  it('starts at 0001 for the first sale of the day', async () => {
    const tx = { transaction: { findFirst: vi.fn().mockResolvedValue(null) } };
    expect(await nextInvoiceNumber(tx, 'WEB', new Date('2026-11-10T02:00:00Z'))).toBe('WEB-20261110-0001');
  });
});

describe('isUniqueViolation', () => {
  it('matches a P2002 on the named field only', () => {
    expect(isUniqueViolation(collision('invoiceNumber'), 'invoiceNumber')).toBe(true);
    expect(isUniqueViolation(collision('clientRef'), 'invoiceNumber')).toBe(false);
    expect(isUniqueViolation(new Error('boom'), 'invoiceNumber')).toBe(false);
  });
});

describe('retryOnUniqueViolation', () => {
  it('retries when the named field collides, then returns the result', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(collision('invoiceNumber'))
      .mockResolvedValueOnce('ok');

    await expect(retryOnUniqueViolation('invoiceNumber', fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rethrows other errors immediately', async () => {
    const fn = vi.fn().mockRejectedValue(collision('clientRef'));
    await expect(retryOnUniqueViolation('invoiceNumber', fn)).rejects.toMatchObject({ code: 'P2002' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempt limit', async () => {
    const fn = vi.fn().mockRejectedValue(collision('invoiceNumber'));
    await expect(retryOnUniqueViolation('invoiceNumber', fn, 3)).rejects.toMatchObject({ code: 'P2002' });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

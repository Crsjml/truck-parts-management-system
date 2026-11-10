import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const executeTransaction = vi.fn();
const findBySession = vi.fn();

vi.mock('stripe', () => ({ default: vi.fn(function Stripe() {}) }));
vi.mock('../../config/prisma.js', () => ({
  prisma: { transaction: { findUnique: (...args) => findBySession(...args) } }
}));
vi.mock('../../repositories/TransactionsRepository.js', () => ({
  default: { executeTransaction: (...args) => executeTransaction(...args) }
}));

const checkoutService = (await import('../CheckoutService.js')).default;

const session = {
  id: 'cs_test_123',
  amount_total: 112000,
  metadata: {
    userEmail: 'buyer@example.com',
    userId: 'auth-1',
    cartItems: JSON.stringify([{ id: 'part-1', name: 'Alternator', quantity: 1, price: 1120 }])
  }
};

const makeTx = ({ latestInvoice = null, create } = {}) => ({
  transaction: {
    findFirst: vi.fn().mockResolvedValue(latestInvoice),
    create: create || vi.fn(async ({ data }) => data)
  },
  part: {
    findMany: vi.fn().mockResolvedValue([{ id: 'part-1', sku: 'ELC-ALT-00001' }]),
    update: vi.fn()
  }
});

describe('CheckoutService.processSuccessfulCheckout', () => {
  beforeEach(() => {
    executeTransaction.mockReset();
    findBySession.mockResolvedValue(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T02:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('numbers online orders WEB-YYYYMMDD-#### on the Manila day', async () => {
    const tx = makeTx({ latestInvoice: { invoiceNumber: 'WEB-20261110-0002' } });
    executeTransaction.mockImplementation(async (cb) => cb(tx));

    await checkoutService.processSuccessfulCheckout(session);

    expect(tx.transaction.create.mock.calls[0][0].data.invoiceNumber).toBe('WEB-20261110-0003');
  });

  it('retries with the next number when a concurrent order took the same one', async () => {
    const collision = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['invoiceNumber'] } });
    const second = makeTx({ latestInvoice: { invoiceNumber: 'WEB-20261110-0001' } });
    executeTransaction
      .mockImplementationOnce(async (cb) => cb(makeTx({ create: vi.fn().mockRejectedValue(collision) })))
      .mockImplementationOnce(async (cb) => cb(second));

    await checkoutService.processSuccessfulCheckout(session);

    expect(executeTransaction).toHaveBeenCalledTimes(2);
    expect(second.transaction.create.mock.calls[0][0].data.invoiceNumber).toBe('WEB-20261110-0002');
  });
});

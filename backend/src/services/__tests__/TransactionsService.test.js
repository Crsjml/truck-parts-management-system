import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const executeTransaction = vi.fn();
const findByClientRef = vi.fn();

vi.mock('../../repositories/TransactionsRepository.js', () => ({
  default: {
    executeTransaction: (...args) => executeTransaction(...args),
    findByClientRef: (...args) => findByClientRef(...args)
  }
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: {}
}));

const transactionsService = (await import('../TransactionsService.js')).default;

describe('TransactionsService.updateStatus', () => {
  beforeEach(() => {
    executeTransaction.mockReset();
  });

  it('deducts stock and reserved stock when an online pickup is completed', async () => {
    const partUpdate = vi.fn();
    const transactionUpdate = vi.fn().mockResolvedValue({ id: 'tx-1', status: 'COMPLETED' });

    executeTransaction.mockImplementation(async (callback) => callback({
      transaction: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'tx-1',
          status: 'READY_FOR_PICKUP',
          items: [{ partId: 'part-1', quantity: 2 }]
        }),
        update: transactionUpdate
      },
      part: {
        update: partUpdate
      }
    }));

    await transactionsService.updateStatus('tx-1', 'COMPLETED');

    expect(partUpdate).toHaveBeenCalledWith({
      where: { id: 'part-1' },
      data: {
        stock: { decrement: 2 },
        reservedStock: { decrement: 2 }
      }
    });
    expect(transactionUpdate).toHaveBeenCalledWith({
      where: { id: 'tx-1' },
      data: { status: 'COMPLETED' }
    });
  });
});

describe('TransactionsService.createTransaction', () => {
  const sale = {
    clientRef: 'pos-3f2a9c1e',
    invoiceNumber: 'TTP-1234-5678', // legacy client value: must be ignored
    status: 'COMPLETED',
    customerName: 'Walk-in',
    subtotal: 16712.63,
    taxAmount: 2005.52,
    total: 18718.15,
    items: [{ partId: 'part-1', name: 'Air Compressor', quantity: 1, price: 18718.15 }]
  };

  const makeTx = ({ existing = null, latestInvoice = null, create } = {}) => ({
    transaction: {
      findUnique: vi.fn().mockResolvedValue(existing),
      findFirst: vi.fn().mockResolvedValue(latestInvoice),
      create: create || vi.fn(async ({ data }) => ({ id: 'tx-new', ...data }))
    },
    part: {
      findUnique: vi.fn().mockResolvedValue({ id: 'part-1', name: 'Air Compressor', sku: 'BRK-AIR-00001', stock: 5, reservedStock: 0 }),
      update: vi.fn()
    },
    customer: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() }
  });

  beforeEach(() => {
    executeTransaction.mockReset();
    findByClientRef.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T02:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the existing sale without touching stock when the same clientRef is retried', async () => {
    const existingTransaction = { id: 'tx-existing', invoiceNumber: 'INV-20261110-0003', clientRef: sale.clientRef, items: [] };
    const tx = makeTx({ existing: existingTransaction });
    executeTransaction.mockImplementation(async (cb) => cb(tx));

    const result = await transactionsService.createTransaction(sale);

    expect(tx.transaction.findUnique).toHaveBeenCalledWith({ where: { clientRef: sale.clientRef }, include: { items: true } });
    expect(result).toBe(existingTransaction);
    expect(tx.part.update).not.toHaveBeenCalled();
  });

  it('assigns a server-side INV-YYYYMMDD-#### number and ignores the client invoiceNumber', async () => {
    const tx = makeTx({ latestInvoice: { invoiceNumber: 'INV-20261110-0004' } });
    executeTransaction.mockImplementation(async (cb) => cb(tx));

    const result = await transactionsService.createTransaction(sale);

    expect(result.invoiceNumber).toBe('INV-20261110-0005');
    expect(result.clientRef).toBe(sale.clientRef);
  });

  it('retries with the next number when a concurrent sale took the same invoice number', async () => {
    const collision = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['invoiceNumber'] } });
    const first = makeTx({ create: vi.fn().mockRejectedValue(collision) });
    const second = makeTx({ latestInvoice: { invoiceNumber: 'INV-20261110-0001' } });
    executeTransaction
      .mockImplementationOnce(async (cb) => cb(first))
      .mockImplementationOnce(async (cb) => cb(second));

    const result = await transactionsService.createTransaction(sale);

    expect(executeTransaction).toHaveBeenCalledTimes(2);
    expect(result.invoiceNumber).toBe('INV-20261110-0002');
  });

  it('returns the winning sale when a double-submit races on clientRef', async () => {
    const collision = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['clientRef'] } });
    const winner = { id: 'tx-winner', invoiceNumber: 'INV-20261110-0001', clientRef: sale.clientRef };
    executeTransaction.mockImplementation(async (cb) => cb(makeTx({ create: vi.fn().mockRejectedValue(collision) })));
    findByClientRef.mockResolvedValue(winner);

    const result = await transactionsService.createTransaction(sale);

    expect(findByClientRef).toHaveBeenCalledWith(sale.clientRef);
    expect(result).toBe(winner);
  });
});

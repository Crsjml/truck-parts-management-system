import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeTransaction = vi.fn();

vi.mock('../../repositories/TransactionsRepository.js', () => ({
  default: {
    executeTransaction: (...args) => executeTransaction(...args)
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
  beforeEach(() => {
    executeTransaction.mockReset();
  });

  it('returns an existing invoice without deducting stock when a POS request is retried', async () => {
    const partUpdate = vi.fn();
    const existingTransaction = {
      id: 'tx-existing',
      invoiceNumber: 'TTP-1234-5678',
      status: 'COMPLETED',
      items: [{ id: 'item-1', partId: 'part-1', quantity: 1, price: 18718.15 }]
    };

    executeTransaction.mockImplementation(async (callback) => callback({
      transaction: {
        findUnique: vi.fn().mockResolvedValue(existingTransaction),
        create: vi.fn()
      },
      part: {
        findUnique: vi.fn(),
        update: partUpdate
      },
      customer: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn()
      }
    }));

    const result = await transactionsService.createTransaction({
      invoiceNumber: 'TTP-1234-5678',
      status: 'COMPLETED',
      customerName: 'Walk-in',
      customerContact: '555-1234',
      customerEmail: 'walkin@example.com',
      subtotal: 16712.63,
      taxAmount: 2005.52,
      total: 18718.15,
      items: [{ partId: 'part-1', name: 'Air Compressor', quantity: 1, price: 18718.15 }]
    });

    expect(result).toBe(existingTransaction);
    expect(partUpdate).not.toHaveBeenCalled();
  });
});

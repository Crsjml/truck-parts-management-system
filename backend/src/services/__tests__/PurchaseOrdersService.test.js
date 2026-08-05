import { beforeEach, describe, expect, it, vi } from 'vitest';

const purchaseOrdersRepository = {
  findLatestByDate: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  executeTransaction: vi.fn()
};

vi.mock('../../repositories/PurchaseOrdersRepository.js', () => ({
  default: purchaseOrdersRepository
}));

const purchaseOrdersService = (await import('../PurchaseOrdersService.js')).default;

describe('PurchaseOrdersService calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    purchaseOrdersRepository.findLatestByDate.mockResolvedValue(null);
  });

  it('recalculates created PO item subtotals and total from quantity and unit price', async () => {
    purchaseOrdersRepository.create.mockImplementation(async (data) => data);

    const result = await purchaseOrdersService.createPurchaseOrder({
      supplier: '11111111-1111-4111-8111-111111111111',
      expectedDeliveryDate: '2026-09-15',
      paymentDueDate: '2026-09-20',
      totalAmount: 103500,
      items: [
        {
          partId: '22222222-2222-4222-8222-222222222222',
          name: 'Air Compressor',
          sku: 'AC-001',
          quantity: 3,
          unitPrice: 30000,
          subtotal: 103500
        }
      ]
    });

    expect(result.totalAmount).toBe(90000);
    expect(result.paymentDueDate).toEqual(new Date('2026-09-20'));
    expect(result.items.create[0]).toMatchObject({
      quantity: 3,
      unitPrice: 30000,
      subtotal: 90000
    });
  });

  it('rejects invalid PO quantities and prices before saving', async () => {
    await expect(purchaseOrdersService.createPurchaseOrder({
      supplier: '11111111-1111-4111-8111-111111111111',
      expectedDeliveryDate: '2026-09-15',
      items: [
        {
          partId: '22222222-2222-4222-8222-222222222222',
          name: 'Air Compressor',
          quantity: -1,
          unitPrice: 30000
        }
      ]
    })).rejects.toThrow(/quantity/i);

    expect(purchaseOrdersRepository.create).not.toHaveBeenCalled();
  });

  it('recalculates quoted-price subtotals and PO total when item prices change', async () => {
    const purchaseOrderItemUpdate = vi.fn();
    const purchaseOrderUpdate = vi.fn().mockResolvedValue({ id: 'po-1', totalAmount: 90000 });

    purchaseOrdersRepository.executeTransaction.mockImplementation(async (callback) => callback({
      purchaseOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'po-1',
          status: 'Confirmed',
          items: [{ id: 'item-1', quantity: 3, subtotal: 75000 }]
        }),
        update: purchaseOrderUpdate
      },
      purchaseOrderItem: {
        update: purchaseOrderItemUpdate,
        findMany: vi.fn().mockResolvedValue([{ subtotal: 90000 }])
      }
    }));

    await purchaseOrdersService.updateItemPrices('po-1', [
      { id: 'item-1', unitPrice: 30000, subtotal: 103500 }
    ]);

    expect(purchaseOrderItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { unitPrice: 30000, subtotal: 90000 }
    });
    expect(purchaseOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'po-1' },
      data: { totalAmount: 90000 }
    }));
  });

  it('rejects invalid quoted prices before updating item totals', async () => {
    purchaseOrdersRepository.executeTransaction.mockImplementation(async (callback) => callback({
      purchaseOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'po-1',
          status: 'Confirmed',
          items: [{ id: 'item-1', quantity: 3, subtotal: 75000 }]
        })
      },
      purchaseOrderItem: {
        update: vi.fn(),
        findMany: vi.fn()
      }
    }));

    await expect(purchaseOrdersService.updateItemPrices('po-1', [
      { id: 'item-1', unitPrice: -30000 }
    ])).rejects.toThrow(/price/i);
  });
});

describe('PurchaseOrdersService payment tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds computed supplier payment statuses without mutating stored PO status', async () => {
    purchaseOrdersRepository.findMany.mockResolvedValue([
      {
        id: 'pending-po',
        status: 'Received',
        totalAmount: 1000,
        paymentDueDate: '2026-09-30T00:00:00.000Z',
        paidAt: null
      },
      {
        id: 'due-soon-po',
        status: 'Confirmed',
        totalAmount: 2000,
        paymentDueDate: '2026-08-09T00:00:00.000Z',
        paidAt: null
      },
      {
        id: 'overdue-po',
        status: 'Received',
        totalAmount: 3000,
        paymentDueDate: '2026-08-01T00:00:00.000Z',
        paidAt: null
      },
      {
        id: 'paid-po',
        status: 'Received',
        totalAmount: 4000,
        paymentDueDate: '2026-08-01T00:00:00.000Z',
        paidAt: '2026-08-02T00:00:00.000Z'
      }
    ]);

    const result = await purchaseOrdersService.getPurchaseOrders(new Date('2026-08-05T00:00:00.000Z'));

    expect(result.map(po => [po.id, po.status, po.paymentStatus, po.amountDue])).toEqual([
      ['pending-po', 'Received', 'Pending', 1000],
      ['due-soon-po', 'Confirmed', 'Due Soon', 2000],
      ['overdue-po', 'Received', 'Overdue', 3000],
      ['paid-po', 'Received', 'Paid', 4000]
    ]);
  });

  it('marks a supplier payment paid without receiving inventory', async () => {
    purchaseOrdersRepository.update.mockResolvedValue({
      id: 'po-1',
      paidAt: '2026-08-05T00:00:00.000Z',
      paymentReference: 'BANK-123',
      paymentNotes: 'Paid by bank transfer'
    });

    await purchaseOrdersService.updatePayment('po-1', {
      paidAt: '2026-08-05',
      paymentReference: 'BANK-123',
      paymentNotes: 'Paid by bank transfer'
    });

    expect(purchaseOrdersRepository.update).toHaveBeenCalledWith('po-1', {
      paidAt: new Date('2026-08-05'),
      paymentReference: 'BANK-123',
      paymentNotes: 'Paid by bank transfer'
    });
    expect(purchaseOrdersRepository.executeTransaction).not.toHaveBeenCalled();
  });
});

describe('PurchaseOrdersService RFQ detail edits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates RFQ arrival and payment deadline dates without changing status', async () => {
    purchaseOrdersRepository.findById = vi.fn().mockResolvedValue({
      id: 'po-1',
      status: 'RFQ Sent'
    });
    purchaseOrdersRepository.update.mockResolvedValue({
      id: 'po-1',
      status: 'RFQ Sent',
      expectedDeliveryDate: '2026-09-15T00:00:00.000Z',
      paymentDueDate: '2026-09-20T00:00:00.000Z',
      totalAmount: 90000
    });

    await purchaseOrdersService.updatePurchaseOrderDetails('po-1', {
      expectedDeliveryDate: '2026-09-15',
      paymentDueDate: '2026-09-20',
      notes: 'Updated RFQ note'
    });

    expect(purchaseOrdersRepository.update).toHaveBeenCalledWith('po-1', {
      expectedDeliveryDate: new Date('2026-09-15'),
      paymentDueDate: new Date('2026-09-20'),
      notes: 'Updated RFQ note'
    });
  });
});

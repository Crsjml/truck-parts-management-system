import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = {
  findPartById: vi.fn(),
  findPartBySku: vi.fn(),
  findCategoryById: vi.fn(),
  executeTransaction: vi.fn(),
  lockPartStock: vi.fn(),
  updatePart: vi.fn(),
  findLatestAdjustmentByDate: vi.fn(),
  createStockAdjustment: vi.fn()
};

vi.mock('../../repositories/PartsRepository.js', () => ({ partsRepository: repo }));
vi.mock('../SupabaseStorageService.js', () => ({ supabaseStorageService: { uploadBase64Image: vi.fn() } }));

const { PartsService } = await import('../PartsService.js');
const service = new PartsService();

const TX = { tag: 'tx-client' };
const PART = { id: 'part-1', sku: 'BRK-PAD-00001', stock: 10, compatibleWith: [] };
const savedPart = (stock) => ({
  ...PART, stock, name: 'Pad', categoryId: 'cat-1', category: { name: 'Brakes' }, oemNumbers: [], reservedStock: 0
});

describe('PartsService.updatePart — stock adjustments', () => {
  beforeEach(() => {
    Object.values(repo).forEach(fn => fn.mockReset());
    repo.findPartById.mockResolvedValue(PART);
    repo.executeTransaction.mockImplementation(async (cb) => cb(TX));
    repo.lockPartStock.mockResolvedValue(10);
    repo.updatePart.mockImplementation(async (_id, data) => savedPart(data.stock ?? 10));
    repo.findLatestAdjustmentByDate.mockResolvedValue(null);
    repo.createStockAdjustment.mockResolvedValue({});
  });

  it('writes the stock change and its adjustment record in the same transaction', async () => {
    await service.updatePart('part-1', { stock: 7, adjustmentReason: 'Damaged' });

    expect(repo.executeTransaction).toHaveBeenCalledTimes(1);
    expect(repo.lockPartStock).toHaveBeenCalledWith('part-1', TX);
    expect(repo.updatePart).toHaveBeenCalledWith('part-1', expect.objectContaining({ stock: 7 }), TX);
    expect(repo.createStockAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      partId: 'part-1', oldStock: 10, newStock: 7, difference: -3, reason: 'Damaged',
      adjustmentNumber: expect.stringMatching(/^SA-\d{8}-0001$/)
    }), TX);
    expect(repo.findLatestAdjustmentByDate).toHaveBeenCalledWith(expect.any(String), TX);
  });

  it('records old stock from the locked row, not the earlier unlocked read', async () => {
    repo.lockPartStock.mockResolvedValue(12); // a concurrent edit landed in between

    await service.updatePart('part-1', { stock: 7, adjustmentReason: 'Recount' });

    expect(repo.createStockAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ oldStock: 12, newStock: 7, difference: -5 }), TX
    );
  });

  it('fails the whole update when the adjustment record cannot be written', async () => {
    repo.createStockAdjustment.mockRejectedValue(new Error('db down'));

    await expect(service.updatePart('part-1', { stock: 7, adjustmentReason: 'Damaged' })).rejects.toThrow('db down');
    expect(repo.executeTransaction).toHaveBeenCalledTimes(1); // rolled back, not retried
  });

  it('retries the whole transaction with the next number on an adjustment-number collision', async () => {
    const collision = Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['adjustmentNumber'] } });
    repo.createStockAdjustment.mockRejectedValueOnce(collision).mockResolvedValueOnce({});
    repo.findLatestAdjustmentByDate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ adjustmentNumber: 'SA-20261110-0001' });

    await service.updatePart('part-1', { stock: 7, adjustmentReason: 'Damaged' });

    expect(repo.executeTransaction).toHaveBeenCalledTimes(2);
    expect(repo.createStockAdjustment).toHaveBeenLastCalledWith(
      expect.objectContaining({ adjustmentNumber: expect.stringMatching(/-0002$/) }), TX
    );
  });

  it('does not create an adjustment for a non-stock edit', async () => {
    await service.updatePart('part-1', { name: 'New name' });

    expect(repo.updatePart).toHaveBeenCalledWith('part-1', expect.objectContaining({ name: 'New name' }), TX);
    expect(repo.createStockAdjustment).not.toHaveBeenCalled();
  });

  it('still requires a reason for a stock change', async () => {
    await expect(service.updatePart('part-1', { stock: 7 })).rejects.toThrow('Reason for stock adjustment is required.');
    expect(repo.executeTransaction).not.toHaveBeenCalled();
  });
});

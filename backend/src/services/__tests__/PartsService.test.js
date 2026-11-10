import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = {
  findPartById: vi.fn(),
  findPartBySku: vi.fn(),
  findCategoryById: vi.fn(),
  executeTransaction: vi.fn(),
  lockPartStock: vi.fn(),
  updatePart: vi.fn(),
  findLatestAdjustmentByDate: vi.fn(),
  createStockAdjustment: vi.fn(),
  createPart: vi.fn(),
  findLatestSkuByPrefix: vi.fn()
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

describe('PartsService OEM/MPN normalization', () => {
  beforeEach(() => {
    Object.values(repo).forEach(fn => fn.mockReset());
    repo.findPartById.mockResolvedValue(PART);
    repo.findPartBySku.mockResolvedValue(null);
    repo.findCategoryById.mockResolvedValue({ id: 'cat-1', name: 'Brake Pads/Linings' });
    repo.executeTransaction.mockImplementation(async (cb) => cb(TX));
    repo.updatePart.mockImplementation(async (_id, data) => ({ ...savedPart(10), ...data }));
    repo.createPart.mockImplementation(async (data) => ({ id: 'new', ...data, category: { name: 'Brake Pads/Linings' } }));
  });

  it('normalizes oem and oemNumbers on create', async () => {
    await service.createPart({
      name: 'Pad', sku: 'BRK-PAD-00009', category_id: 'cat-1', price: 1, stock: 1, minStock: 0,
      oem: ' oem: me-220437 ', oemNumbers: ['me-220437', 'MPN: 8-97x', '']
    });

    expect(repo.createPart).toHaveBeenCalledWith(expect.objectContaining({
      oem: 'ME-220437',
      oemNumbers: ['ME-220437', '8-97X']
    }));
  });

  it('normalizes oem and oemNumbers on update', async () => {
    await service.updatePart('part-1', { oem: 'p/n 1-87610', oemNumbers: ['p/n 1-87610', '1-87610 '] });

    expect(repo.updatePart).toHaveBeenCalledWith('part-1', expect.objectContaining({
      oem: '1-87610',
      oemNumbers: ['1-87610']
    }), TX);
  });
});

describe('PartsService SKU assignment and validation', () => {
  const NEW_PART = { name: 'Pad', category_id: 'cat-1', price: 1, stock: 1, minStock: 0, oem: '1-87610' };
  const skuCollision = () => Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['sku'] } });

  beforeEach(() => {
    Object.values(repo).forEach(fn => fn.mockReset());
    repo.findPartById.mockResolvedValue(PART);
    repo.findPartBySku.mockResolvedValue(null);
    repo.findCategoryById.mockResolvedValue({ id: 'cat-1', name: 'Brake Pads/Linings' });
    repo.findLatestSkuByPrefix.mockResolvedValue(null);
    repo.executeTransaction.mockImplementation(async (cb) => cb(TX));
    repo.updatePart.mockImplementation(async (_id, data) => ({ ...savedPart(10), ...data }));
    repo.createPart.mockImplementation(async (data) => ({ id: 'new', ...data, category: { name: 'Brake Pads/Linings' } }));
  });

  it('suggests the next SKU in the category sequence', async () => {
    repo.findLatestSkuByPrefix.mockResolvedValue({ sku: 'BRK-PAD-00041' });

    await expect(service.suggestSku('cat-1')).resolves.toBe('BRK-PAD-00042');
    expect(repo.findLatestSkuByPrefix).toHaveBeenCalledWith('BRK-PAD');
  });

  it('starts a new category at 00001 and 404s for an unknown category', async () => {
    await expect(service.suggestSku('cat-1')).resolves.toBe('BRK-PAD-00001');
    repo.findCategoryById.mockResolvedValue(null);
    await expect(service.suggestSku('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('assigns the next SKU server-side when none is given', async () => {
    repo.findLatestSkuByPrefix.mockResolvedValue({ sku: 'BRK-PAD-00007' });

    const part = await service.createPart({ ...NEW_PART, sku: '' });

    expect(part.sku).toBe('BRK-PAD-00008');
    expect(repo.findPartBySku).not.toHaveBeenCalled();
  });

  it('retries with the next number when the assigned SKU was just taken', async () => {
    repo.findLatestSkuByPrefix
      .mockResolvedValueOnce({ sku: 'BRK-PAD-00007' })
      .mockResolvedValueOnce({ sku: 'BRK-PAD-00008' });
    repo.createPart.mockRejectedValueOnce(skuCollision());

    const part = await service.createPart({ ...NEW_PART, sku: '' });

    expect(part.sku).toBe('BRK-PAD-00009');
    expect(repo.createPart).toHaveBeenCalledTimes(2);
  });

  it('keeps a typed SKU, uppercased', async () => {
    const part = await service.createPart({ ...NEW_PART, sku: ' brk-pad-00500 ' });

    expect(part.sku).toBe('BRK-PAD-00500');
    expect(repo.findLatestSkuByPrefix).not.toHaveBeenCalled();
  });

  it('rejects a typed SKU in the wrong format on create', async () => {
    await expect(service.createPart({ ...NEW_PART, sku: '1231' }))
      .rejects.toMatchObject({ status: 400, message: expect.stringMatching(/CAT-PRT-#####/) });
    expect(repo.createPart).not.toHaveBeenCalled();
  });

  it('rejects a changed SKU in the wrong format on update, but allows it uppercased', async () => {
    await expect(service.updatePart('part-1', { sku: 'pad-1' })).rejects.toMatchObject({ status: 400 });

    await service.updatePart('part-1', { sku: 'brk-pad-00002' });
    expect(repo.updatePart).toHaveBeenCalledWith('part-1', expect.objectContaining({ sku: 'BRK-PAD-00002' }), TX);
  });
});

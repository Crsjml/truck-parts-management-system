import { describe, expect, it, vi } from 'vitest';
import { resolveCatalogPart } from './resolveCatalogPart';

// A chat card part: price is ALREADY the selling price, fields are projected
// (no minStock / reservedStock / markupOverride). Opening the drawer with it
// would apply the markup a second time.
const chatPart = { id: 'p1', sku: 'BRK-1', name: 'Brake Pad', price: 120, stock: 3, stockStatus: 'low_stock' };
const full = { id: 'p1', sku: 'BRK-1', name: 'Brake Pad', price: 100, markupOverride: null, stock: 3, reservedStock: 0, minStock: 5, compatibleWith: [] };

describe('resolveCatalogPart', () => {
  it('returns the catalogue part when it is already loaded (no fetch)', async () => {
    const fetchParts = vi.fn();
    expect(await resolveCatalogPart(chatPart, [full], fetchParts)).toBe(full);
    expect(fetchParts).not.toHaveBeenCalled();
  });

  it('fetches the full part by SKU and matches by id when the catalogue lacks it', async () => {
    const fetchParts = vi.fn().mockResolvedValue([{ ...full, id: 'other' }, full]);
    expect(await resolveCatalogPart(chatPart, [], fetchParts)).toBe(full);
    expect(fetchParts).toHaveBeenCalledWith('BRK-1');
  });

  it('never falls back to the projected chat part (null when it cannot be resolved)', async () => {
    expect(await resolveCatalogPart(chatPart, [], vi.fn().mockResolvedValue([]))).toBeNull();
    expect(await resolveCatalogPart(chatPart, [], vi.fn().mockRejectedValue(new Error('x')))).toBeNull();
    expect(await resolveCatalogPart(null, [full], vi.fn())).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();
vi.mock('../../config/prisma.js', () => ({ prisma: { part: { findMany: (...a) => findMany(...a) } } }));

import { PartsRepository } from '../PartsRepository.js';

describe('PartsRepository.searchCustomerParts', () => {
  const repo = new PartsRepository();
  beforeEach(() => { findMany.mockReset().mockResolvedValue([{ id: 'p1' }]); });

  it('ANDs tokens, each ORed over text fields, category name and oemNumbers; published only', async () => {
    const rows = await repo.searchCustomerParts({ tokens: ['brake', 'canter'], mode: 'all', limit: 25 });
    expect(rows).toEqual([{ id: 'p1' }]);
    const args = findMany.mock.calls[0][0];
    expect(args.take).toBe(25);
    expect(args.include).toEqual({ category: { select: { name: true } } });
    expect(args.where.published).toBe(true);
    expect(args.where.archived).toBe(false);
    expect(args.where.AND).toHaveLength(2);
    expect(args.where.OR).toBeUndefined();
    const first = args.where.AND[0].OR;
    for (const field of ['name', 'sku', 'oem', 'compatibility', 'description']) {
      expect(first).toContainEqual({ [field]: { contains: 'brake', mode: 'insensitive' } });
    }
    expect(first).toContainEqual({ category: { name: { contains: 'brake', mode: 'insensitive' } } });
    expect(first).toContainEqual({ oemNumbers: { has: 'brake' } });
    expect(first).toContainEqual({ oemNumbers: { has: 'BRAKE' } });
  });

  it('ORs the per-token clauses in "any" mode', async () => {
    await repo.searchCustomerParts({ tokens: ['brake', 'canter'], mode: 'any', limit: 25 });
    const where = findMany.mock.calls[0][0].where;
    expect(where.AND).toBeUndefined();
    expect(where.OR).toHaveLength(2 * 8);
    expect(where.published).toBe(true);
    expect(where.archived).toBe(false);
  });

  it('returns [] without querying when there are no tokens', async () => {
    expect(await repo.searchCustomerParts({ tokens: [], mode: 'all', limit: 5 })).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

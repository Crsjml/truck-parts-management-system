import { prisma } from '../config/prisma.js';

export class PartsRepository {
  async findCategories(filter) {
    return prisma.category.findMany(filter);
  }

  async countParts(where) {
    return prisma.part.count({ where });
  }

  async findParts(where, skip, limit) {
    return prisma.part.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });
  }

  async findPartBySku(sku, excludeId = null) {
    const where = { sku };
    if (excludeId) where.id = { not: excludeId };
    return prisma.part.findFirst({ where });
  }

  async findLatestSkuByPrefix(prefix, client = prisma) {
    return client.part.findFirst({
      where: { sku: { startsWith: `${prefix}-` } },
      orderBy: { sku: 'desc' },
      select: { sku: true }
    });
  }

  /** Storefront-visible part (published, not archived) by id or sku, with its category. */
  async findCustomerPart({ id, sku }) {
    return prisma.part.findFirst({
      where: { ...(id ? { id } : { sku }), published: true, archived: false },
      include: { category: { select: { name: true } } }
    });
  }

  /**
   * Assistant-only, read-only token search over storefront-visible parts.
   * mode 'all': every token must match somewhere (AND of ORs).
   * mode 'any': at least one token matches (caller ranks the results).
   */
  async searchCustomerParts({ tokens, mode = 'all', limit = 25 }) {
    if (!Array.isArray(tokens) || tokens.length === 0) return [];
    const clauseFor = (t) => ({
      OR: [
        ...['name', 'sku', 'oem', 'compatibility', 'description'].map((f) => ({ [f]: { contains: t, mode: 'insensitive' } })),
        { category: { name: { contains: t, mode: 'insensitive' } } },
        { oemNumbers: { has: t } },
        { oemNumbers: { has: t.toUpperCase() } }
      ]
    });
    const clauses = tokens.map(clauseFor);
    const match = mode === 'any' ? { OR: clauses.flatMap((c) => c.OR) } : { AND: clauses };
    return prisma.part.findMany({
      where: { published: true, archived: false, ...match },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: limit
    });
  }

  /** Assistant-only: storefront-visible parts without a keyword (browse / sort / filter in memory). */
  async listCustomerParts({ limit = 200 } = {}) {
    return prisma.part.findMany({
      where: { published: true, archived: false },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
      take: limit
    });
  }

  /** Assistant-only: [{ name, partCount }] counting only storefront-visible parts. */
  async countCustomerPartsByCategory() {
    const rows = await prisma.category.findMany({
      select: { name: true, _count: { select: { parts: { where: { published: true, archived: false } } } } },
      orderBy: { name: 'asc' }
    });
    return rows.map((c) => ({ name: c.name, partCount: c._count.parts }));
  }

  async findPartById(id) {
    return prisma.part.findUnique({ where: { id } });
  }

  async findCategoryById(id) {
    return prisma.category.findUnique({ where: { id } });
  }

  async createPart(data) {
    return prisma.part.create({
      data,
      include: { category: true }
    });
  }

  async executeTransaction(callback) {
    return prisma.$transaction(callback);
  }

  /**
   * Lock the part row for the rest of the transaction and return its current
   * stock, so concurrent stock edits serialize instead of both reading the
   * same "old stock".
   */
  async lockPartStock(id, client = prisma) {
    const rows = await client.$queryRaw`SELECT stock FROM "Part" WHERE id = ${id}::uuid FOR UPDATE`;
    return rows[0]?.stock ?? null;
  }

  async updatePart(id, data, client = prisma) {
    return client.part.update({
      where: { id },
      data,
      include: { category: true }
    });
  }

  async findLatestAdjustmentByDate(dateStr, client = prisma) {
    return client.stockAdjustment.findFirst({
      where: { adjustmentNumber: { startsWith: `SA-${dateStr}-` } },
      orderBy: { adjustmentNumber: 'desc' }
    });
  }

  async createStockAdjustment(data, client = prisma) {
    return client.stockAdjustment.create({ data });
  }
}

export const partsRepository = new PartsRepository();

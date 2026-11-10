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

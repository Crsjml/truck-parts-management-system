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

  async updatePart(id, data) {
    return prisma.part.update({
      where: { id },
      data,
      include: { category: true }
    });
  }

  async createStockAdjustment(data) {
    return prisma.stockAdjustment.create({ data });
  }
}

export const partsRepository = new PartsRepository();

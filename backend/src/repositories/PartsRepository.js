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
}

export const partsRepository = new PartsRepository();

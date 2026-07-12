// backend/src/repositories/SuppliersRepository.js
import { prisma } from '../config/prisma.js';

class SuppliersRepository {
  async findMany(archived) {
    return await prisma.supplier.findMany({
      where: { archived: archived === 'true' },
      include: { categories: true },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id) {
    return await prisma.supplier.findUnique({ where: { id } });
  }

  async create(data) {
    return await prisma.supplier.create({
      data,
      include: { categories: true }
    });
  }

  async update(id, data) {
    return await prisma.supplier.update({
      where: { id },
      data,
      include: { categories: true }
    });
  }

  async setArchivedStatus(id, archivedStatus) {
    return await prisma.supplier.update({
      where: { id },
      data: { archived: archivedStatus }
    });
  }
}

export default new SuppliersRepository();

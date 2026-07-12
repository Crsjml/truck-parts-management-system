// backend/src/repositories/CategoriesRepository.js
import { prisma } from '../config/prisma.js';

class CategoriesRepository {
  async findAll() {
    return await prisma.category.findMany({
      include: {
        parentCategory: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async findById(id) {
    return await prisma.category.findUnique({ where: { id } });
  }

  async findByName(name, excludeId = null) {
    const where = {
      name: { equals: name, mode: 'insensitive' }
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    return await prisma.category.findFirst({ where });
  }

  async create(data) {
    return await prisma.category.create({
      data,
      include: {
        parentCategory: { select: { name: true } }
      }
    });
  }

  async update(id, data) {
    return await prisma.category.update({
      where: { id },
      data,
      include: {
        parentCategory: { select: { name: true } }
      }
    });
  }

  async delete(id) {
    return await prisma.category.delete({
      where: { id }
    });
  }

  async hasChildren(id) {
    const child = await prisma.category.findFirst({ where: { parentCategoryId: id } });
    return !!child;
  }

  async hasParts(id) {
    const part = await prisma.part.findFirst({ where: { categoryId: id } });
    return !!part;
  }
}

export default new CategoriesRepository();

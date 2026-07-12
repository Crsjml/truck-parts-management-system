// backend/src/repositories/PurchaseOrdersRepository.js
import { prisma } from '../config/prisma.js';

class PurchaseOrdersRepository {
  async findMany() {
    return await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: { part: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id) {
    return await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, supplier: true }
    });
  }

  async findLatestByDate(dateStr) {
    return await prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: `PO-${dateStr}-` } },
      orderBy: { poNumber: 'desc' }
    });
  }

  async create(data) {
    return await prisma.purchaseOrder.create({
      data,
      include: { supplier: true }
    });
  }

  async update(id, data) {
    return await prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        items: { include: { part: true } }
      }
    });
  }

  // Wrapper for executing a series of operations in a transaction
  async executeTransaction(callback) {
    return await prisma.$transaction(callback);
  }
}

export default new PurchaseOrdersRepository();

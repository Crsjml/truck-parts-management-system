// backend/src/repositories/TransactionsRepository.js
import { prisma } from '../config/prisma.js';

class TransactionsRepository {
  async findMany() {
    return await prisma.transaction.findMany({
      include: { items: { include: { part: true } } },
      orderBy: { transactionDate: 'desc' },
      take: 100
    });
  }

  async executeTransaction(callback) {
    return await prisma.$transaction(callback);
  }

  async update(id, data) {
    return await prisma.transaction.update({
      where: { id },
      data,
      include: { items: true }
    });
  }
}

export default new TransactionsRepository();

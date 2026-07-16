// backend/src/services/TransactionsService.js
import transactionsRepository from '../repositories/TransactionsRepository.js';

class TransactionsService {
  async getTransactions() {
    return await transactionsRepository.findMany();
  }

  async updateStatus(id, status) {
    return await transactionsRepository.executeTransaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!transaction) throw new Error('Transaction not found.');

      if (transaction.status === status) return transaction;

      if (transaction.status === 'Completed' || transaction.status === 'Cancelled') {
        throw new Error(`Cannot change status of a ${transaction.status} transaction.`);
      }

      if (status === 'Completed') {
        for (const item of transaction.items) {
          await tx.part.update({
            where: { id: item.partId },
            data: { 
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity } 
            }
          });
        }
      } else if (status === 'Cancelled') {
        for (const item of transaction.items) {
          await tx.part.update({
            where: { id: item.partId },
            data: { reservedStock: { decrement: item.quantity } }
          });
        }
      }

      return await tx.transaction.update({
        where: { id },
        data: { status }
      });
    });
  }

  async createTransaction(data, userId) {
    const {
      invoiceNumber,
      customerName,
      customerContact,
      items,
      discount,
      tax,
      subtotal,
      taxAmount,
      total,
      transactionDate
    } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Transaction must contain at least one item.');
    }

    return await transactionsRepository.executeTransaction(async (tx) => {
      // Process stock deduction
      for (const item of items) {
        const part = await tx.part.findUnique({ where: { id: item.partId } });
        if (!part) {
          throw new Error(`Part not found: ${item.name} (${item.partId})`);
        }
        
        const available = part.stock - part.reservedStock;
        if (available < item.quantity) {
          throw new Error(`Insufficient available stock for ${part.name}. Available: ${available}, Requested: ${item.quantity}`);
        }

        await tx.part.update({
          where: { id: item.partId },
          data: { reservedStock: { increment: item.quantity } }
        });
      }

      // Create transaction record
      return await tx.transaction.create({
        data: {
          invoiceNumber,
          customerName: customerName || 'Walk-in Customer',
          customerContact: customerContact || 'N/A',
          userId: userId || null,
          discount: Number(discount) || 0,
          tax: Number(tax) || 12,
          subtotal: Number(subtotal),
          taxAmount: Number(taxAmount),
          total: Number(total),
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          items: {
            create: items.map(i => ({
              partId: i.partId,
              name: i.name,
              quantity: Number(i.quantity),
              price: Number(i.price)
            }))
          }
        },
        include: { items: true }
      });
    });
  }
}

export default new TransactionsService();

// backend/src/services/PurchaseOrdersService.js
import purchaseOrdersRepository from '../repositories/PurchaseOrdersRepository.js';

class PurchaseOrdersService {
  async generatePONumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastPO = await purchaseOrdersRepository.findLatestByDate(dateStr);

    let sequence = 1;
    if (lastPO) {
      const parts = lastPO.poNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }
    return `PO-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  async getPurchaseOrders() {
    return await purchaseOrdersRepository.findMany();
  }

  async createPurchaseOrder(data) {
    const { supplier, items, expectedDeliveryDate, notes, sourceRfq, createdBy } = data;
    
    if (!supplier || !items || items.length === 0) {
      throw new Error('Supplier and items are required.');
    }
    if (!expectedDeliveryDate) {
      throw new Error('Expected delivery date is required.');
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const poNumber = await this.generatePONumber();

    return await purchaseOrdersRepository.create({
      poNumber,
      supplierId: supplier,
      totalAmount,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      notes: notes?.trim() || '',
      sourceRfq: sourceRfq?.trim() || '',
      createdBy: createdBy?.trim() || 'Admin',
      items: {
        create: items.map(i => ({
          partId: i.partId,
          name: i.name,
          sku: i.sku || '',
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.quantity) * Number(i.unitPrice)
        }))
      }
    });
  }

  async updatePOStatus(id, status) {
    return await purchaseOrdersRepository.executeTransaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!po) throw new Error('Purchase Order not found.');

      // Prevent moving backwards from terminal states
      if (po.status === 'Received' || po.status === 'Cancelled') {
        throw new Error(`Cannot change status of a ${po.status} order.`);
      }

      // Stock increment on Received
      if (status === 'Received' && po.status !== 'Received') {
        for (const item of po.items) {
          await tx.part.update({
            where: { id: item.partId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }

      const confirmationDate = (status === 'Confirmed' && po.status !== 'Confirmed') 
        ? new Date() 
        : po.confirmationDate;

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          status,
          confirmationDate
        },
        include: {
          supplier: true,
          items: { include: { part: true } }
        }
      });
    });
  }

  async updateBillingStatus(id, billingStatus) {
    const allowed = ['Waiting Bills', 'Bills Received'];
    if (!allowed.includes(billingStatus)) {
      throw new Error('Invalid billing status.');
    }

    const po = await purchaseOrdersRepository.findById(id);
    if (!po) {
      const err = new Error('Purchase Order not found.');
      err.status = 404;
      throw err;
    }

    return await purchaseOrdersRepository.update(id, { billingStatus });
  }
}

export default new PurchaseOrdersService();

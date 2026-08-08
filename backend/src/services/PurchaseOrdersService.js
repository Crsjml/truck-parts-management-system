// backend/src/services/PurchaseOrdersService.js
import purchaseOrdersRepository from '../repositories/PurchaseOrdersRepository.js';

export const PAYMENT_DUE_SOON_DAYS = 7;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const roundCents = (value) => Math.round(Number(value) * 100);
const centsToMoney = (cents) => cents / 100;

const parseMoneyCents = (value, label) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return roundCents(amount);
};

const parseQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Item quantity must be a positive whole number.');
  }
  return quantity;
};

const parseOptionalDate = (value, label) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
};

const normalizeDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const calculatePurchaseItems = (items) => {
  let totalCents = 0;
  const calculatedItems = items.map((item) => {
    const quantity = parseQuantity(item.quantity);
    const unitPriceCents = parseMoneyCents(item.unitPrice, 'Item price');
    const subtotalCents = quantity * unitPriceCents;
    totalCents += subtotalCents;

    return {
      partId: item.partId,
      name: item.name,
      sku: item.sku || '',
      quantity,
      unitPrice: centsToMoney(unitPriceCents),
      subtotal: centsToMoney(subtotalCents)
    };
  });

  return {
    items: calculatedItems,
    totalAmount: centsToMoney(totalCents)
  };
};

const getPaymentStatus = (po, today = new Date()) => {
  if (po.paidAt) return 'Paid';
  if (!po.paymentDueDate) return 'Pending';

  const dueDate = normalizeDay(po.paymentDueDate);
  const currentDate = normalizeDay(today);
  const daysUntilDue = Math.ceil((dueDate - currentDate) / MS_PER_DAY);

  if (daysUntilDue < 0) return 'Overdue';
  if (daysUntilDue <= PAYMENT_DUE_SOON_DAYS) return 'Due Soon';
  return 'Pending';
};

const withPaymentStatus = (po, today) => ({
  ...po,
  amountDue: Number(po.totalAmount) || 0,
  paymentStatus: getPaymentStatus(po, today)
});

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

  async getPurchaseOrders(today = new Date()) {
    const purchaseOrders = await purchaseOrdersRepository.findMany();
    return purchaseOrders.map(po => withPaymentStatus(po, today));
  }

  async createPurchaseOrder(data) {
    const { supplier, items, expectedDeliveryDate, paymentDueDate, notes, sourceRfq, createdBy } = data;
    
    if (!supplier || !items || items.length === 0) {
      throw new Error('Supplier and items are required.');
    }
    if (!expectedDeliveryDate) {
      throw new Error('Expected delivery date is required.');
    }

    const calculated = calculatePurchaseItems(items);

    const MAX_PO_NUMBER_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_PO_NUMBER_ATTEMPTS; attempt++) {
      const poNumber = await this.generatePONumber();
      try {
        return await purchaseOrdersRepository.create({
          poNumber,
          supplierId: supplier,
          totalAmount: calculated.totalAmount,
          expectedDeliveryDate: parseOptionalDate(expectedDeliveryDate, 'Expected delivery date'),
          paymentDueDate: parseOptionalDate(paymentDueDate, 'Payment deadline'),
          notes: notes?.trim() || '',
          sourceRfq: sourceRfq?.trim() || '',
          createdBy: createdBy?.trim() || 'Admin',
          items: {
            create: calculated.items
          }
        });
      } catch (error) {
        const isPoNumberCollision = error.code === 'P2002' && error.meta?.target?.includes('poNumber');
        if (!isPoNumberCollision || attempt === MAX_PO_NUMBER_ATTEMPTS) {
          throw error;
        }
      }
    }
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

      // Stock increment and base price (procurement cost) update on Received
      if (status === 'Received' && po.status !== 'Received') {
        for (const item of po.items) {
          await tx.part.update({
            where: { id: item.partId },
            data: { 
              stock: { increment: item.quantity },
              price: item.unitPrice // Update base cost to newest quoted price
            }
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

  async updatePurchaseOrderDetails(id, data) {
    const po = await purchaseOrdersRepository.findById(id);
    if (!po) {
      const err = new Error('Purchase Order not found.');
      err.status = 404;
      throw err;
    }
    if (!['Draft', 'RFQ Sent'].includes(po.status)) {
      throw new Error(`Cannot edit details on a ${po.status} order.`);
    }

    const updateData = {};
    if (Object.prototype.hasOwnProperty.call(data, 'expectedDeliveryDate')) {
      if (!data.expectedDeliveryDate) throw new Error('Expected delivery date is required.');
      updateData.expectedDeliveryDate = parseOptionalDate(data.expectedDeliveryDate, 'Expected delivery date');
    }
    if (Object.prototype.hasOwnProperty.call(data, 'paymentDueDate')) {
      updateData.paymentDueDate = parseOptionalDate(data.paymentDueDate, 'Payment deadline');
    }
    if (Object.prototype.hasOwnProperty.call(data, 'notes')) {
      updateData.notes = data.notes?.trim() || '';
    }
    if (Object.prototype.hasOwnProperty.call(data, 'sourceRfq')) {
      updateData.sourceRfq = data.sourceRfq?.trim() || '';
    }

    const updatedPo = await purchaseOrdersRepository.update(id, updateData);
    return withPaymentStatus(updatedPo, new Date());
  }

  async updatePayment(id, paymentData) {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(paymentData, 'paidAt')) {
      data.paidAt = paymentData.paidAt === null
        ? null
        : parseOptionalDate(paymentData.paidAt, 'Payment date');
    } else {
      data.paidAt = new Date();
    }

    if (Object.prototype.hasOwnProperty.call(paymentData, 'paymentReference')) {
      data.paymentReference = paymentData.paymentReference?.trim() || '';
    }
    if (Object.prototype.hasOwnProperty.call(paymentData, 'paymentNotes')) {
      data.paymentNotes = paymentData.paymentNotes?.trim() || '';
    }

    const updatedPo = await purchaseOrdersRepository.update(id, data);
    return withPaymentStatus(updatedPo, new Date());
  }

  // Update quoted prices on PO items (after supplier reply).
  // items: [{ id, unitPrice }]
  async updateItemPrices(id, items) {
    return await purchaseOrdersRepository.executeTransaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) throw new Error('Purchase Order not found.');
      if (po.status === 'Received' || po.status === 'Cancelled') {
        throw new Error(`Cannot edit prices on a ${po.status} order.`);
      }

      // Patch each item
      for (const { id: itemId, unitPrice } of items) {
        const qty = po.items.find(i => i.id === itemId)?.quantity;
        if (!qty) throw new Error('Purchase order item not found.');
        const unitPriceCents = parseMoneyCents(unitPrice, 'Quoted price');
        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data: {
            unitPrice: centsToMoney(unitPriceCents),
            subtotal: centsToMoney(qty * unitPriceCents)
          }
        });
      }

      // Recalculate PO total
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const totalAmount = centsToMoney(updatedItems.reduce((s, i) => s + roundCents(i.subtotal), 0));

      return await tx.purchaseOrder.update({
        where: { id },
        data: { totalAmount },
        include: { supplier: true, items: { include: { part: true } } }
      });
    });
  }
}

export default new PurchaseOrdersService();

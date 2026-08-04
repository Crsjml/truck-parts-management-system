// backend/src/services/TransactionsService.js
import transactionsRepository from '../repositories/TransactionsRepository.js';
import { prisma } from '../config/prisma.js';

class TransactionsService {
  async getTransactions() {
    return await transactionsRepository.findMany();
  }

  async getTransactionsForCustomer(userId, email) {
    if (!userId) return [];
    
    // First lookup customer to find if they have a registered phone number
    const customer = await prisma.customer.findUnique({
      where: { authId: userId }
    });

    const contact = customer?.phoneNumber;
    const orFilters = [
      { userId },
    ];
    if (email) {
      orFilters.push({ customerEmail: { equals: email, mode: 'insensitive' } });
    }
    if (contact && contact !== 'N/A') {
      orFilters.push({ customerContact: contact });
    }

    return await prisma.transaction.findMany({
      where: { OR: orFilters },
      include: { items: { include: { part: { include: { category: true } } } } },
      orderBy: { transactionDate: 'desc' },
      take: 100
    });
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

  async createTransaction(data, userId, processedBy = '') {
    const {
      invoiceNumber,
      customerName,
      customerContact,
      customerEmail,
      items,
      discount,
      tax,
      subtotal,
      taxAmount,
      total,
      transactionDate,
      status,
      paymentMethod,
      amountTendered,
      changeGiven,
      chequeNumber,
      chequeBank,
      chequeDate,
      gcashReference
    } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Transaction must contain at least one item.');
    }

    // Walk-in counter sales are paid and collected on the spot, so they are
    // created already COMPLETED and deduct stock outright. Online orders omit
    // `status` and keep the original reserve-until-pickup behaviour.
    const isImmediateSale = status === 'COMPLETED';

    return await transactionsRepository.executeTransaction(async (tx) => {
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
          data: isImmediateSale
            ? { stock: { decrement: item.quantity } }
            : { reservedStock: { increment: item.quantity } }
        });
      }

      // 2. Look up or create Customer record for FTF sale
      // ponytail: only match temp- (FTF) records — never link POS sales to
      // real Supabase online accounts. Online buying ≠ walk-in buying.
      let finalUserId = null;
      if (customerEmail || (customerContact && customerContact !== 'N/A')) {
        const orFilters = [];
        if (customerEmail) orFilters.push({ email: customerEmail.toLowerCase().trim() });
        if (customerContact && customerContact !== 'N/A') orFilters.push({ phoneNumber: customerContact.trim() });

        if (orFilters.length > 0) {
          const existingCustomer = await tx.customer.findFirst({
            where: {
              authId: { startsWith: 'temp-' },
              OR: orFilters
            }
          });

          if (existingCustomer) {
            finalUserId = existingCustomer.authId;
          } else {
            const tempAuthId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // ponytail: if the provided email already belongs to an online
            // account, use a dummy @ttp.local email for the FTF record to
            // avoid a unique constraint violation. The real email is still
            // stored on the Transaction row itself (customerEmail field).
            let dummyEmail;
            if (customerEmail) {
              const emailTaken = await tx.customer.findUnique({
                where: { email: customerEmail.toLowerCase().trim() }
              });
              dummyEmail = emailTaken
                ? `temp-ftf-${tempAuthId}@ttp.local`
                : customerEmail.toLowerCase().trim();
            } else {
              dummyEmail = `temp-phone-${(customerContact || '').replace(/\D/g, '') || tempAuthId}@ttp.local`;
            }
            
            const newCustomer = await tx.customer.create({
              data: {
                authId: tempAuthId,
                email: dummyEmail,
                displayName: customerName || 'Walk-in Customer',
                phoneNumber: customerContact && customerContact !== 'N/A' ? customerContact.trim() : '',
                companyName: ''
              }
            });
            finalUserId = newCustomer.authId;
          }
        }
      }

      if (!finalUserId) {
        finalUserId = userId || null;
      }

      return await tx.transaction.create({
        data: {
          invoiceNumber,
          customerName: customerName || 'Walk-in Customer',
          customerContact: customerContact || 'N/A',
          customerEmail: customerEmail || '',
          userId: finalUserId,
          discount: Number(discount) || 0,
          tax: Number(tax) || 12,
          subtotal: Number(subtotal),
          taxAmount: Number(taxAmount),
          total: Number(total),
          status: isImmediateSale ? 'COMPLETED' : 'ORDER_PLACED',
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          paymentMethod: paymentMethod || 'CASH',
          processedBy: processedBy || '',
          amountTendered: amountTendered != null ? Number(amountTendered) : null,
          changeGiven: changeGiven != null ? Number(changeGiven) : null,
          chequeNumber: chequeNumber || null,
          chequeBank: chequeBank || null,
          chequeDate: chequeDate ? new Date(chequeDate) : null,
          gcashReference: gcashReference || null,
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

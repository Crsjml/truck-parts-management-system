import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/transactions — requires login
router.post('/', requireAuth, async (req, res) => {
  try {
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
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'Transaction must contain at least one item.' });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Process stock deduction
      for (const item of items) {
        const part = await tx.part.findUnique({ where: { id: item.partId } });
        if (!part) {
          throw new Error(`Part not found: ${item.name} (${item.partId})`);
        }
        
        if (part.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${part.name}. Available: ${part.stock}, Requested: ${item.quantity}`);
        }

        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Create transaction record
      return await tx.transaction.create({
        data: {
          invoiceNumber,
          customerName: customerName || 'Walk-in Customer',
          customerContact: customerContact || 'N/A',
          userId: req.auth?.userId || null,
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

    res.status(201).json({
      msg: 'Transaction created and stock deducted successfully.',
      transaction
    });
  } catch (error) {
    console.error('Transaction Error:', error);
    res.status(400).json({ msg: error.message || 'Failed to process transaction.' });
  }
});

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { items: { include: { part: true } } },
      orderBy: { transactionDate: 'desc' },
      take: 100
    });
    res.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;

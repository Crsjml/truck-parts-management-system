import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Part from '../models/Part.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/transactions (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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
      throw new Error('Transaction must contain at least one item.');
    }

    // Process stock deduction
    for (const item of items) {
      const part = await Part.findById(item.partId).session(session);
      if (!part) {
        throw new Error(`Part not found: ${item.name} (${item.partId})`);
      }
      
      if (part.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${part.name}. Available: ${part.stock}, Requested: ${item.quantity}`);
      }

      part.stock -= item.quantity;
      await part.save({ session });
    }

    // Create transaction record
    const transaction = new Transaction({
      invoiceNumber,
      customerName,
      customerContact,
      items,
      discount,
      tax,
      subtotal,
      taxAmount,
      total,
      transactionDate: transactionDate || new Date()
    });

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      msg: 'Transaction created and stock deducted successfully.',
      transaction
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Transaction Error:', error);
    res.status(400).json({ msg: error.message || 'Failed to process transaction.' });
  }
});

// GET /api/transactions
router.get('/', requireAuth, async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ transactionDate: -1 }).limit(100);
    res.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;

import express from 'express';
import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Part from '../models/Part.js';

const router = express.Router();

// Generate unique PO Number (PO-YYYYMMDD-XXXX)
const generatePONumber = async () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const lastPO = await PurchaseOrder.findOne({ poNumber: new RegExp(`^PO-${dateStr}-`) }).sort({ poNumber: -1 });
  let sequence = 1;
  if (lastPO) {
    const parts = lastPO.poNumber.split('-');
    sequence = parseInt(parts[2], 10) + 1;
  }
  return `PO-${dateStr}-${sequence.toString().padStart(4, '0')}`;
};

// Get all POs
router.get('/', async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('supplier')
      .populate('items.partId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(pos);
  } catch (err) {
    console.error('[get POs]', err);
    res.status(500).json({ msg: 'Server error fetching POs.' });
  }
});

// Create PO (RFQ Draft)
router.post('/', async (req, res) => {
  try {
    const { supplier, items, expectedDeliveryDate, notes, sourceRfq, createdBy } = req.body;
    
    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ msg: 'Supplier and items are required.' });
    }
    if (!expectedDeliveryDate) {
      return res.status(400).json({ msg: 'Expected delivery date is required.' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const poNumber = await generatePONumber();

    const po = await PurchaseOrder.create({
      poNumber,
      supplier,
      items: items.map(i => ({
        partId: i.partId,
        name: i.name,
        sku: i.sku,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.quantity) * Number(i.unitPrice)
      })),
      totalAmount,
      expectedDeliveryDate,
      notes: notes?.trim() || '',
      sourceRfq: sourceRfq?.trim() || '',
      createdBy: createdBy?.trim() || 'Admin'
    });

    const populated = await po.populate('supplier');
    res.status(201).json(populated);
  } catch (err) {
    console.error('[create PO]', err);
    res.status(500).json({ msg: 'Server error creating PO.' });
  }
});

// Update PO Status — includes stock increment on Received + confirmationDate
router.put('/:id/status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const poId = req.params.id;

    const po = await PurchaseOrder.findById(poId).session(session);
    if (!po) throw new Error('Purchase Order not found.');

    // Prevent moving backwards from terminal states
    if (po.status === 'Received' || po.status === 'Cancelled') {
      throw new Error(`Cannot change status of a ${po.status} order.`);
    }

    // Stock increment on Received
    if (status === 'Received' && po.status !== 'Received') {
      for (const item of po.items) {
        const part = await Part.findById(item.partId).session(session);
        if (part) {
          part.stock += item.quantity;
          await part.save({ session });
        }
      }
    }

    // Set confirmationDate when first Confirmed
    if (status === 'Confirmed' && po.status !== 'Confirmed') {
      po.confirmationDate = new Date();
    }

    po.status = status;
    await po.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await PurchaseOrder.findById(poId)
      .populate('supplier')
      .populate('items.partId');

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[update PO status]', err);
    res.status(400).json({ msg: err.message || 'Server error updating PO status.' });
  }
});

// Update Billing Status
router.put('/:id/billing', async (req, res) => {
  try {
    const { billingStatus } = req.body;
    const allowed = ['Waiting Bills', 'Bills Received'];
    if (!allowed.includes(billingStatus)) {
      return res.status(400).json({ msg: 'Invalid billing status.' });
    }
    const po = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { billingStatus },
      { new: true }
    ).populate('supplier');
    if (!po) return res.status(404).json({ msg: 'Purchase Order not found.' });
    res.json(po);
  } catch (err) {
    console.error('[update billing status]', err);
    res.status(500).json({ msg: 'Server error updating billing status.' });
  }
});

export default router;

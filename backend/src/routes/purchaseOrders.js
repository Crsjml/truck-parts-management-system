import express from 'express';
import { prisma } from '../config/prisma.js';

const router = express.Router();

// Generate unique PO Number (PO-YYYYMMDD-XXXX)
const generatePONumber = async () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: `PO-${dateStr}-` } },
    orderBy: { poNumber: 'desc' }
  });

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
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: { part: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
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

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const poNumber = await generatePONumber();

    const po = await prisma.purchaseOrder.create({
      data: {
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
      },
      include: { supplier: true }
    });

    res.status(201).json(po);
  } catch (err) {
    console.error('[create PO]', err);
    res.status(500).json({ msg: 'Server error creating PO.' });
  }
});

// Update PO Status — includes stock increment on Received + confirmationDate
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const updatedPo = await prisma.$transaction(async (tx) => {
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

    res.json(updatedPo);
  } catch (err) {
    console.error('[update PO status]', err);
    res.status(400).json({ msg: err.message || 'Server error updating PO status.' });
  }
});

// Update Billing Status
router.put('/:id/billing', async (req, res) => {
  try {
    const { billingStatus } = req.body;
    const { id } = req.params;

    const allowed = ['Waiting Bills', 'Bills Received'];
    if (!allowed.includes(billingStatus)) {
      return res.status(400).json({ msg: 'Invalid billing status.' });
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { billingStatus },
      include: { supplier: true }
    });

    res.json(po);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Purchase Order not found.' });
    }
    console.error('[update billing status]', err);
    res.status(500).json({ msg: 'Server error updating billing status.' });
  }
});

export default router;

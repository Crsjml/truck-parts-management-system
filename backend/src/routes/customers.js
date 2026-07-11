import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();

// GET /api/customers/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const authId = req.auth.userId;
    const email = req.auth.email || '';

    let customer = await prisma.customer.findUnique({ where: { authId } });

    if (!customer) {
      // Auto-create on first fetch
      customer = await prisma.customer.create({
        data: {
          authId,
          email,
          displayName: req.auth.user_metadata?.full_name || req.auth.name || '',
          photoURL: req.auth.user_metadata?.avatar_url || req.auth.picture || '',
          phone: req.auth.user_metadata?.contact_number || req.auth.phone || ''
        }
      });
    }

    res.json(customer);
  } catch (err) {
    console.error('[get customer]', err);
    res.status(500).json({ msg: 'Server error fetching profile.' });
  }
});

// PUT /api/customers/me
router.put('/me', requireAuth, async (req, res) => {
  try {
    const authId = req.auth.userId;
    const { displayName, phoneNumber, photoURL } = req.body;

    let customer = await prisma.customer.findUnique({ where: { authId } });
    if (!customer) {
      return res.status(404).json({ msg: 'Customer profile not found.' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { authId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(photoURL !== undefined && { photoURL })
      }
    });

    res.json(updatedCustomer);
  } catch (err) {
    console.error('[update customer]', err);
    res.status(500).json({ msg: 'Server error updating profile.' });
  }
});

export default router;

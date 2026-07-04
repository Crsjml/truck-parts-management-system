import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// GET /api/customers/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const firebaseUid = req.auth.userId;
    const email = req.auth.email || '';

    let customer = await Customer.findOne({ firebaseUid });

    if (!customer) {
      // Auto-create on first fetch
      customer = await Customer.create({
        firebaseUid,
        email,
        displayName: req.auth.name || '',
        photoURL: req.auth.picture || ''
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
    const firebaseUid = req.auth.userId;
    const { displayName, phoneNumber, photoURL } = req.body;

    let customer = await Customer.findOne({ firebaseUid });
    if (!customer) {
      return res.status(404).json({ msg: 'Customer profile not found.' });
    }

    if (displayName !== undefined) customer.displayName = displayName;
    if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber;
    if (photoURL !== undefined) customer.photoURL = photoURL;

    await customer.save();

    res.json(customer);
  } catch (err) {
    console.error('[update customer]', err);
    res.status(500).json({ msg: 'Server error updating profile.' });
  }
});

export default router;

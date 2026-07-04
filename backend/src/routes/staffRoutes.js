// backend/src/routes/staffRoutes.js
import express from 'express';
import StaffRole from '../models/StaffRole.js';

const router = express.Router();

// Get all staff roles
router.get('/', async (req, res) => {
  try {
    const staff = await StaffRole.find({}).sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    console.error('[get staff]', err);
    res.status(500).json({ msg: 'Server error fetching staff roles.' });
  }
});

// Check access for a specific email
router.post('/check', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });
    
    // Super admin override logic is still mostly handled on frontend, but we can return default Super Admin if needed
    if (email.includes('admin') || email.includes('tarlac') || email === 'rbenedict.maagma@gmail.com' || email === 'azhoraaaa@gmail.com') {
      return res.json({
        email,
        role: 'SUPERADMIN',
        permissions: {
          canManageCatalog: true,
          canViewFinances: true,
          canProcessOrders: true,
          canManageStaff: true
        }
      });
    }

    const staff = await StaffRole.findOne({ email: email.toLowerCase() });
    if (!staff) {
      return res.status(404).json({ msg: 'Not authorized as staff' });
    }
    
    res.json(staff);
  } catch (err) {
    console.error('[check staff]', err);
    res.status(500).json({ msg: 'Server error checking staff role.' });
  }
});

// Create new staff role
router.post('/', async (req, res) => {
  try {
    const { email, role, permissions, addedBy } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const existing = await StaffRole.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ msg: 'Staff email already exists' });
    }

    const staff = await StaffRole.create({
      email: email.toLowerCase(),
      role: role || 'STAFF',
      permissions: permissions || {},
      addedBy: addedBy || 'system'
    });
    
    res.status(201).json(staff);
  } catch (err) {
    console.error('[create staff]', err);
    res.status(500).json({ msg: 'Server error creating staff role.' });
  }
});

// Update staff role
router.put('/:id', async (req, res) => {
  try {
    const { role, permissions } = req.body;
    const staff = await StaffRole.findByIdAndUpdate(
      req.params.id,
      { role, permissions },
      { new: true }
    );
    if (!staff) return res.status(404).json({ msg: 'Staff not found' });
    res.json(staff);
  } catch (err) {
    console.error('[update staff]', err);
    res.status(500).json({ msg: 'Server error updating staff role.' });
  }
});

// Delete staff role
router.delete('/:id', async (req, res) => {
  try {
    const staff = await StaffRole.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ msg: 'Staff not found' });
    res.json({ msg: 'Staff deleted successfully' });
  } catch (err) {
    console.error('[delete staff]', err);
    res.status(500).json({ msg: 'Server error deleting staff role.' });
  }
});

export default router;

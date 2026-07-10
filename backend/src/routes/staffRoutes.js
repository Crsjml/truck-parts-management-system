import express from 'express';
import { prisma } from '../config/prisma.js';

const router = express.Router();

// Get all staff roles
router.get('/', async (req, res) => {
  try {
    const staff = await prisma.staffRole.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to expected format for frontend if needed
    const formattedStaff = staff.map(s => ({
      id: s.id,
      email: s.email,
      role: s.role,
      permissions: {
        canManageCatalog: s.canManageCatalog,
        canViewFinances: s.canViewFinances,
        canProcessOrders: s.canProcessOrders,
        canManageStaff: s.canManageStaff
      },
      addedBy: s.addedBy,
      createdAt: s.createdAt
    }));
    
    res.json(formattedStaff);
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
    
    const lowerEmail = email.toLowerCase();

    // Super admin override logic
    if (lowerEmail.includes('admin') || lowerEmail.includes('tarlac') || lowerEmail === 'rbenedict.maagma@gmail.com' || lowerEmail === 'azhoraaaa@gmail.com') {
      return res.json({
        email: lowerEmail,
        role: 'SUPERADMIN',
        permissions: {
          canManageCatalog: true,
          canViewFinances: true,
          canProcessOrders: true,
          canManageStaff: true
        }
      });
    }

    const staff = await prisma.staffRole.findUnique({
      where: { email: lowerEmail }
    });

    if (!staff) {
      return res.status(404).json({ msg: 'Not authorized as staff' });
    }
    
    res.json({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: {
        canManageCatalog: staff.canManageCatalog,
        canViewFinances: staff.canViewFinances,
        canProcessOrders: staff.canProcessOrders,
        canManageStaff: staff.canManageStaff
      },
      addedBy: staff.addedBy
    });
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

    const lowerEmail = email.toLowerCase();
    const existing = await prisma.staffRole.findUnique({
      where: { email: lowerEmail }
    });

    if (existing) {
      return res.status(409).json({ msg: 'Staff email already exists' });
    }

    const staff = await prisma.staffRole.create({
      data: {
        email: lowerEmail,
        role: role || 'STAFF',
        canManageCatalog: permissions?.canManageCatalog ?? true,
        canViewFinances: permissions?.canViewFinances ?? false,
        canProcessOrders: permissions?.canProcessOrders ?? true,
        canManageStaff: permissions?.canManageStaff ?? false,
        addedBy: addedBy || 'system'
      }
    });
    
    res.status(201).json({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: {
        canManageCatalog: staff.canManageCatalog,
        canViewFinances: staff.canViewFinances,
        canProcessOrders: staff.canProcessOrders,
        canManageStaff: staff.canManageStaff
      },
      addedBy: staff.addedBy
    });
  } catch (err) {
    console.error('[create staff]', err);
    res.status(500).json({ msg: 'Server error creating staff role.' });
  }
});

// Update staff role
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;
    
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (permissions) {
      if (permissions.canManageCatalog !== undefined) updateData.canManageCatalog = permissions.canManageCatalog;
      if (permissions.canViewFinances !== undefined) updateData.canViewFinances = permissions.canViewFinances;
      if (permissions.canProcessOrders !== undefined) updateData.canProcessOrders = permissions.canProcessOrders;
      if (permissions.canManageStaff !== undefined) updateData.canManageStaff = permissions.canManageStaff;
    }

    const staff = await prisma.staffRole.update({
      where: { id },
      data: updateData
    });

    res.json({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      permissions: {
        canManageCatalog: staff.canManageCatalog,
        canViewFinances: staff.canViewFinances,
        canProcessOrders: staff.canProcessOrders,
        canManageStaff: staff.canManageStaff
      },
      addedBy: staff.addedBy
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Staff not found' });
    }
    console.error('[update staff]', err);
    res.status(500).json({ msg: 'Server error updating staff role.' });
  }
});

// Delete staff role
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.staffRole.delete({ where: { id } });
    res.json({ msg: 'Staff deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Staff not found' });
    }
    console.error('[delete staff]', err);
    res.status(500).json({ msg: 'Server error deleting staff role.' });
  }
});

export default router;

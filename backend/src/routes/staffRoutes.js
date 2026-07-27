import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all staff roles — auth + admin required
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const staff = await prisma.staffRole.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
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

// Check access for a specific email — auth only (must answer "am I staff?" without 403)
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });
    
    const lowerEmail = email.toLowerCase();

    const staff = await prisma.staffRole.findUnique({
      where: { email: lowerEmail }
    });

    if (!staff) {
      return res.status(200).json({ authorized: false, msg: 'Not authorized as staff' });
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

const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'STAFF'];

// Create new staff role — SUPERADMIN only
router.post('/', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { email, role, permissions, addedBy } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const safeRole = VALID_ROLES.includes(role) ? role : 'STAFF';
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
        role: safeRole,
        canManageCatalog: permissions?.canManageCatalog ?? true,
        canViewFinances: permissions?.canViewFinances ?? false,
        canProcessOrders: permissions?.canProcessOrders ?? true,
        canManageStaff: permissions?.canManageStaff ?? false,
        addedBy: addedBy || req.auth.email
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

// Update staff role — SUPERADMIN only
router.put('/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, permissions } = req.body;
    
    const updateData = {};
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ msg: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
      }
      updateData.role = role;
    }
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

// Delete staff role — SUPERADMIN only, with last-superadmin guard
router.delete('/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: cannot delete the last SUPERADMIN
    const target = await prisma.staffRole.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ msg: 'Staff not found' });

    if (target.role === 'SUPERADMIN') {
      const superadminCount = await prisma.staffRole.count({ where: { role: 'SUPERADMIN' } });
      if (superadminCount <= 1) {
        return res.status(409).json({ msg: 'Cannot delete the last SUPERADMIN. Promote another user first.' });
      }
    }

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

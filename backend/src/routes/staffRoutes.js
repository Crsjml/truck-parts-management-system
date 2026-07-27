import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const VALID_ROLES = ['SUPERADMIN', 'ADMIN'];

// The shape every staff endpoint returns. Kept in one place so a field added
// here cannot be forgotten in one of the four handlers.
const present = (s) => ({
  id: s.id,
  email: s.email,
  role: s.role,
  lastSeenAt: s.lastSeenAt,
  addedBy: s.addedBy,
  createdAt: s.createdAt
});

// Any admin may see who has access. Only a superadmin may change it.
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const staff = await prisma.staffRole.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(staff.map(present));
  } catch (err) {
    console.error('[get staff]', err);
    res.status(500).json({ msg: 'Server error fetching staff roles.' });
  }
});

// Auth only — this must answer "am I staff?" for a customer without a 403.
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const lowerEmail = String(email).toLowerCase();
    const staff = await prisma.staffRole.findUnique({ where: { email: lowerEmail } });

    if (!staff) {
      return res.status(200).json({ authorized: false, msg: 'Not authorized as staff' });
    }

    // This is the only place a staff sign-in is already observed, so it is
    // where lastSeenAt is stamped. A null lastSeenAt means "allowlisted but
    // has never signed in" — the roster renders that as Invited.
    await prisma.staffRole.update({
      where: { id: staff.id },
      data: { lastSeenAt: new Date() }
    });

    res.json({ id: staff.id, email: staff.email, role: staff.role, addedBy: staff.addedBy });
  } catch (err) {
    console.error('[check staff]', err);
    res.status(500).json({ msg: 'Server error checking staff role.' });
  }
});

router.post('/', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const safeRole = VALID_ROLES.includes(role) ? role : 'ADMIN';
    const lowerEmail = String(email).toLowerCase();

    const existing = await prisma.staffRole.findUnique({ where: { email: lowerEmail } });
    if (existing) return res.status(409).json({ msg: 'Staff email already exists' });

    const staff = await prisma.staffRole.create({
      data: { email: lowerEmail, role: safeRole, addedBy: req.auth.email }
    });

    res.status(201).json(present(staff));
  } catch (err) {
    console.error('[create staff]', err);
    res.status(500).json({ msg: 'Server error creating staff role.' });
  }
});

router.put('/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ msg: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const target = await prisma.staffRole.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ msg: 'Staff not found' });

    // Demoting the last superadmin leaves nobody able to manage staff or
    // settings, recoverable only by editing the database by hand.
    if (target.role === 'SUPERADMIN' && role !== 'SUPERADMIN') {
      const superadminCount = await prisma.staffRole.count({ where: { role: 'SUPERADMIN' } });
      if (superadminCount <= 1) {
        return res.status(409).json({ msg: 'Cannot demote the last superadmin. Promote another account first.' });
      }
    }

    const staff = await prisma.staffRole.update({ where: { id }, data: { role } });
    res.json(present(staff));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ msg: 'Staff not found' });
    console.error('[update staff]', err);
    res.status(500).json({ msg: 'Server error updating staff role.' });
  }
});

router.delete('/:id', requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const target = await prisma.staffRole.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ msg: 'Staff not found' });

    if (target.role === 'SUPERADMIN') {
      const superadminCount = await prisma.staffRole.count({ where: { role: 'SUPERADMIN' } });
      if (superadminCount <= 1) {
        return res.status(409).json({ msg: 'Cannot remove the last superadmin. Promote another account first.' });
      }
    }

    await prisma.staffRole.delete({ where: { id } });
    res.json({ msg: 'Staff deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ msg: 'Staff not found' });
    console.error('[delete staff]', err);
    res.status(500).json({ msg: 'Server error deleting staff role.' });
  }
});

export default router;

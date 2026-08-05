import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', requireAuth, async (req, res) => {
  try {
    const { userId: authId, email } = req.auth;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const lowerEmail = String(email).toLowerCase();
    const staff = await prisma.staffRole.findUnique({ where: { email: lowerEmail } });
    // Normalize role string to match existing conventions ('admin', 'superadmin', 'customer')
    const role = staff ? staff.role.toLowerCase() : 'customer';

    const log = await prisma.authLog.create({
      data: {
        authId,
        email: lowerEmail,
        role,
        ipAddress,
        userAgent
      }
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('[post auth log]', err);
    res.status(500).json({ msg: 'Server error creating auth log.' });
  }
});

router.get('/logins', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await prisma.authLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    res.json(logs);
  } catch (err) {
    console.error('[get auth logs]', err);
    res.status(500).json({ msg: 'Server error fetching auth logs.' });
  }
});

export default router;

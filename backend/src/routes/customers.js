import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();

const getOrCreateCustomer = async (auth) => {
  const authId = auth.userId;
  const email = auth.email || '';

  try {
    return await prisma.customer.upsert({
      where: { authId },
      create: {
        authId,
        email,
        displayName: auth.user_metadata?.full_name || auth.name || '',
        photoURL: auth.user_metadata?.avatar_url || auth.picture || '',
        phoneNumber: auth.user_metadata?.contact_number || auth.phone || ''
      },
      update: {}
    });
  } catch (err) {
    // If the email already exists under an old authId (e.g. account was deleted and recreated),
    // reconnect the existing customer record to the new authId.
    if (err.code === 'P2002' && email) {
      return await prisma.customer.update({
        where: { email },
        data: { authId }
      });
    }
    throw err;
  }
};

// GET /api/customers/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const customer = await getOrCreateCustomer(req.auth);
    const result = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        authId: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        photoURL: true,
        companyName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { savedParts: true }
        }
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[get customer]', err);
    res.status(500).json({ msg: 'Server error fetching profile.' });
  }
});

// PUT /api/customers/me
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { displayName, phoneNumber, photoURL, companyName } = req.body;

    // Guarantee the customer exists before updating
    const customer = await getOrCreateCustomer(req.auth);

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(photoURL !== undefined && { photoURL }),
        ...(companyName !== undefined && { companyName })
      }
    });

    res.json(updatedCustomer);
  } catch (err) {
    console.error('[update customer]', err);
    res.status(500).json({ msg: 'Server error updating profile.' });
  }
});

// GET /api/customers/saved-parts
router.get('/saved-parts', requireAuth, async (req, res) => {
  try {
    const customer = await getOrCreateCustomer(req.auth);
    const saved = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        savedParts: {
          where: { published: true, archived: false },
          select: { id: true }
        },
        _count: {
          select: { savedParts: { where: { published: true, archived: false } } }
        }
      }
    });

    res.json({
      partIds: saved?.savedParts?.map(p => p.id) ?? [],
      savedPartsCount: saved?._count?.savedParts ?? 0
    });
  } catch (err) {
    console.error('[get saved parts]', err);
    res.status(500).json({ msg: 'Server error fetching saved parts.' });
  }
});

// POST /api/customers/saved-parts/:partId
router.post('/saved-parts/:partId', requireAuth, async (req, res) => {
  try {
    const { partId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(partId)) {
      return res.status(400).json({ msg: 'Invalid part id.' });
    }

    const customer = await getOrCreateCustomer(req.auth);

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        savedParts: {
          connect: { id: partId }
        }
      },
      select: {
        _count: {
          select: { savedParts: { where: { published: true, archived: false } } }
        }
      }
    });

    res.json({ saved: true, savedPartsCount: updated._count.savedParts });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Part not found.' });
    }
    console.error('[save part]', err);
    res.status(500).json({ msg: 'Server error updating saved parts.' });
  }
});

// DELETE /api/customers/saved-parts/:partId
router.delete('/saved-parts/:partId', requireAuth, async (req, res) => {
  try {
    const { partId } = req.params;
    const customer = await getOrCreateCustomer(req.auth);

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        savedParts: {
          disconnect: { id: partId }
        }
      },
      select: {
        _count: {
          select: { savedParts: { where: { published: true, archived: false } } }
        }
      }
    });

    res.json({ saved: false, savedPartsCount: updated._count.savedParts });
  } catch (err) {
    console.error('[unsave part]', err);
    res.status(500).json({ msg: 'Server error updating saved parts.' });
  }
});

// GET /api/customers/lookup?q=<phone|name|email>
// Staff-facing repeat-buyer lookup. Searches completed walk-in and online
// invoices, since walk-ins have no Customer account row to search.
// ponytail: reads transaction history rather than adding a customerId FK to
// Transaction. Upgrade path: add the FK and join, if walk-ins ever need to
// merge with online accounts.
router.get('/lookup', requireAuth, async (req, res) => {
  try {
    const staff = await prisma.staffRole.findUnique({ where: { email: req.auth.email } });
    if (!staff) return res.status(403).json({ msg: 'Staff access required.' });

    const q = String(req.query.q || '').trim();
    if (q.length < 3) return res.json({ results: [] });

    const matches = await prisma.transaction.findMany({
      where: {
        OR: [
          { customerContact: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerEmail: { contains: q, mode: 'insensitive' } }
        ],
        NOT: { customerContact: 'N/A' }
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
      select: {
        customerName: true,
        customerContact: true,
        customerEmail: true,
        total: true,
        transactionDate: true
      }
    });

    // Collapse to one entry per contact number, newest first.
    const byContact = new Map();
    for (const tx of matches) {
      const key = tx.customerContact;
      const existing = byContact.get(key);
      if (existing) {
        existing.orderCount += 1;
      } else {
        byContact.set(key, {
          customerName: tx.customerName,
          customerContact: tx.customerContact,
          customerEmail: tx.customerEmail || '',
          orderCount: 1,
          lastOrderDate: tx.transactionDate,
          lastOrderTotal: tx.total
        });
      }
    }

    res.json({ results: Array.from(byContact.values()).slice(0, 5) });
  } catch (err) {
    console.error('[customer lookup]', err);
    res.status(500).json({ msg: 'Server error looking up customer.' });
  }
});

export default router;

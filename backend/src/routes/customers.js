import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();

const getOrCreateCustomer = async (auth) => {
  const authId = auth.userId;
  const email = auth.email || '';

  let customer = await prisma.customer.findUnique({
    where: { authId }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        authId,
        email,
        displayName: auth.user_metadata?.full_name || auth.name || '',
        photoURL: auth.user_metadata?.avatar_url || auth.picture || '',
        phoneNumber: auth.user_metadata?.contact_number || auth.phone || ''
      }
    });
  }

  return customer;
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
    const authId = req.auth.userId;
    const { displayName, phoneNumber, photoURL, companyName } = req.body;

    const customer = await prisma.customer.findUnique({ where: { authId } });
    if (!customer) {
      return res.status(404).json({ msg: 'Customer profile not found.' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { authId },
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

export default router;

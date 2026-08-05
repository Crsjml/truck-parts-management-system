import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';

const router = express.Router();

const getOrCreateCustomer = async (auth) => {
  const authId = auth.userId;
  const email = auth.email || '';

  try {
    const customer = await prisma.customer.upsert({
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

    // ponytail: do NOT auto-link FTF transactions to this online account.
    // Online buying ≠ walk-in buying — they are kept separate per business rule.

    return customer;
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

    // ponytail: do NOT re-link FTF transactions on phone update.
    // Online buying ≠ walk-in buying — kept separate per business rule.

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

// ── Admin: list all customers (online + FTF walk-ins) ───────────────────────
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const [customers, transactions] = await Promise.all([
      prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.transaction.findMany({
        select: {
          userId: true, total: true, transactionDate: true,
          customerName: true, customerContact: true, customerEmail: true
        }
      })
    ]);

    const validAuthIds = customers.map(c => c.authId);

    // 1. Online customers (real + temp-online)
    const online = customers.filter(c => !c.authId.startsWith('temp-') || c.authId.startsWith('temp-online-')).map(c => {
      const myTx = transactions.filter(t => t.userId === c.authId);
      return {
        id: c.id,
        authId: c.authId,
        email: c.email.includes('@ttp.local') && c.email.startsWith('temp-') ? '' : c.email,
        displayName: c.displayName || 'Unnamed User',
        companyName: c.companyName || '',
        phoneNumber: c.phoneNumber || '',
        orderCount: myTx.length,
        totalSpend: myTx.reduce((s, t) => s + (t.total || 0), 0),
        lastOrderDate: myTx.length > 0 ? myTx.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0].transactionDate : null,
        createdAt: c.createdAt
      };
    });

    // 2. FTF customers (derived from temp-ftf DB records + transactions)
    const ftfMap = new Map();

    const dbFtf = customers.filter(c => c.authId.startsWith('temp-') && !c.authId.startsWith('temp-online-'));
    for (const c of dbFtf) {
      const myTx = transactions.filter(t => t.userId === c.authId);
      const isDummy = c.email.includes('@ttp.local') && c.email.startsWith('temp-');
      const key = c.email || c.phoneNumber || c.id;
      ftfMap.set(key, {
        id: c.id,
        authId: c.authId,
        email: isDummy ? '' : c.email,
        displayName: c.displayName || 'Walk-in Customer',
        companyName: c.companyName || '',
        phoneNumber: c.phoneNumber || '',
        orderCount: myTx.length,
        totalSpend: myTx.reduce((s, t) => s + (t.total || 0), 0),
        lastOrderDate: myTx.length > 0 ? myTx.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0].transactionDate : null,
        createdAt: c.createdAt
      });
    }

    for (const tx of transactions) {
      if (tx.userId && validAuthIds.includes(tx.userId)) continue;
      const email = tx.customerEmail ? tx.customerEmail.toLowerCase().trim() : '';
      const contact = (tx.customerContact && tx.customerContact !== 'N/A') ? tx.customerContact.trim() : '';
      if (!email && !contact) continue;

      const key = email || contact;
      const existing = ftfMap.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpend += (tx.total || 0);
        if (new Date(tx.transactionDate) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = tx.transactionDate;
          if (tx.customerName && tx.customerName !== 'Walk-in Customer') {
            existing.displayName = tx.customerName;
          }
        }
      } else {
        ftfMap.set(key, {
          id: key,
          authId: 'temp-ftf-' + key,
          email,
          displayName: tx.customerName || 'Walk-in Customer',
          companyName: '',
          phoneNumber: tx.customerContact === 'N/A' ? '' : tx.customerContact,
          orderCount: 1,
          totalSpend: tx.total || 0,
          lastOrderDate: tx.transactionDate,
          createdAt: tx.transactionDate
        });
      }
    }

    res.json({ online, ftf: Array.from(ftfMap.values()) });
  } catch (err) {
    console.error('[get all customers]', err);
    res.status(500).json({ msg: 'Server error fetching customers list.' });
  }
});

// POST /api/customers — admin manually creates a customer
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { displayName, email, phoneNumber, companyName, isFtf } = req.body;
    
    let finalEmail = email ? email.trim().toLowerCase() : '';
    if (!finalEmail && isFtf) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      finalEmail = `temp-phone-${(phoneNumber || '').replace(/\D/g, '') || tempId}@ttp.local`;
    }

    if (!finalEmail) {
      return res.status(400).json({ msg: 'Email is required.' });
    }

    const existing = await prisma.customer.findUnique({ where: { email: finalEmail } });
    if (existing) {
      return res.status(400).json({ msg: 'A customer with this email already exists.' });
    }

    const authId = isFtf
      ? `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : `temp-online-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const customer = await prisma.customer.create({
      data: {
        authId,
        email: finalEmail,
        displayName: displayName || 'Walk-in Customer',
        phoneNumber: phoneNumber || '',
        companyName: companyName || '',
      }
    });

    res.status(201).json(customer);
  } catch (err) {
    console.error('[create customer]', err);
    res.status(500).json({ msg: 'Server error creating customer.' });
  }
});

// PUT /api/customers/:id — admin edits a customer
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, phoneNumber, companyName } = req.body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) return res.status(404).json({ msg: 'Customer not found.' });

      let finalEmail = email ? email.trim().toLowerCase() : '';
      if (!finalEmail && customer.authId.startsWith('temp-')) {
        if (customer.email.includes('@ttp.local')) {
          finalEmail = customer.email;
        } else {
          const tempId = `temp-${Date.now()}`;
          finalEmail = `temp-phone-${(phoneNumber || '').replace(/\D/g, '') || tempId}@ttp.local`;
        }
      }

      if (finalEmail && finalEmail !== customer.email) {
        const existing = await prisma.customer.findUnique({ where: { email: finalEmail } });
        if (existing) return res.status(400).json({ msg: 'A customer with this email already exists.' });
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          displayName: displayName || customer.displayName,
          email: finalEmail || customer.email,
          phoneNumber: phoneNumber !== undefined ? phoneNumber : customer.phoneNumber,
          companyName: companyName !== undefined ? companyName : customer.companyName,
        }
      });

      // Sync transaction fields
      await prisma.transaction.updateMany({
        where: { userId: customer.authId },
        data: {
          customerName: updated.displayName || 'Walk-in Customer',
          customerContact: updated.phoneNumber || 'N/A',
          customerEmail: updated.email.includes('@ttp.local') ? '' : updated.email
        }
      });

      res.json(updated);
    } else {
      // Transaction-based FTF customer update
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      const cleanPhone = phoneNumber ? phoneNumber.trim() : '';

      const result = await prisma.transaction.updateMany({
        where: {
          OR: [
            { customerEmail: { equals: id, mode: 'insensitive' } },
            { customerContact: id }
          ]
        },
        data: {
          customerName: displayName || 'Walk-in Customer',
          customerEmail: cleanEmail,
          customerContact: cleanPhone || 'N/A'
        }
      });

      res.json({ id, displayName, email: cleanEmail, phoneNumber: cleanPhone, companyName: '', count: result.count });
    }
  } catch (err) {
    console.error('[update customer]', err);
    res.status(500).json({ msg: 'Server error updating customer.' });
  }
});

// DELETE /api/customers/:id — admin deletes a customer
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(id)) {
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) return res.status(404).json({ msg: 'Customer not found.' });

      await prisma.transaction.updateMany({
        where: { userId: customer.authId },
        data: { userId: null }
      });

      await prisma.customer.delete({ where: { id } });
    } else {
      // Transaction-based FTF customer delete (anonymize)
      await prisma.transaction.updateMany({
        where: {
          OR: [
            { customerEmail: { equals: id, mode: 'insensitive' } },
            { customerContact: id }
          ]
        },
        data: {
          customerName: 'Walk-in Customer',
          customerContact: 'N/A',
          customerEmail: ''
        }
      });
    }

    res.json({ msg: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('[delete customer]', err);
    res.status(500).json({ msg: 'Server error deleting customer.' });
  }
});

// POST /api/customers/merge — admin manually links FTF records to online account
router.post('/merge', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { authId, tempAuthId, customerEmail, customerContact } = req.body;
    if (!authId) return res.status(400).json({ msg: 'Online customer authId is required.' });

    const onlineCustomer = await prisma.customer.findUnique({
      where: { authId }
    });
    if (!onlineCustomer) return res.status(404).json({ msg: 'Online customer not found.' });

    let count = 0;
    const updateData = {
      customerEmail: onlineCustomer.email,
      customerContact: onlineCustomer.phoneNumber || 'N/A',
      customerName: onlineCustomer.displayName || 'Walk-in Customer',
      userId: null // ponytail: keep it as walk-in so they remain in the FTF tab!
    };

    if (tempAuthId && tempAuthId.startsWith('temp-')) {
      const result = await prisma.transaction.updateMany({
        where: { userId: tempAuthId },
        data: updateData
      });
      count += result.count;

      // Delete the temp customer record from Customer table
      await prisma.customer.deleteMany({
        where: { authId: tempAuthId }
      });
    }

    const orFilters = [];
    if (customerEmail) orFilters.push({ customerEmail: { equals: customerEmail, mode: 'insensitive' } });
    if (customerContact && customerContact !== 'N/A') orFilters.push({ customerContact });

    if (orFilters.length > 0) {
      const result2 = await prisma.transaction.updateMany({
        where: {
          userId: null,
          OR: orFilters
        },
        data: {
          customerEmail: onlineCustomer.email,
          customerContact: onlineCustomer.phoneNumber || 'N/A',
          customerName: onlineCustomer.displayName || 'Walk-in Customer'
        }
      });
      count += result2.count;
    }

    res.json({ msg: `Merged transactions to online account.`, count });
  } catch (err) {
    console.error('[merge customer]', err);
    res.status(500).json({ msg: 'Server error merging accounts.' });
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
    const staff = await prisma.staffRole.findUnique({ where: { email: req.auth.email.toLowerCase() } });
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

// GET /api/customers/:id/transactions — admin views purchase history for a customer
// :id can be a UUID (Customer.id), a temp authId like "temp-ftf-<email>", or an email/phone key
router.get('/:id/transactions', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let whereClause;
    let customerMeta = null;
    const ftfOnly = {
      OR: [
        { userId: null },
        { userId: { startsWith: 'temp-' } }
      ]
    };

    if (uuidRegex.test(id)) {
      // Real Customer DB row — fetch by their authId
      const customer = await prisma.customer.findUnique({ where: { id } });
      if (!customer) return res.status(404).json({ msg: 'Customer not found.' });
      customerMeta = customer;
      if (customer.authId.startsWith('temp-') && !customer.authId.startsWith('temp-online-')) {
        const email = customer.email ? customer.email.toLowerCase().trim() : '';
        const contact = customer.phoneNumber ? customer.phoneNumber.trim() : '';
        const identityFilter = email
          ? { customerEmail: { equals: email, mode: 'insensitive' } }
          : contact
            ? { customerContact: contact }
            : null;

        whereClause = identityFilter
          ? { OR: [{ userId: customer.authId }, { AND: [identityFilter, ftfOnly] }] }
          : { userId: customer.authId };
      } else {
        whereClause = { userId: customer.authId };
      }
    } else if (id.startsWith('temp-ftf-')) {
      // Synthetic FTF key generated by the GET / endpoint
      // The key after "temp-ftf-" is either an email or phone
      const key = id.replace('temp-ftf-', '');
      const isEmail = key.includes('@');
      whereClause = isEmail
        ? { AND: [{ customerEmail: { equals: key, mode: 'insensitive' } }, ftfOnly] }
        : { AND: [{ customerContact: key }, ftfOnly] };
    } else {
      // Treat :id directly as an email or phone
      const isEmail = id.includes('@');
      whereClause = isEmail
        ? { AND: [{ customerEmail: { equals: id, mode: 'insensitive' } }, ftfOnly] }
        : { AND: [{ customerContact: id }, ftfOnly] };
    }

    const txList = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
      include: {
        items: {
          select: { name: true, quantity: true, price: true }
        }
      }
    });

    // Separate into online (has a real supabase userId) vs ftf (userId is null or temp-)
    const online = txList.filter(t => t.userId && !t.userId.startsWith('temp-'));
    const ftf = txList.filter(t => !t.userId || t.userId.startsWith('temp-'));

    res.json({ customer: customerMeta, online, ftf });
  } catch (err) {
    console.error('[customer transactions]', err);
    res.status(500).json({ msg: 'Server error fetching transactions.' });
  }
});

export default router;

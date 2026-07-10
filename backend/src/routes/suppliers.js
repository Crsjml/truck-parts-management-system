import express from 'express';
import { prisma } from '../config/prisma.js';

const router = express.Router();

// Get all suppliers (excludes archived by default)
router.get('/', async (req, res) => {
  try {
    const { archived } = req.query;
    
    const suppliers = await prisma.supplier.findMany({
      where: { archived: archived === 'true' },
      include: { categories: true },
      orderBy: { name: 'asc' }
    });
    
    res.json(suppliers);
  } catch (err) {
    console.error('[get suppliers]', err);
    res.status(500).json({ msg: 'Server error fetching suppliers.' });
  }
});

// Create a new supplier
router.post('/', async (req, res) => {
  try {
    const { name, type, contactPerson, email, phone, address, country, paymentTerms, categories, notes } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ msg: 'Supplier name is required.' });
    }

    const categoryConnections = (Array.isArray(categories) ? categories : []).map(id => ({ id }));

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        type: type || 'Company',
        contactPerson: contactPerson?.trim() || '',
        email: email?.trim() || '',
        phone: phone?.trim() || '',
        address: address?.trim() || '',
        country: country?.trim() || '',
        paymentTerms: paymentTerms?.trim() || 'Net 30',
        notes: notes?.trim() || '',
        categories: {
          connect: categoryConnections
        }
      },
      include: { categories: true }
    });

    res.status(201).json(supplier);
  } catch (err) {
    console.error('[create supplier]', err);
    res.status(500).json({ msg: 'Server error creating supplier.' });
  }
});

// Update a supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, type, contactPerson, email, phone, address, country, paymentTerms, categories, status, notes } = req.body;
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms.trim();
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes.trim();

    if (categories !== undefined) {
      const categoryConnections = (Array.isArray(categories) ? categories : []).map(catId => ({ id: catId }));
      updateData.categories = {
        set: categoryConnections
      };
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: { categories: true }
    });

    res.json(updatedSupplier);
  } catch (err) {
    console.error('[update supplier]', err);
    res.status(500).json({ msg: 'Server error updating supplier.' });
  }
});

// Archive a supplier (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    await prisma.supplier.update({
      where: { id },
      data: { archived: true }
    });
    
    res.json({ msg: 'Supplier archived successfully.' });
  } catch (err) {
    console.error('[archive supplier]', err);
    res.status(500).json({ msg: 'Server error archiving supplier.' });
  }
});

// Restore archived supplier
router.put('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    await prisma.supplier.update({
      where: { id },
      data: { archived: false }
    });

    res.json({ msg: 'Supplier restored successfully.' });
  } catch (err) {
    console.error('[restore supplier]', err);
    res.status(500).json({ msg: 'Server error restoring supplier.' });
  }
});

export default router;

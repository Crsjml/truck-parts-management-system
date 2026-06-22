import express from 'express';
import Supplier from '../models/Supplier.js';

const router = express.Router();

// Get all suppliers (excludes archived by default)
router.get('/', async (req, res) => {
  try {
    const { archived } = req.query;
    const query = archived === 'true' ? { archived: true } : { archived: { $ne: true } };
    const suppliers = await Supplier.find(query).populate('categories').sort({ name: 1 }).lean();
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

    const supplier = await Supplier.create({
      name: name.trim(),
      type: type || 'Company',
      contactPerson: contactPerson?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      country: country?.trim() || '',
      paymentTerms: paymentTerms?.trim() || 'Net 30',
      categories: categories || [],
      notes: notes?.trim() || ''
    });

    const populated = await supplier.populate('categories');
    res.status(201).json(populated);
  } catch (err) {
    console.error('[create supplier]', err);
    res.status(500).json({ msg: 'Server error creating supplier.' });
  }
});

// Update a supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, type, contactPerson, email, phone, address, country, paymentTerms, categories, status, notes } = req.body;
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    if (name !== undefined) supplier.name = name.trim();
    if (type !== undefined) supplier.type = type;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson.trim();
    if (email !== undefined) supplier.email = email.trim();
    if (phone !== undefined) supplier.phone = phone.trim();
    if (address !== undefined) supplier.address = address.trim();
    if (country !== undefined) supplier.country = country.trim();
    if (paymentTerms !== undefined) supplier.paymentTerms = paymentTerms.trim();
    if (categories !== undefined) supplier.categories = categories;
    if (status !== undefined) supplier.status = status;
    if (notes !== undefined) supplier.notes = notes.trim();

    await supplier.save();
    const populated = await supplier.populate('categories');
    res.json(populated);
  } catch (err) {
    console.error('[update supplier]', err);
    res.status(500).json({ msg: 'Server error updating supplier.' });
  }
});

// Archive a supplier (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    supplier.archived = true;
    await supplier.save();
    res.json({ msg: 'Supplier archived successfully.' });
  } catch (err) {
    console.error('[archive supplier]', err);
    res.status(500).json({ msg: 'Server error archiving supplier.' });
  }
});

// Restore archived supplier
router.put('/:id/restore', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found.' });

    supplier.archived = false;
    await supplier.save();
    res.json({ msg: 'Supplier restored successfully.' });
  } catch (err) {
    console.error('[restore supplier]', err);
    res.status(500).json({ msg: 'Server error restoring supplier.' });
  }
});

export default router;

// backend/src/routes/parts.js
import express from 'express';
import mongoose from 'mongoose';
import Part from '../models/Part.js';
import Category from '../models/Category.js';

const router = express.Router();

// ── Get all parts (with search and category filtering) ───────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = {};

    if (category && category.toLowerCase() !== 'all') {
      const matchedCats = await Category.find({
        name: { $regex: new RegExp(`^${category}$`, 'i') }
      });

      if (matchedCats.length > 0) {
        const catIds = matchedCats.map(c => c._id);
        // Also fetch subcategories that belong to these matched categories
        const subCats = await Category.find({ parentCategory: { $in: catIds } });
        const allCatIds = [...catIds, ...subCats.map(c => c._id)];
        query.category = { $in: allCatIds };
      } else {
        // If no matching category doc exists, return empty query result
        query.category = new mongoose.Types.ObjectId();
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { oem: searchRegex },
        { compatibility: searchRegex },
      ];
    }

    // Sort alphabetically by name
    const parts = await Part.find(query).populate('category').sort({ name: 1 });
    
    // Convert field names if necessary for frontend (e.g. min_stock -> minStock)
    const formattedParts = parts.map(part => ({
      id: part._id.toString(),
      name: part.name,
      sku: part.sku,
      oem: part.oem || '',
      category: part.category ? part.category.name : 'Uncategorized',
      category_id: part.category ? part.category._id.toString() : null,
      price: part.price,
      stock: part.stock,
      minStock: part.min_stock,
      compatibility: part.compatibility || '',
      description: part.description || '',
      image: part.image || ''
    }));

    res.json(formattedParts);
  } catch (err) {
    console.error('[get parts]', err);
    res.status(500).json({ msg: 'Server error fetching parts.' });
  }
});

// ── Get all unique categories ────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    const names = categories.map(c => c.name);
    res.json(names);
  } catch (err) {
    console.error('[get categories]', err);
    res.status(500).json({ msg: 'Server error fetching categories.' });
  }
});

// ── Create part record ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, sku, oem, category_id, price, stock, minStock, compatibility, description, image } = req.body;

    // Strict input validation
    if (!name || name.trim() === '') return res.status(400).json({ msg: 'Part name is required.' });
    if (!sku || sku.trim() === '') return res.status(400).json({ msg: 'SKU is required.' });
    if (!category_id) return res.status(400).json({ msg: 'Category reference is required.' });
    if (price === undefined || price === null || isNaN(Number(price))) return res.status(400).json({ msg: 'Price must be a valid number.' });
    if (stock === undefined || stock === null || isNaN(Number(stock))) return res.status(400).json({ msg: 'Stock must be a valid number.' });
    if (minStock === undefined || minStock === null || isNaN(Number(minStock))) return res.status(400).json({ msg: 'Minimum stock must be a valid number.' });

    const cleanPrice = Number(price);
    const cleanStock = Number(stock);
    const cleanMinStock = Number(minStock);

    if (cleanPrice < 0) return res.status(400).json({ msg: 'Price cannot be negative.' });
    if (cleanStock < 0) return res.status(400).json({ msg: 'Stock cannot be negative.' });
    if (cleanMinStock < 0) return res.status(400).json({ msg: 'Minimum stock cannot be negative.' });

    const existing = await Part.findOne({ sku: sku.trim() });
    if (existing) {
      return res.status(409).json({ msg: 'A part with this SKU already exists.' });
    }

    const categoryDoc = await Category.findById(category_id);
    if (!categoryDoc) {
      return res.status(404).json({ msg: 'Selected category does not exist.' });
    }

    const part = await Part.create({
      name: name.trim(),
      sku: sku.trim(),
      oem: oem ? oem.trim() : '',
      category: categoryDoc._id,
      price: cleanPrice,
      stock: cleanStock,
      min_stock: cleanMinStock,
      compatibility: compatibility ? compatibility.trim() : '',
      description: description ? description.trim() : '',
      image: image || ''
    });

    const populated = await part.populate('category');
    res.status(201).json({
      id: populated._id.toString(),
      name: populated.name,
      sku: populated.sku,
      oem: populated.oem,
      category: populated.category.name,
      category_id: populated.category._id.toString(),
      price: populated.price,
      stock: populated.stock,
      minStock: populated.min_stock,
      compatibility: populated.compatibility,
      description: populated.description,
      image: populated.image || ''
    });
  } catch (err) {
    console.error('[create part]', err);
    res.status(500).json({ msg: 'Server error creating part record.' });
  }
});

// ── Update part record ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, oem, category_id, price, stock, minStock, compatibility, description, image } = req.body;
    const { id } = req.params;

    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({ msg: 'Part record not found.' });
    }

    // Input validation
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ msg: 'Price must be a non-negative number.' });
    }
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ msg: 'Stock must be a non-negative number.' });
    }
    if (minStock !== undefined && (isNaN(Number(minStock)) || Number(minStock) < 0)) {
      return res.status(400).json({ msg: 'Minimum stock must be a non-negative number.' });
    }

    if (sku && sku.trim() !== part.sku) {
      const existing = await Part.findOne({ sku: sku.trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ msg: 'A part with this SKU already exists.' });
      }
      part.sku = sku.trim();
    }

    if (category_id) {
      const categoryDoc = await Category.findById(category_id);
      if (!categoryDoc) {
        return res.status(404).json({ msg: 'Selected category does not exist.' });
      }
      part.category = categoryDoc._id;
    }

    if (name !== undefined) {
      if (name.trim() === '') return res.status(400).json({ msg: 'Part name cannot be empty.' });
      part.name = name.trim();
    }
    if (oem !== undefined) part.oem = oem.trim();
    if (price !== undefined) part.price = Number(price);
    if (stock !== undefined) part.stock = Number(stock);
    if (minStock !== undefined) part.min_stock = Number(minStock);
    if (compatibility !== undefined) part.compatibility = compatibility.trim();
    if (description !== undefined) part.description = description.trim();
    if (image !== undefined) part.image = image;

    await part.save();

    const populated = await part.populate('category');
    res.json({
      id: populated._id.toString(),
      name: populated.name,
      sku: populated.sku,
      oem: populated.oem,
      category: populated.category.name,
      category_id: populated.category._id.toString(),
      price: populated.price,
      stock: populated.stock,
      minStock: populated.min_stock,
      compatibility: populated.compatibility,
      description: populated.description,
      image: populated.image || ''
    });
  } catch (err) {
    console.error('[update part]', err);
    res.status(500).json({ msg: 'Server error updating part record.' });
  }
});

// ── Delete part record ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const part = await Part.findById(id);
    if (!part) {
      return res.status(404).json({ msg: 'Part record not found.' });
    }

    await Part.findByIdAndDelete(id);
    res.json({ msg: 'Part record deleted successfully.' });
  } catch (err) {
    console.error('[delete part]', err);
    res.status(500).json({ msg: 'Server error deleting part record.' });
  }
});

export default router;

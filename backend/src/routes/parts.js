// backend/src/routes/parts.js
import express from 'express';
import Part from '../models/Part.js';

const router = express.Router();

// ── Get all parts (with search and category filtering) ───────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = {};

    if (category && category.toLowerCase() !== 'all') {
      query.category = category;
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
    const parts = await Part.find(query).sort({ name: 1 });
    
    // Convert field names if necessary for frontend (e.g. min_stock -> minStock)
    const formattedParts = parts.map(part => ({
      id: part._id.toString(),
      name: part.name,
      sku: part.sku,
      oem: part.oem,
      category: part.category,
      price: part.price,
      stock: part.stock,
      minStock: part.min_stock,
      compatibility: part.compatibility,
      description: part.description,
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
    const categories = await Part.distinct('category');
    // Ensure "All" is included or handled by frontend. We will just return the actual categories.
    res.json(categories.sort());
  } catch (err) {
    console.error('[get categories]', err);
    res.status(500).json({ msg: 'Server error fetching categories.' });
  }
});

export default router;

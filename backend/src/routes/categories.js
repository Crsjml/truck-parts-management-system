// backend/src/routes/categories.js
import express from 'express';
import Category from '../models/Category.js';
import Part from '../models/Part.js';

const router = express.Router();

// ── GET all categories ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({})
      .populate('parentCategory', 'name')
      .sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error('[get categories]', err);
    res.status(500).json({ msg: 'Server error fetching categories.' });
  }
});

// ── POST create category / subcategory ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, parentCategory, iconName, colorTheme } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ msg: 'Category name is required.' });
    }

    const normalizedName = name.trim();
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ msg: 'A category with this name already exists.' });
    }

    let parentId = null;
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(404).json({ msg: 'Parent category not found.' });
      }
      parentId = parent._id;
    }

    const category = await Category.create({
      name: normalizedName,
      parentCategory: parentId,
      iconName: iconName || null,
      colorTheme: colorTheme || null
    });

    const populated = await category.populate('parentCategory', 'name');
    res.status(201).json(populated);
  } catch (err) {
    console.error('[create category]', err);
    res.status(500).json({ msg: 'Server error creating category.' });
  }
});

// ── PUT update category / subcategory ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, parentCategory, iconName, colorTheme } = req.body;
    const { id } = req.params;

    if (!name || name.trim() === '') {
      return res.status(400).json({ msg: 'Category name is required.' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found.' });
    }

    // Check unique name conflicts
    const normalizedName = name.trim();
    const existingName = await Category.findOne({ 
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      _id: { $ne: id }
    });
    if (existingName) {
      return res.status(409).json({ msg: 'A category with this name already exists.' });
    }

    let parentId = null;
    if (parentCategory) {
      if (parentCategory === id) {
        return res.status(400).json({ msg: 'A category cannot be its own parent.' });
      }
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(404).json({ msg: 'Parent category not found.' });
      }
      
      // Prevent circular loops (e.g. parent has child as parent)
      let ancestor = parent;
      while (ancestor) {
        if (ancestor.parentCategory && ancestor.parentCategory.toString() === id) {
          return res.status(400).json({ msg: 'Circular parent relationship detected.' });
        }
        if (ancestor.parentCategory) {
          ancestor = await Category.findById(ancestor.parentCategory);
        } else {
          ancestor = null;
        }
      }

      parentId = parent._id;
    }

    category.name = normalizedName;
    category.parentCategory = parentId;
    if (iconName !== undefined) category.iconName = iconName || null;
    if (colorTheme !== undefined) category.colorTheme = colorTheme || null;
    await category.save();

    const populated = await category.populate('parentCategory', 'name');
    res.json(populated);
  } catch (err) {
    console.error('[update category]', err);
    res.status(500).json({ msg: 'Server error updating category.' });
  }
});

// ── DELETE category ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found.' });
    }

    // Check active subcategories linking to this
    const hasChildren = await Category.findOne({ parentCategory: id });
    if (hasChildren) {
      return res.status(400).json({ msg: 'Cannot delete category with active subcategories.' });
    }

    // Check active parts linking to this
    const hasParts = await Part.findOne({ category: id });
    if (hasParts) {
      return res.status(400).json({ msg: 'Cannot delete category associated with active part records.' });
    }

    await Category.findByIdAndDelete(id);
    res.json({ msg: 'Category deleted successfully.' });
  } catch (err) {
    console.error('[delete category]', err);
    res.status(500).json({ msg: 'Server error deleting category.' });
  }
});

export default router;

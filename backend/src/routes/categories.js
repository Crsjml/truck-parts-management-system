// backend/src/routes/categories.js
import express from 'express';
import { prisma } from '../config/prisma.js';

const router = express.Router();

// ── GET all categories ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parentCategory: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });
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
    const existing = await prisma.category.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } }
    });
    
    if (existing) {
      return res.status(409).json({ msg: 'A category with this name already exists.' });
    }

    let parentId = null;
    if (parentCategory) {
      const parent = await prisma.category.findUnique({ where: { id: parentCategory } });
      if (!parent) {
        return res.status(404).json({ msg: 'Parent category not found.' });
      }
      parentId = parent.id;
    }

    const category = await prisma.category.create({
      data: {
        name: normalizedName,
        parentCategoryId: parentId,
        iconName: iconName || null,
        colorTheme: colorTheme || null
      },
      include: {
        parentCategory: { select: { name: true } }
      }
    });

    res.status(201).json(category);
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

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ msg: 'Category not found.' });
    }

    // Check unique name conflicts
    const normalizedName = name.trim();
    const existingName = await prisma.category.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        id: { not: id }
      }
    });
    if (existingName) {
      return res.status(409).json({ msg: 'A category with this name already exists.' });
    }

    let parentId = null;
    if (parentCategory) {
      if (parentCategory === id) {
        return res.status(400).json({ msg: 'A category cannot be its own parent.' });
      }
      const parent = await prisma.category.findUnique({ where: { id: parentCategory } });
      if (!parent) {
        return res.status(404).json({ msg: 'Parent category not found.' });
      }
      
      // Prevent circular loops
      let ancestor = parent;
      while (ancestor) {
        if (ancestor.parentCategoryId === id) {
          return res.status(400).json({ msg: 'Circular parent relationship detected.' });
        }
        if (ancestor.parentCategoryId) {
          ancestor = await prisma.category.findUnique({ where: { id: ancestor.parentCategoryId } });
        } else {
          ancestor = null;
        }
      }

      parentId = parent.id;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: normalizedName,
        parentCategoryId: parentCategory === null ? null : parentId,
        ...(iconName !== undefined && { iconName: iconName || null }),
        ...(colorTheme !== undefined && { colorTheme: colorTheme || null })
      },
      include: {
        parentCategory: { select: { name: true } }
      }
    });

    res.json(updatedCategory);
  } catch (err) {
    console.error('[update category]', err);
    res.status(500).json({ msg: 'Server error updating category.' });
  }
});

// ── DELETE category ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ msg: 'Category not found.' });
    }

    // Check active subcategories
    const hasChildren = await prisma.category.findFirst({ where: { parentCategoryId: id } });
    if (hasChildren) {
      return res.status(400).json({ msg: 'Cannot delete category with active subcategories.' });
    }

    // Check active parts
    const hasParts = await prisma.part.findFirst({ where: { categoryId: id } });
    if (hasParts) {
      return res.status(400).json({ msg: 'Cannot delete category associated with active part records.' });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ msg: 'Category deleted successfully.' });
  } catch (err) {
    console.error('[delete category]', err);
    res.status(500).json({ msg: 'Server error deleting category.' });
  }
});

export default router;

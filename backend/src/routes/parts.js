// backend/src/routes/parts.js
import express from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { parseCompatibility } from '../utils/parseCompatibility.js';
import { partsController } from '../controllers/PartsController.js';

const router = express.Router();

// ── Get all parts (with search, category filtering, and pagination) ───────────
router.get('/', (req, res) => partsController.getParts(req, res));

// ── Get all unique categories ─────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { name: true }
    });
    const names = categories.map(c => c.name);
    res.json(names);
  } catch (err) {
    console.error('[get categories]', err);
    res.status(500).json({ msg: 'Server error fetching categories.' });
  }
});

// ── Get vehicle filter options (brands + series per brand) ───────────────────
router.get('/vehicle-options', async (req, res) => {
  try {
    const parts = await prisma.part.findMany({
      where: { archived: false },
      select: { compatibleWith: true }
    });

    const brandMap = {};
    parts.forEach(p => {
      const compatibleArr = Array.isArray(p.compatibleWith) ? p.compatibleWith : [];
      compatibleArr.forEach(({ brand, series }) => {
        if (!brand || brand.toLowerCase() === 'universal') return;
        if (!brandMap[brand]) brandMap[brand] = new Set();
        if (series) brandMap[brand].add(series);
      });
    });

    const options = Object.entries(brandMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, seriesSet]) => ({
        brand,
        series: [...seriesSet].sort()
      }));

    res.json(options);
  } catch (err) {
    console.error('[vehicle-options]', err);
    res.status(500).json({ msg: 'Server error fetching vehicle options.' });
  }
});

// ── Create part record ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, sku, oem, category_id, price, stock, minStock, compatibility, description, image, compatibleWith } = req.body;

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

    const existing = await prisma.part.findUnique({ where: { sku: sku.trim() } });
    if (existing) {
      return res.status(409).json({ msg: 'A part with this SKU already exists.' });
    }

    const categoryDoc = await prisma.category.findUnique({ where: { id: category_id } });
    if (!categoryDoc) {
      return res.status(404).json({ msg: 'Selected category does not exist.' });
    }

    const parsedCompatibleWith = (Array.isArray(compatibleWith) && compatibleWith.length > 0)
      ? compatibleWith
      : parseCompatibility(compatibility ? compatibility.trim() : '');

    const part = await prisma.part.create({
      data: {
        name: name.trim(),
        sku: sku.trim(),
        oem: oem ? oem.trim() : '',
        categoryId: categoryDoc.id,
        price: cleanPrice,
        stock: cleanStock,
        min_stock: cleanMinStock,
        compatibility: compatibility ? compatibility.trim() : '',
        compatibleWith: parsedCompatibleWith,
        description: description ? description.trim() : '',
        image: image || ''
      },
      include: { category: true }
    });

    res.status(201).json({
      id: part.id,
      name: part.name,
      sku: part.sku,
      oem: part.oem,
      category: part.category.name,
      category_id: part.categoryId,
      price: part.price,
      stock: part.stock,
      minStock: part.min_stock,
      compatibility: part.compatibility,
      compatibleWith: part.compatibleWith,
      description: part.description,
      image: part.image || ''
    });
  } catch (err) {
    console.error('[create part]', err);
    res.status(500).json({ msg: 'Server error creating part record.' });
  }
});

// ── Update part record ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, oem, category_id, price, stock, minStock, compatibility, description, image, published, compatibleWith } = req.body;
    const { id } = req.params;

    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) {
      return res.status(404).json({ msg: 'Part record not found.' });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) return res.status(400).json({ msg: 'Price must be a non-negative number.' });
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) return res.status(400).json({ msg: 'Stock must be a non-negative number.' });
    if (minStock !== undefined && (isNaN(Number(minStock)) || Number(minStock) < 0)) return res.status(400).json({ msg: 'Minimum stock must be a non-negative number.' });

    let isStockAdjustment = false;
    const oldStock = part.stock;
    const newStock = stock !== undefined ? Number(stock) : oldStock;
    let difference = 0;

    if (stock !== undefined && newStock !== oldStock) {
      isStockAdjustment = true;
      difference = newStock - oldStock;
      if (!req.body.adjustmentReason || req.body.adjustmentReason.trim() === '') {
        return res.status(400).json({ msg: 'Reason for stock adjustment is required.' });
      }
    }

    if (sku && sku.trim() !== part.sku) {
      const existing = await prisma.part.findFirst({ where: { sku: sku.trim(), id: { not: id } } });
      if (existing) {
        return res.status(409).json({ msg: 'A part with this SKU already exists.' });
      }
    }

    if (category_id) {
      const categoryDoc = await prisma.category.findUnique({ where: { id: category_id } });
      if (!categoryDoc) return res.status(404).json({ msg: 'Selected category does not exist.' });
    }

    let updatedCompatibleWith = part.compatibleWith;
    if (compatibility !== undefined && compatibleWith === undefined) {
      updatedCompatibleWith = parseCompatibility(compatibility.trim());
    } else if (compatibleWith !== undefined) {
      updatedCompatibleWith = Array.isArray(compatibleWith) ? compatibleWith : [];
    }


    const updatedPart = await prisma.part.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(sku !== undefined && { sku: sku.trim() }),
        ...(oem !== undefined && { oem: oem.trim() }),
        ...(category_id !== undefined && { categoryId: category_id }),
        ...(price !== undefined && { price: Number(price) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(minStock !== undefined && { min_stock: Number(minStock) }),
        ...(compatibility !== undefined && { compatibility: compatibility.trim() }),
        compatibleWith: updatedCompatibleWith,
        ...(description !== undefined && { description: description.trim() }),
        ...(image !== undefined && { image }),
        ...(published !== undefined && { published })
      },
      include: { category: true }
    });


    if (isStockAdjustment) {
      await prisma.stockAdjustment.create({
        data: {
          partId: updatedPart.id,
          oldStock,
          newStock,
          difference,
          reason: req.body.adjustmentReason.trim()
        }
      });
    }


    res.json({
      id: updatedPart.id,
      name: updatedPart.name,
      sku: updatedPart.sku,
      oem: updatedPart.oem,
      category: updatedPart.category.name,
      category_id: updatedPart.categoryId,
      price: updatedPart.price,
      stock: updatedPart.stock,
      minStock: updatedPart.min_stock,
      compatibility: updatedPart.compatibility,
      compatibleWith: updatedPart.compatibleWith,
      description: updatedPart.description,
      image: updatedPart.image || '',
      published: updatedPart.published,
      archived: updatedPart.archived
    });
  } catch (err) {
    console.error('[update part]', err);
    res.status(500).json({ msg: 'Server error updating part record.' });
  }
});

// ── Get stock adjustments for a specific part ─────────────────────────────────
router.get('/:id/adjustments', async (req, res) => {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      where: { partId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(adjustments);
  } catch (err) {
    console.error('[get adjustments]', err);
    res.status(500).json({ msg: 'Server error fetching stock adjustments.' });
  }
});

// ── Archive part record (soft delete) ────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ msg: 'Part record not found.' });

    await prisma.part.update({ where: { id }, data: { archived: true } });
    res.json({ msg: 'Part archived successfully.' });
  } catch (err) {
    console.error('[archive part]', err);
    res.status(500).json({ msg: 'Server error archiving part record.' });
  }
});

// ── Toggle published status ───────────────────────────────────────────────────
router.put('/:id/published', async (req, res) => {
  try {
    const { id } = req.params;
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ msg: 'Part not found.' });

    const updated = await prisma.part.update({
      where: { id },
      data: { published: req.body.published ?? !part.published }
    });
    res.json({ id: updated.id, published: updated.published });
  } catch (err) {
    console.error('[toggle published]', err);
    res.status(500).json({ msg: 'Server error toggling published state.' });
  }
});

// ── Restore archived part ─────────────────────────────────────────────────────
router.put('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ msg: 'Part not found.' });

    await prisma.part.update({ where: { id }, data: { archived: false } });
    res.json({ msg: 'Part restored successfully.' });
  } catch (err) {
    console.error('[restore part]', err);
    res.status(500).json({ msg: 'Server error restoring part.' });
  }
});

// ── Bulk price adjustment ──────────────────────────────────────────────────────
router.post('/bulk-adjust', async (req, res) => {
  try {
    const { percentage } = req.body;
    if (percentage === undefined || isNaN(Number(percentage))) {
      return res.status(400).json({ msg: 'A valid percentage must be provided.' });
    }

    const factor = 1 + (Number(percentage) / 100);

    await prisma.part.updateMany({
      data: {
        price: { multiply: factor }
      }
    });

    res.json({ msg: `All part prices have been adjusted by ${percentage}%` });
  } catch (err) {
    console.error('[bulk adjust parts]', err);
    res.status(500).json({ msg: 'Server error during bulk price adjustment.' });
  }
});

export default router;

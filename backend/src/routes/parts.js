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
      select: { compatibility: true, compatibleWith: true }
    });

    const brandMap = {};
    parts.forEach(p => {
      let compatibleArr = [];
      if (Array.isArray(p.compatibleWith) && p.compatibleWith.length > 0) {
        compatibleArr = p.compatibleWith;
      } else if (p.compatibility) {
        compatibleArr = parseCompatibility(p.compatibility);
      }

      compatibleArr.forEach(({ brand, series }) => {
        if (!brand || brand.toLowerCase() === 'universal') return;
        const normalizedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
        if (!brandMap[normalizedBrand]) brandMap[normalizedBrand] = new Set();
        if (series) brandMap[normalizedBrand].add(series);
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
router.post('/', async (req, res) => partsController.createPart(req, res));

// ── Update part record ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => partsController.updatePart(req, res));

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

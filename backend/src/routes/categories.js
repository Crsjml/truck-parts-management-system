// backend/src/routes/categories.js
import express from 'express';
import categoriesController from '../controllers/CategoriesController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── GET all categories (public — storefront reads it) ─────────────────────────
router.get('/', categoriesController.getAllCategories);

// ── POST create category / subcategory (admin only) ───────────────────────────
router.post('/', requireAuth, requireRole('ADMIN'), categoriesController.createCategory);

// ── PUT update category / subcategory (admin only) ────────────────────────────
router.put('/:id', requireAuth, requireRole('ADMIN'), categoriesController.updateCategory);

// ── DELETE category (admin only) ──────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('ADMIN'), categoriesController.deleteCategory);

export default router;

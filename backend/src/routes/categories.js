// backend/src/routes/categories.js
import express from 'express';
import categoriesController from '../controllers/CategoriesController.js';

const router = express.Router();

// ── GET all categories ────────────────────────────────────────────────────────
router.get('/', categoriesController.getAllCategories);

// ── POST create category / subcategory ─────────────────────────────────────────
router.post('/', categoriesController.createCategory);

// ── PUT update category / subcategory ─────────────────────────────────────────
router.put('/:id', categoriesController.updateCategory);

// ── DELETE category ───────────────────────────────────────────────────────────
router.delete('/:id', categoriesController.deleteCategory);

export default router;

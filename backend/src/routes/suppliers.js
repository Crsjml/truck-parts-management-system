// backend/src/routes/suppliers.js
import express from 'express';
import suppliersController from '../controllers/SuppliersController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all suppliers (admin only)
router.get('/', requireAuth, requireAdmin, suppliersController.getSuppliers);

// Create a new supplier (admin only)
router.post('/', requireAuth, requireAdmin, suppliersController.createSupplier);

// Update a supplier (admin only)
router.put('/:id', requireAuth, requireAdmin, suppliersController.updateSupplier);

// Archive a supplier (admin only)
router.delete('/:id', requireAuth, requireAdmin, suppliersController.archiveSupplier);

// Restore archived supplier (admin only)
router.put('/:id/restore', requireAuth, requireAdmin, suppliersController.restoreSupplier);

export default router;

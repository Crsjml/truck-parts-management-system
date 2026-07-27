// backend/src/routes/suppliers.js
import express from 'express';
import suppliersController from '../controllers/SuppliersController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all suppliers (admin only)
router.get('/', requireAuth, requireRole('ADMIN'), suppliersController.getSuppliers);

// Create a new supplier (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), suppliersController.createSupplier);

// Update a supplier (admin only)
router.put('/:id', requireAuth, requireRole('ADMIN'), suppliersController.updateSupplier);

// Archive a supplier (admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), suppliersController.archiveSupplier);

// Restore archived supplier (admin only)
router.put('/:id/restore', requireAuth, requireRole('ADMIN'), suppliersController.restoreSupplier);

export default router;

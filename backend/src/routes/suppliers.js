// backend/src/routes/suppliers.js
import express from 'express';
import suppliersController from '../controllers/SuppliersController.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all suppliers (admin only)
router.get('/', requireAuth, requirePermission('purchasing'), suppliersController.getSuppliers);

// Create a new supplier (admin only)
router.post('/', requireAuth, requirePermission('purchasing'), suppliersController.createSupplier);

// Update a supplier (admin only)
router.put('/:id', requireAuth, requirePermission('purchasing'), suppliersController.updateSupplier);

// Archive a supplier (admin only)
router.delete('/:id', requireAuth, requirePermission('purchasing'), suppliersController.archiveSupplier);

// Restore archived supplier (admin only)
router.put('/:id/restore', requireAuth, requirePermission('purchasing'), suppliersController.restoreSupplier);

export default router;

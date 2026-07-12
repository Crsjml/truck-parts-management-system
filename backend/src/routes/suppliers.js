// backend/src/routes/suppliers.js
import express from 'express';
import suppliersController from '../controllers/SuppliersController.js';

const router = express.Router();

// Get all suppliers (excludes archived by default)
router.get('/', suppliersController.getSuppliers);

// Create a new supplier
router.post('/', suppliersController.createSupplier);

// Update a supplier
router.put('/:id', suppliersController.updateSupplier);

// Archive a supplier (soft delete)
router.delete('/:id', suppliersController.archiveSupplier);

// Restore archived supplier
router.put('/:id/restore', suppliersController.restoreSupplier);

export default router;

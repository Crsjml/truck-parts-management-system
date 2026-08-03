// backend/src/routes/purchaseOrders.js
import express from 'express';
import purchaseOrdersController from '../controllers/PurchaseOrdersController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all POs (admin only)
router.get('/', requireAuth, requireRole('ADMIN'), purchaseOrdersController.getPurchaseOrders);

// Create PO (RFQ Draft) (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), purchaseOrdersController.createPurchaseOrder);

// Update PO Status — includes stock increment on Received + confirmationDate (admin only)
router.put('/:id/status', requireAuth, requireRole('ADMIN'), purchaseOrdersController.updatePOStatus);

// Update Billing Status (admin only)
router.put('/:id/billing', requireAuth, requireRole('ADMIN'), purchaseOrdersController.updateBillingStatus);

// Update quoted prices on PO items (admin only)
router.put('/:id/items/prices', requireAuth, requireRole('ADMIN'), purchaseOrdersController.updateItemPrices);

export default router;

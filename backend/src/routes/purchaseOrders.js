// backend/src/routes/purchaseOrders.js
import express from 'express';
import purchaseOrdersController from '../controllers/PurchaseOrdersController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all POs (admin only)
router.get('/', requireAuth, requireAdmin, purchaseOrdersController.getPurchaseOrders);

// Create PO (RFQ Draft) (admin only)
router.post('/', requireAuth, requireAdmin, purchaseOrdersController.createPurchaseOrder);

// Update PO Status — includes stock increment on Received + confirmationDate (admin only)
router.put('/:id/status', requireAuth, requireAdmin, purchaseOrdersController.updatePOStatus);

// Update Billing Status (admin only)
router.put('/:id/billing', requireAuth, requireAdmin, purchaseOrdersController.updateBillingStatus);

export default router;

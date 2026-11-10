// backend/src/routes/purchaseOrders.js
import express from 'express';
import purchaseOrdersController from '../controllers/PurchaseOrdersController.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all POs (admin only)
router.get('/', requireAuth, requirePermission('purchasing'), purchaseOrdersController.getPurchaseOrders);

// Create PO (RFQ Draft) (admin only)
router.post('/', requireAuth, requirePermission('purchasing'), purchaseOrdersController.createPurchaseOrder);

// Update editable RFQ details (admin only)
router.put('/:id', requireAuth, requirePermission('purchasing'), purchaseOrdersController.updatePurchaseOrderDetails);

// Update PO Status — includes stock increment on Received + confirmationDate (admin only)
router.put('/:id/status', requireAuth, requirePermission('purchasing'), purchaseOrdersController.updatePOStatus);

// Update Billing Status (admin only)
router.put('/:id/billing', requireAuth, requirePermission('purchasing'), purchaseOrdersController.updateBillingStatus);

// Update supplier payment tracking (admin only)
router.put('/:id/payment', requireAuth, requirePermission('purchasing'), purchaseOrdersController.updatePayment);

// Update quoted prices on PO items (admin only)
router.put('/:id/items/prices', requireAuth, requirePermission('purchasing'), purchaseOrdersController.updateItemPrices);
router.put('/:id/items/:itemId/problem', requireAuth, requirePermission('purchasing'), purchaseOrdersController.reportItemProblem);
router.put('/:id/items/:itemId/resolve', requireAuth, requirePermission('purchasing'), purchaseOrdersController.resolveItemProblem);
router.put('/:id/return-to-supplier', requireAuth, requirePermission('purchasing'), purchaseOrdersController.returnToSupplier);

export default router;

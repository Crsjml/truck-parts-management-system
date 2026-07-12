// backend/src/routes/purchaseOrders.js
import express from 'express';
import purchaseOrdersController from '../controllers/PurchaseOrdersController.js';

const router = express.Router();

// Get all POs
router.get('/', purchaseOrdersController.getPurchaseOrders);

// Create PO (RFQ Draft)
router.post('/', purchaseOrdersController.createPurchaseOrder);

// Update PO Status — includes stock increment on Received + confirmationDate
router.put('/:id/status', purchaseOrdersController.updatePOStatus);

// Update Billing Status
router.put('/:id/billing', purchaseOrdersController.updateBillingStatus);

export default router;

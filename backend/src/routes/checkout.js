// backend/src/routes/checkout.js
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import checkoutController from '../controllers/CheckoutController.js';

const router = express.Router();

router.post('/create-checkout-session', requireAuth, checkoutController.createCheckoutSession);
router.post('/verify-session', requireAuth, checkoutController.verifySession);

// Webhook endpoint needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), checkoutController.webhook);

export default router;

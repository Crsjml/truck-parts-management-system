// backend/src/routes/transactions.js
import express from 'express';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import transactionsController from '../controllers/TransactionsController.js';

const router = express.Router();

// POST /api/transactions — requires login
router.post('/', requireAuth, requirePermission('pos'), validate('transactions'), transactionsController.createTransaction);

// GET /api/transactions/mine - customer order history
router.get('/mine', requireAuth, transactionsController.getMyTransactions);

// GET /api/transactions
router.get('/', requireAuth, requirePermission('pos'), transactionsController.getTransactions);

// Order fulfillment is part of customer management.
router.put('/:id/status', requireAuth, requirePermission('customers'), transactionsController.updateStatus);

export default router;

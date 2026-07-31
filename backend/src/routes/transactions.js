// backend/src/routes/transactions.js
import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import transactionsController from '../controllers/TransactionsController.js';

const router = express.Router();

// POST /api/transactions — requires login
router.post('/', requireAuth, validate('transactions'), transactionsController.createTransaction);

// GET /api/transactions/mine - customer order history
router.get('/mine', requireAuth, transactionsController.getMyTransactions);

// GET /api/transactions
router.get('/', requireAuth, requireRole('ADMIN'), transactionsController.getTransactions);

// PUT /api/transactions/:id/status - requires staff/admin auth ideally, but for now requireAuth
router.put('/:id/status', requireAuth, transactionsController.updateStatus);

export default router;

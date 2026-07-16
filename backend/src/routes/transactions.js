// backend/src/routes/transactions.js
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import transactionsController from '../controllers/TransactionsController.js';

const router = express.Router();

// POST /api/transactions — requires login
router.post('/', requireAuth, transactionsController.createTransaction);

// GET /api/transactions
router.get('/', transactionsController.getTransactions);

// PUT /api/transactions/:id/status - requires staff/admin auth ideally, but for now requireAuth
router.put('/:id/status', requireAuth, transactionsController.updateStatus);

export default router;

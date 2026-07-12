// backend/src/routes/transactions.js
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import transactionsController from '../controllers/TransactionsController.js';

const router = express.Router();

// POST /api/transactions — requires login
router.post('/', requireAuth, transactionsController.createTransaction);

// GET /api/transactions
router.get('/', transactionsController.getTransactions);

export default router;

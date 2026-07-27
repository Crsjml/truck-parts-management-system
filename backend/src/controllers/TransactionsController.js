// backend/src/controllers/TransactionsController.js
import { BaseController } from './BaseController.js';
import transactionsService from '../services/TransactionsService.js';

class TransactionsController extends BaseController {
  
  createTransaction = async (req, res) => {
    try {
      const transaction = await transactionsService.createTransaction(req.body, req.auth?.userId, req.auth?.email || '');
      res.status(201).json({
        msg: 'Transaction created and stock deducted successfully.',
        transaction
      });
    } catch (err) {
      console.error('[create transaction]', err);
      if (err.message.includes('must contain') || err.message.includes('Insufficient available stock')) {
        return res.status(400).json({ msg: err.message });
      }
      this.handleError(res, err, 'Failed to process transaction.');
    }
  };

  getTransactions = async (req, res) => {
    try {
      const transactions = await transactionsService.getTransactions();
      res.json(transactions);
    } catch (err) {
      console.error('[get transactions]', err);
      this.handleError(res, err, 'Server error fetching transactions.');
    }
  };

  getMyTransactions = async (req, res) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) return res.status(401).json({ msg: 'Not authenticated.' });

      const transactions = await transactionsService.getTransactionsByUserId(userId);
      res.json(transactions);
    } catch (err) {
      console.error('[get my transactions]', err);
      this.handleError(res, err, 'Server error fetching your orders.');
    }
  };

  updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ msg: 'Status is required' });
      }
      const updated = await transactionsService.updateStatus(id, status);
      res.json(updated);
    } catch (err) {
      console.error('[update transaction status]', err);
      this.handleError(res, err, 'Server error updating transaction status.');
    }
  };

}

export default new TransactionsController();

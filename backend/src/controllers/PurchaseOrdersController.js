// backend/src/controllers/PurchaseOrdersController.js
import { BaseController } from './BaseController.js';
import purchaseOrdersService from '../services/PurchaseOrdersService.js';

class PurchaseOrdersController extends BaseController {
  
  getPurchaseOrders = async (req, res) => {
    try {
      const pos = await purchaseOrdersService.getPurchaseOrders();
      res.json(pos);
    } catch (err) {
      console.error('[get POs]', err);
      this.handleError(res, err, 'Server error fetching POs.');
    }
  };

  createPurchaseOrder = async (req, res) => {
    try {
      const po = await purchaseOrdersService.createPurchaseOrder(req.body);
      res.status(201).json(po);
    } catch (err) {
      console.error('[create PO]', err);
      if (err.message.includes('required') || err.message.includes('must be') || err.message.includes('invalid')) {
        return res.status(400).json({ msg: err.message });
      }
      this.handleError(res, err, 'Server error creating PO.');
    }
  };

  updatePurchaseOrderDetails = async (req, res) => {
    try {
      const { id } = req.params;
      const po = await purchaseOrdersService.updatePurchaseOrderDetails(id, req.body || {});
      res.json(po);
    } catch (err) {
      console.error('[update PO details]', err);
      res.status(err.status || 400).json({ msg: err.message || 'Server error updating PO details.' });
    }
  };

  updatePOStatus = async (req, res) => {
    try {
      const { status } = req.body;
      const { id } = req.params;
      const updatedPo = await purchaseOrdersService.updatePOStatus(id, status);
      res.json(updatedPo);
    } catch (err) {
      console.error('[update PO status]', err);
      res.status(400).json({ msg: err.message || 'Server error updating PO status.' });
    }
  };

  updateBillingStatus = async (req, res) => {
    try {
      const { billingStatus } = req.body;
      const { id } = req.params;
      const po = await purchaseOrdersService.updateBillingStatus(id, billingStatus);
      res.json(po);
    } catch (err) {
      console.error('[update billing status]', err);
      if (err.message === 'Invalid billing status.') {
        return res.status(400).json({ msg: err.message });
      }
      this.handleError(res, err, 'Server error updating billing status.');
    }
  };

  updatePayment = async (req, res) => {
    try {
      const { id } = req.params;
      const po = await purchaseOrdersService.updatePayment(id, req.body || {});
      res.json(po);
    } catch (err) {
      console.error('[update supplier payment]', err);
      res.status(400).json({ msg: err.message || 'Server error updating supplier payment.' });
    }
  };

  updateItemPrices = async (req, res) => {
    try {
      const { id } = req.params;
      const { items } = req.body; // [{ id, unitPrice }]
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ msg: 'items array required.' });
      }
      const po = await purchaseOrdersService.updateItemPrices(id, items);
      res.json(po);
    } catch (err) {
      console.error('[update item prices]', err);
      res.status(400).json({ msg: err.message || 'Server error updating prices.' });
    }
  };

}

export default new PurchaseOrdersController();

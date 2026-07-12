// backend/src/controllers/SuppliersController.js
import { BaseController } from './BaseController.js';
import suppliersService from '../services/SuppliersService.js';

class SuppliersController extends BaseController {
  
  getSuppliers = async (req, res) => {
    try {
      const { archived } = req.query;
      const suppliers = await suppliersService.getSuppliers(archived);
      res.json(suppliers);
    } catch (err) {
      console.error('[get suppliers]', err);
      this.handleError(res, err, 'Server error fetching suppliers.');
    }
  };

  createSupplier = async (req, res) => {
    try {
      const supplier = await suppliersService.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (err) {
      console.error('[create supplier]', err);
      this.handleError(res, err, 'Server error creating supplier.');
    }
  };

  updateSupplier = async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = await suppliersService.updateSupplier(id, req.body);
      res.json(supplier);
    } catch (err) {
      console.error('[update supplier]', err);
      this.handleError(res, err, 'Server error updating supplier.');
    }
  };

  archiveSupplier = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await suppliersService.archiveSupplier(id);
      res.json(result);
    } catch (err) {
      console.error('[archive supplier]', err);
      this.handleError(res, err, 'Server error archiving supplier.');
    }
  };

  restoreSupplier = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await suppliersService.restoreSupplier(id);
      res.json(result);
    } catch (err) {
      console.error('[restore supplier]', err);
      this.handleError(res, err, 'Server error restoring supplier.');
    }
  };

}

export default new SuppliersController();

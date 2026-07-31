import { ApiError } from './errorHandler.js';

const validators = {
  parts: (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push('name is required');
    if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) errors.push('price must be a non-negative number');
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) errors.push('stock must be a non-negative number');
    return errors;
  },
  categories: (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push('name is required');
    return errors;
  },
  transactions: (data) => {
    const errors = [];
    if (!data.customerName || typeof data.customerName !== 'string') errors.push('customerName is required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) errors.push('items array is required and must not be empty');

    // Payment-method allowlist + method-specific field requirements.
    const ALLOWED_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'GCASH'];
    const method = data.paymentMethod || 'CASH';
    if (!ALLOWED_METHODS.includes(method)) {
      errors.push(`paymentMethod must be one of: ${ALLOWED_METHODS.join(', ')}`);
    }
    if (method === 'CHEQUE') {
      if (!data.chequeNumber || !String(data.chequeNumber).trim()) errors.push('chequeNumber is required for CHEQUE payments');
      if (!data.chequeBank || !String(data.chequeBank).trim()) errors.push('chequeBank is required for CHEQUE payments');
      if (!data.chequeDate) errors.push('chequeDate is required for CHEQUE payments');
    }
    if (method === 'GCASH') {
      if (!data.gcashReference || !String(data.gcashReference).trim()) errors.push('gcashReference is required for GCASH payments');
    }
    if (method === 'CASH' && data.amountTendered != null && Number(data.amountTendered) < 0) {
      errors.push('amountTendered cannot be negative');
    }
    return errors;
  },

  suppliers: (data) => {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push('name is required');
    return errors;
  },
  purchaseOrders: (data) => {
    const errors = [];
    if (!data.supplierId) errors.push('supplierId is required');
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) errors.push('items array is required');
    return errors;
  },
  reviews: (data) => {
    const errors = [];
    if (!data.partId) errors.push('partId is required');
    if (data.rating !== undefined && (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5)) errors.push('rating must be between 1 and 5');
    return errors;
  },
};

export function validate(schemaName) {
  return (req, res, next) => {
    const validateFn = validators[schemaName];
    if (!validateFn) return next();

    const errors = validateFn(req.body);
    if (errors.length > 0) {
      throw new ApiError(400, errors.join('; '));
    }
    next();
  };
}

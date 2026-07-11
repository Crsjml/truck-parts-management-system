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

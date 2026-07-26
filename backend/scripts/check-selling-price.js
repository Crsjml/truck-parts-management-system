// Standalone assert check for the checkout pricing helper.
// Run: node backend/scripts/check-selling-price.js
import assert from 'node:assert/strict';
import { computeSellingPrice } from '../src/services/CheckoutService.js';

// 15% markup, the seeded value
assert.equal(computeSellingPrice(1000, 15), 1150);
// no markup configured
assert.equal(computeSellingPrice(1000, 0), 1000);
// rounds to 2 decimals, does not accumulate float error
assert.equal(computeSellingPrice(19.99, 15), 22.99);
// defensive: a missing/garbage markup must not produce NaN
assert.equal(computeSellingPrice(1000, undefined), 1000);
assert.equal(computeSellingPrice(1000, null), 1000);

console.log('computeSellingPrice: all assertions passed');

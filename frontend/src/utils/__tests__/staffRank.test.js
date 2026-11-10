// frontend/src/utils/__tests__/staffRank.test.js
import { describe, it, expect } from 'vitest';
import { isPromotion } from '../staffAccess';

describe('isPromotion', () => {
  it('treats a move to a higher tier as a promotion', () => {
    expect(isPromotion('CASHIER', 'ADMIN')).toBe(true);
    expect(isPromotion('WAREHOUSE', 'SUPERADMIN')).toBe(true);
    expect(isPromotion('ADMIN', 'SUPERADMIN')).toBe(true);
  });

  it('treats sideways moves and demotions as non-promotions', () => {
    expect(isPromotion('CASHIER', 'WAREHOUSE')).toBe(false);
    expect(isPromotion('WAREHOUSE', 'CASHIER')).toBe(false);
    expect(isPromotion('ADMIN', 'CASHIER')).toBe(false);
    expect(isPromotion('SUPERADMIN', 'ADMIN')).toBe(false);
  });

  it('treats an unknown current role as a promotion so it gets confirmed', () => {
    expect(isPromotion(undefined, 'ADMIN')).toBe(true);
  });
});

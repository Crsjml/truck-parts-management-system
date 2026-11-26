import { describe, it, expect } from 'vitest';
import { getStatusTone, normalizeOrderStatus } from './orderStatusTone';

describe('orderStatusTone', () => {
  it('gives Order Placed a tone distinct from Ready for Pickup', () => {
    expect(getStatusTone('Order Placed')).not.toBe(getStatusTone('Ready for Pickup'));
  });

  it('keeps blue for Ready for Pickup and red for Cancelled only', () => {
    expect(getStatusTone('Ready for Pickup')).toContain('brandBlue');
    expect(getStatusTone('Order Placed')).not.toContain('brandBlue');
    expect(getStatusTone('Order Placed')).not.toContain('brandRed');
    expect(getStatusTone('Cancelled')).toContain('brandRed');
  });

  it('treats raw enum values and missing status like their labels', () => {
    expect(getStatusTone('READY_FOR_PICKUP')).toBe(getStatusTone('Ready for Pickup'));
    expect(getStatusTone('ORDER_PLACED')).toBe(getStatusTone('Order Placed'));
    expect(getStatusTone(undefined)).toBe(getStatusTone('Order Placed'));
    expect(normalizeOrderStatus('COMPLETED')).toBe('Completed');
  });
});

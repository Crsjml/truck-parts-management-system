import { describe, it, expect } from 'vitest';
import { getStatusTone, getStatusChartColor, normalizeOrderStatus } from './orderStatusTone';

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

  it('makes Order Placed the one attention tone (amber), distinct from all other chips', () => {
    const tones = ['Order Placed', 'Ready for Pickup', 'Completed', 'Cancelled'].map(getStatusTone);
    expect(new Set(tones).size).toBe(4);
    expect(getStatusTone('Order Placed')).toContain('amber');
    expect(getStatusTone('Order Placed')).not.toContain('text-muted-foreground');
  });

  it('draws chart slices from the same module, by label or raw enum', () => {
    const labels = ['Order Placed', 'Ready for Pickup', 'Completed', 'Cancelled'];
    expect(new Set(labels.map(getStatusChartColor)).size).toBe(4);
    expect(getStatusChartColor('ORDER_PLACED')).toBe(getStatusChartColor('Order Placed'));
    expect(getStatusChartColor('CANCELLED')).toBe(getStatusChartColor('Cancelled'));
    expect(getStatusChartColor(undefined)).toBe(getStatusChartColor('Order Placed'));
  });
});

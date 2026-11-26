import { describe, test, expect } from 'vitest';
import { buildReportData, buildReportCsv, periodStart } from './reportMetrics';

const NOW = new Date(2026, 10, 26, 12); // 26 Nov 2026

const po = (over) => ({
  id: 'x', status: 'Received', totalAmount: 1000, supplier: { name: 'Acme' },
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z',
  expectedDeliveryDate: '2026-11-10T00:00:00Z', items: [{ name: 'Brake pad', quantity: 4 }], ...over,
});

describe('periodStart', () => {
  test('returns first day of month, quarter and year; null for all time', () => {
    expect(periodStart('month', NOW)).toEqual(new Date(2026, 10, 1));
    expect(periodStart('quarter', NOW)).toEqual(new Date(2026, 9, 1));
    expect(periodStart('ytd', NOW)).toEqual(new Date(2026, 0, 1));
    expect(periodStart('all', NOW)).toBeNull();
  });
});

describe('buildReportData', () => {
  test('only counts received orders inside the selected period as spend', () => {
    const data = buildReportData({
      period: 'month', now: NOW,
      purchaseOrders: [po({}), po({ createdAt: '2026-01-02T00:00:00Z' }), po({ status: 'Draft' })],
    });
    expect(data.totalSpend).toBe(1000);
  });

  test('on-time rate uses received orders with a promised date and is null without any', () => {
    const late = po({ updatedAt: '2026-11-20T00:00:00Z' });
    const data = buildReportData({ period: 'all', now: NOW, purchaseOrders: [po({}), late] });
    expect(data.onTimeRate).toBe(50);
    expect(buildReportData({ period: 'all', now: NOW, purchaseOrders: [] }).onTimeRate).toBeNull();
  });

  test('flags overdue confirmed orders and problem orders as attention items', () => {
    const data = buildReportData({
      period: 'all', now: NOW,
      purchaseOrders: [
        po({ status: 'Confirmed', expectedDeliveryDate: '2026-11-01T00:00:00Z' }),
        po({ status: 'Confirmed', expectedDeliveryDate: '2026-12-31T00:00:00Z' }),
        po({ status: 'Problem Reported' }),
      ],
    });
    expect(data.attention.overdue).toBe(1);
    expect(data.attention.oldestOverdueDays).toBe(25);
    expect(data.attention.problems).toBe(1);
    expect(data.capitalInTransit).toBe(2000);
  });

  test('timeline is chronological regardless of input order', () => {
    const data = buildReportData({
      period: 'all', now: NOW,
      purchaseOrders: [po({ createdAt: '2026-11-03T00:00:00Z' }), po({ createdAt: '2026-02-03T00:00:00Z' })],
    });
    // Feb..Nov inclusive, with quiet months present as zero.
    expect(data.timeline).toHaveLength(8);
    expect(data.timeline[0].month).toMatch(/Apr/);
    expect(data.timeline[7]).toMatchObject({ count: 1 });
    expect(data.timeline[7].month).toMatch(/Nov/);
    expect(data.timeline.slice(0, 7).every(t => t.count === 0)).toBe(true);
  });

  test('purchase-vs-sales picks top purchased parts and marks overstock', () => {
    const data = buildReportData({
      period: 'all', now: NOW,
      purchaseOrders: [po({ items: [{ name: 'Brake pad', quantity: 10 }, { name: 'Filter', quantity: 2 }] })],
      transactions: [{ transactionDate: '2026-11-02', items: [{ name: 'Brake pad', quantity: 3 }, { name: 'Filter', quantity: 5 }] }],
    });
    expect(data.purchaseVsSales[0]).toMatchObject({ name: 'Brake pad', purchased: 10, sold: 3, overstock: true });
    expect(data.purchaseVsSales[1]).toMatchObject({ name: 'Filter', overstock: false });
  });

  test('a part that mostly sold through is not flagged as overstock', () => {
    const data = buildReportData({
      period: 'all', now: NOW,
      purchaseOrders: [po({ items: [{ name: 'Brake pad', quantity: 10 }] })],
      transactions: [{ transactionDate: '2026-11-02', items: [{ name: 'Brake pad', quantity: 7 }] }],
    });
    expect(data.purchaseVsSales[0].overstock).toBe(false);
  });

  test('handles empty input without throwing', () => {
    const data = buildReportData({});
    expect(data.totalSpend).toBe(0);
    expect(data.spendBySupplier).toEqual([]);
    expect(data.avgLeadTimeDays).toBeNull();
  });
});

describe('buildReportCsv', () => {
  test('escapes commas and neutralises formula-leading names', () => {
    const data = buildReportData({
      period: 'all', now: NOW,
      purchaseOrders: [po({ supplier: { name: '=cmd, Inc' } })],
    });
    const csv = buildReportCsv(data, 'All time');
    expect(csv).toContain('"\'=cmd, Inc"');
  });
});

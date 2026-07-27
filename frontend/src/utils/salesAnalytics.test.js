import { describe, it, expect } from 'vitest';
import {
  resolvePeriod, inRange, computeKpis, trendSeries,
  buildCategoryTree, categoryRevenue, topMovers, paymentMix,
  PAYMENT_METHODS
} from './salesAnalytics';

const NOW = new Date('2026-07-27T12:00:00Z');

const tx = (id, daysAgo, total, items = [], extra = {}) => ({
  id,
  invoiceNumber: `INV-${id}`,
  transactionDate: new Date(NOW.getTime() - daysAgo * 864e5).toISOString(),
  total,
  items,
  paymentMethod: 'CASH',
  ...extra
});

const item = (name, quantity, price, partId) => ({ name, quantity, price, partId });

describe('resolvePeriod', () => {
  it('gives a 30-day window with an equal-length preceding window', () => {
    const r = resolvePeriod('30d', NOW);
    expect(r.bucket).toBe('week');
    expect(r.comparable).toBe(true);
    expect(Math.round((r.end - r.start) / 864e5)).toBe(30);
    expect(r.prevEnd.getTime()).toBe(r.start.getTime());
    expect(r.spanMs).toBe(30 * 864e5);
  });

  it('marks all-time as not comparable', () => {
    expect(resolvePeriod('all', NOW).comparable).toBe(false);
  });

  it('falls back to 30d for an unknown key', () => {
    expect(resolvePeriod('bogus', NOW).bucket).toBe('week');
  });
});

describe('inRange', () => {
  it('keeps only transactions inside the window', () => {
    const all = [tx('a', 1, 100), tx('b', 45, 200)];
    const r = resolvePeriod('30d', NOW);
    expect(inRange(all, r.start, r.end).map(t => t.id)).toEqual(['a']);
  });
});

describe('computeKpis', () => {
  it('computes revenue, invoice count and average', () => {
    const k = computeKpis([tx('a', 1, 100), tx('b', 2, 300)], []);
    expect(k.revenue).toBe(400);
    expect(k.invoices).toBe(2);
    expect(k.avgInvoice).toBe(200);
  });

  it('computes units per invoice from line items', () => {
    const cur = [
      tx('a', 1, 100, [item('X', 3, 10, 'p1'), item('Y', 1, 10, 'p2')]),
      tx('b', 1, 100, [item('X', 2, 10, 'p1')])
    ];
    expect(computeKpis(cur, []).unitsPerInvoice).toBe(3); // 6 units / 2 invoices
  });

  it('computes percent deltas against the previous window', () => {
    const k = computeKpis([tx('a', 1, 200)], [tx('b', 40, 100)]);
    expect(k.deltas.revenue).toBe(100);
  });

  it('returns a null delta when the previous window was empty', () => {
    expect(computeKpis([tx('a', 1, 200)], []).deltas.revenue).toBeNull();
  });

  it('reports zero rather than NaN for an empty current window', () => {
    const k = computeKpis([], []);
    expect(k.revenue).toBe(0);
    expect(k.avgInvoice).toBe(0);
    expect(k.unitsPerInvoice).toBe(0);
  });
});

describe('trendSeries', () => {
  it('emits one row per bucket including empty buckets as zero', () => {
    const r = resolvePeriod('7d', NOW);
    const s = trendSeries([tx('a', 1, 100)], [], r);
    expect(s.length).toBeGreaterThanOrEqual(7);
    expect(s.reduce((n, p) => n + p.revenue, 0)).toBe(100);
    expect(s.some(p => p.revenue === 0)).toBe(true);
  });

  it('aligns the prior series by shifting each bucket back one full span', () => {
    const r = resolvePeriod('7d', NOW);
    // 8 days ago is exactly one 7-day span behind 1 day ago.
    const s = trendSeries([tx('a', 1, 100)], [tx('b', 8, 50)], r);
    expect(s.reduce((n, p) => n + (p.prior || 0), 0)).toBe(50);
    const slot = s.find(p => p.revenue === 100);
    expect(slot.prior).toBe(50);
  });

  it('leaves prior null when the period is not comparable', () => {
    const r = resolvePeriod('all', NOW);
    const s = trendSeries([tx('a', 1, 100)], [], r);
    expect(s.every(p => p.prior === null)).toBe(true);
  });
});

describe('buildCategoryTree', () => {
  const cats = [
    { id: 'c1', name: 'Braking Systems', parentCategoryId: null },
    { id: 'c2', name: 'Brake Pads/Linings', parentCategoryId: 'c1' },
    { id: 'c3', name: 'Brake Chambers', parentCategoryId: 'c1' },
    { id: 'c4', name: 'Engine & Powertrain', parentCategoryId: null }
  ];

  it('maps each leaf to its parent name', () => {
    const t = buildCategoryTree(cats);
    expect(t.parentOf.get('Brake Pads/Linings')).toBe('Braking Systems');
    expect(t.parentOf.get('Brake Chambers')).toBe('Braking Systems');
  });

  it('maps a top-level category to itself', () => {
    expect(buildCategoryTree(cats).parentOf.get('Braking Systems')).toBe('Braking Systems');
  });

  it('lists children per parent', () => {
    expect(buildCategoryTree(cats).childrenOf.get('Braking Systems')).toEqual(
      ['Brake Pads/Linings', 'Brake Chambers']
    );
  });

  it('tolerates an empty category list', () => {
    const t = buildCategoryTree([]);
    expect(t.parentOf.size).toBe(0);
  });
});

describe('categoryRevenue', () => {
  const cats = [
    { id: 'c1', name: 'Braking Systems', parentCategoryId: null },
    { id: 'c2', name: 'Brake Pads/Linings', parentCategoryId: 'c1' },
    { id: 'c3', name: 'Brake Chambers', parentCategoryId: 'c1' },
    { id: 'c4', name: 'Electrical & Lighting', parentCategoryId: null },
    { id: 'c5', name: 'Alternators', parentCategoryId: 'c4' }
  ];
  const tree = buildCategoryTree(cats);
  const parts = [
    { id: 'p1', name: 'Brake Pad', category: 'Brake Pads/Linings' },
    { id: 'p2', name: 'Chamber', category: 'Brake Chambers' },
    { id: 'p3', name: 'Alternator 24V', category: 'Alternators' }
  ];
  const txs = [tx('a', 1, 0, [
    item('Brake Pad', 2, 500, 'p1'),
    item('Chamber', 1, 300, 'p2'),
    item('Alternator 24V', 1, 400, 'p3')
  ])];

  it('rolls leaf revenue up to parent categories, descending', () => {
    expect(categoryRevenue(txs, parts, tree)).toEqual([
      { name: 'Braking Systems', revenue: 1300, hasChildren: true },
      { name: 'Electrical & Lighting', revenue: 400, hasChildren: true }
    ]);
  });

  it('shows only the drilled parent\'s children when drilled', () => {
    expect(categoryRevenue(txs, parts, tree, 'Braking Systems')).toEqual([
      { name: 'Brake Pads/Linings', revenue: 1000, hasChildren: false },
      { name: 'Brake Chambers', revenue: 300, hasChildren: false }
    ]);
  });

  it('matches on partId even when the stored name has drifted', () => {
    const drifted = [tx('a', 1, 0, [item('Brake Pad (old label)', 1, 200, 'p1')])];
    expect(categoryRevenue(drifted, parts, tree)).toEqual([
      { name: 'Braking Systems', revenue: 200, hasChildren: true }
    ]);
  });

  it('buckets unmatched line items as Uncategorized', () => {
    const ghost = [tx('a', 1, 0, [item('Ghost Part', 1, 50, 'nope')])];
    expect(categoryRevenue(ghost, parts, tree)).toEqual([
      { name: 'Uncategorized', revenue: 50, hasChildren: false }
    ]);
  });
});

describe('topMovers', () => {
  it('ranks by quantity and reports rank movement vs the previous window', () => {
    const cur = [tx('a', 1, 0, [item('X', 10, 5, 'p1'), item('Y', 3, 5, 'p2')])];
    const prev = [tx('b', 40, 0, [item('Y', 20, 5, 'p2'), item('X', 1, 5, 'p1')])];
    const m = topMovers(cur, prev);
    expect(m.map(e => e.name)).toEqual(['X', 'Y']);
    expect(m[0].rankDelta).toBe(1);
    expect(m[1].rankDelta).toBe(-1);
  });

  it('reports a null rankDelta for a part absent from the previous window', () => {
    expect(topMovers([tx('a', 1, 0, [item('New', 5, 5, 'p9')])], [])[0].rankDelta).toBeNull();
  });

  it('respects the limit', () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`P${i}`, 10 - i, 5, `p${i}`));
    expect(topMovers([tx('a', 1, 0, items)], [], 4)).toHaveLength(4);
  });
});

describe('paymentMix', () => {
  it('splits bucket revenue across payment methods', () => {
    const r = resolvePeriod('7d', NOW);
    const rows = paymentMix([
      tx('a', 1, 100, [], { paymentMethod: 'CASH' }),
      tx('b', 1, 300, [], { paymentMethod: 'CHEQUE' })
    ], r);
    const total = (m) => rows.reduce((n, row) => n + row[m], 0);
    expect(total('CASH')).toBe(100);
    expect(total('CHEQUE')).toBe(300);
    expect(total('CARD')).toBe(0);
  });

  it('treats an unknown or missing paymentMethod as CASH', () => {
    const r = resolvePeriod('7d', NOW);
    const rows = paymentMix([
      tx('a', 1, 75, [], { paymentMethod: undefined }),
      tx('b', 1, 25, [], { paymentMethod: 'CRYPTO' })
    ], r);
    expect(rows.reduce((n, row) => n + row.CASH, 0)).toBe(100);
  });

  it('emits every payment method key on every row', () => {
    const r = resolvePeriod('7d', NOW);
    const rows = paymentMix([tx('a', 1, 10)], r);
    rows.forEach(row => PAYMENT_METHODS.forEach(m => expect(row[m]).toBeTypeOf('number')));
  });
});

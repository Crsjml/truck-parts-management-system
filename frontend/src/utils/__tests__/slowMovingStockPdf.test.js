import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Captures the saved document and its filename so the real content stream and
// file name can be asserted without touching the filesystem.
const saved = [];
vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal();
  class CapturingPdf extends mod.jsPDF {
    constructor(...args) {
      super(...args);
      this.save = (filename) => { saved.push({ doc: this, filename }); };
    }
  }
  return { ...mod, jsPDF: CapturingPdf };
});

const { buildSlowMovingStockPdf } = await import('../slowMovingStockPdf');
const { lastSaleText, lastSaleSeverity, oldSaleThreshold, OLD_SALE_DAYS, NEVER_SOLD_LABEL } = await import('../slowMovingLabels');

const range = { start: '2026-10-11', end: '2026-11-10' };
const items = [
  { name: 'Radiator Cap', sku: 'COO-CAP-00001', category: 'Cooling', stock: 10, price: 100, unitsSold: 0, daysSinceLastSale: null },
  { name: 'Radiator Hose', sku: 'COO-HOS-00002', category: 'Cooling', stock: 2, price: 250.5, unitsSold: 0, daysSinceLastSale: 40 },
  { name: 'Mystery Part', sku: 'ACC-MYS-00003', category: 'Accessories', stock: 5, unitsSold: 0, daysSinceLastSale: 0 }
];

const contentOf = () => saved[0].doc.output();

describe('buildSlowMovingStockPdf', () => {
  beforeEach(() => { saved.length = 0; });
  afterEach(() => { vi.useRealTimers(); });

  it('dates the filename with the local (Manila) calendar day, not the UTC day', () => {
    vi.useFakeTimers();
    // 07:30 in Manila is still the previous day in UTC.
    vi.setSystemTime(new Date('2026-11-27T07:30:00+08:00'));
    buildSlowMovingStockPdf(items, { dateRange: range });
    expect(saved[0].filename).toBe('Slow_Moving_Stock_Report_2026-11-27.pdf');
  });

  it('replaces the always-zero Units Sold column with Stock Value', () => {
    buildSlowMovingStockPdf(items, { dateRange: range });
    const out = contentOf();
    expect(out).not.toMatch(/UNITS/);
    expect(out).toMatch(/STOCK/);
    expect(out).toMatch(/VALUE/);
  });

  it('prints per-part stock value and group subtotals', () => {
    buildSlowMovingStockPdf(items, { dateRange: range });
    const out = contentOf();
    expect(out).toContain('PHP 1,000.00'); // 10 x 100
    expect(out).toContain('PHP 501.00');   // 2 x 250.50
    expect(out).toContain('PHP 1,501.00'); // Cooling subtotal
  });

  it('prints the capital-tied-up total and counts parts without a cost', () => {
    buildSlowMovingStockPdf(items, { dateRange: range });
    const out = contentOf();
    expect(out).toMatch(/capital tied up/i);
    expect(out).toMatch(/1 without cost, not counted/);
  });

  it('formats money with the supplied formatter so totals match the display currency', () => {
    buildSlowMovingStockPdf(items, { dateRange: range, formatCurrency: (v) => `USD ${v}` });
    const out = contentOf();
    expect(out).toContain('USD 1000');
    expect(out).toContain('USD 1501');
    expect(out).not.toContain('PHP');
  });

  it('uses the same last-sale wording as the screen', () => {
    buildSlowMovingStockPdf(items, { dateRange: range });
    const out = contentOf();
    expect(NEVER_SOLD_LABEL).toBe('Never sold');
    expect(out).toContain(`(${NEVER_SOLD_LABEL}) Tj`);
    expect(out).toContain(`(${lastSaleText(40)}) Tj`);
    expect(out).toContain(`(${lastSaleText(0)}) Tj`);
  });
});

describe('lastSaleText', () => {
  it('reads Never sold, Today, and N days ago', () => {
    expect(lastSaleText(null)).toBe('Never sold');
    expect(lastSaleText(undefined)).toBe('Never sold');
    expect(lastSaleText(0)).toBe('Today');
    expect(lastSaleText(40)).toBe('40 days ago');
  });
});

describe('lastSaleSeverity', () => {
  it('flags never-sold, very old and recent stock', () => {
    expect(lastSaleSeverity(null)).toBe('never');
    expect(lastSaleSeverity(undefined)).toBe('never');
    expect(lastSaleSeverity(OLD_SALE_DAYS)).toBe('old');
    expect(lastSaleSeverity(OLD_SALE_DAYS - 1)).toBe('recent');
    expect(lastSaleSeverity(0)).toBe('recent');
  });

  it('takes a threshold so long look-back windows are not all flagged', () => {
    expect(lastSaleSeverity(120, 180)).toBe('recent');
    expect(lastSaleSeverity(180, 180)).toBe('old');
    expect(lastSaleSeverity(null, 180)).toBe('never');
  });
});

describe('oldSaleThreshold', () => {
  it('is at least OLD_SALE_DAYS and at least twice the look-back window', () => {
    expect(oldSaleThreshold(30)).toBe(OLD_SALE_DAYS);
    expect(oldSaleThreshold(60)).toBe(120);
    expect(oldSaleThreshold(90)).toBe(180);
    expect(oldSaleThreshold(182)).toBe(364);
    expect(oldSaleThreshold(undefined)).toBe(OLD_SALE_DAYS);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Structure guard for the open-style report layout (docs/reports/open-drafts),
// based on the Systems Design "Output & Data Design" rules: page header on
// every page, field-justified headings, totals, control breaks, zero
// suppression. Assertions read the real PDF content stream.
const outputs = [];
vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal();
  class CapturingPdf extends mod.jsPDF {
    constructor(...args) {
      super(...args);
      this.save = () => { outputs.push(this); };
    }
  }
  return { ...mod, jsPDF: CapturingPdf };
});

const { jsPDF, openTable, qty } = await import('../pdf/reportPdfKit');
const { buildInvoicePdf } = await import('../invoicePdf');
const { buildBestSellingPartsPdf } = await import('../bestSellingPartsPdf');
const { buildSlowMovingStockPdf, groupByCategory } = await import('../slowMovingStockPdf');
const { buildSalesSummaryPdf } = await import('../salesSummaryPdf');
const { buildPurchaseOrderPdf } = await import('../purchaseOrderPdf');

const text = (doc) => doc.output();
const range = { start: '2026-10-11', end: '2026-11-10' };
const formatCurrency = (v) => `PHP ${Number(v).toFixed(2)}`;

function rankedRows(n) {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1, rankDelta: i % 2 ? 1 : -1, name: `Part ${i + 1}`, sku: 'BRK-PAD-00001',
    oem: '8980066870', category: 'Brakes', stock: 10, quantity: 50 - i, revenue: 1000
  }));
}

describe('open-style report structure', () => {
  beforeEach(() => { outputs.length = 0; });

  it('qty() suppresses zero quantities but keeps other values', () => {
    expect(qty(0)).toBe('');
    expect(qty(5)).toBe(5);
    expect(qty('N/A')).toBe('N/A');
  });

  it('justifies each column heading the same way as its column', () => {
    const doc = new jsPDF();
    openTable(doc, {
      startY: 40,
      columns: [{ head: 'NAME' }, { head: 'QTY', align: 'right', mono: true }],
      body: [['Brake Pad', 2]]
    });
    const [nameHead, qtyHead] = doc.lastAutoTable.head[0].cells ? Object.values(doc.lastAutoTable.head[0].cells) : [];
    expect(nameHead.styles.halign).toBe('left');
    expect(qtyHead.styles.halign).toBe('right');
  });

  it('repeats a page header with title and page number on continuation pages', () => {
    buildBestSellingPartsPdf(rankedRows(70), { dateRange: range });
    const doc = outputs[0];
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(text(doc)).toMatch(/TARLAC TRUCK PARTS {2}· {2}BEST-SELLING PARTS REPORT/);
    expect(text(doc)).toContain('PAGE 2 OF');
  });

  it('prints a grand total for Best-Selling units and revenue', () => {
    buildBestSellingPartsPdf(rankedRows(2), { dateRange: range });
    expect(text(outputs[0])).toContain('(GRAND TOTAL)');
    expect(text(outputs[0])).toContain('PHP 2,000.00');
  });

  it('groups Slow-Moving by category with subtotals, category printed once', () => {
    const items = [
      { name: 'Radiator Cap', sku: 'COO-CAP-00001', oem: null, category: 'Cooling', stock: 35, unitsSold: 0, daysSinceLastSale: null },
      { name: 'Radiator Hose', sku: 'COO-HOS-00002', oem: null, category: 'Cooling', stock: 12, unitsSold: 2, daysSinceLastSale: 40 },
      { name: 'Mud Flap', sku: 'ACC-MUD-00003', oem: null, category: 'Accessories', stock: 60, unitsSold: 0, daysSinceLastSale: 98 }
    ];
    buildSlowMovingStockPdf(items, { dateRange: range });
    const out = text(outputs[0]);
    expect(out.match(/\(Cooling\) Tj/g)).toHaveLength(1);
    expect(out).toContain('Cooling SUBTOTAL');
    expect(out).toContain('Accessories SUBTOTAL');
    expect(out).toMatch(/GRAND TOTAL {2}\\\(3 idle parts\\\)/); // PDF escapes ( ) as \( \)
    expect(out).toContain('(107) Tj');
  });

  it('prints the SKU on each invoice line and totals under the amount column', () => {
    buildInvoicePdf({
      invoiceNumber: 'INV-20261110-0001', transactionDate: '2026-11-10T02:00:00.000Z',
      customerName: 'Juan', customerContact: '0917', paymentMethod: 'CASH',
      items: [{ name: 'Brake Pad Set', sku: 'BRK-PAD-00001', price: 850, quantity: 2 }],
      subtotal: 1517.86, discount: 0, taxAmount: 182.14, total: 1700
    }, { formatCurrency });
    const out = text(outputs[0]);
    expect(out).toContain('(BRK-PAD-00001) Tj');
    expect(out).toContain('(NET TOTAL) Tj');
  });

  it('prints totals rows on the Sales Summary payment and status tables', () => {
    buildSalesSummaryPdf([{
      transactionDate: new Date().toISOString(), total: 1700, subtotal: 1517.86, discount: 0, taxAmount: 182.14,
      paymentMethod: 'CASH', status: 'COMPLETED', items: [{ name: 'Brake Pad Set', quantity: 2, price: 850 }]
    }], { selectedDate: new Date().toISOString().split('T')[0] });
    const out = text(outputs[0]);
    expect(out).toContain('(FINANCIAL BREAKDOWN) Tj');
    expect(out.match(/\(TOTAL\) Tj/g).length).toBeGreaterThanOrEqual(2);
  });

  it('prints a GRAND TOTAL under the Purchase Order amount column', () => {
    buildPurchaseOrderPdf({
      poNumber: 'PO-20261110-0001', status: 'CONFIRMED', createdAt: '2026-11-10', totalAmount: 1700, supplier: { name: 'X' },
      items: [{ sku: 'BRK-PAD-00001', name: 'Brake Pad Set', quantity: 2, unitPrice: 850, subtotal: 1700, part: { oem: '898' } }]
    });
    expect(text(outputs[0])).toContain('(GRAND TOTAL) Tj');
  });

  it('reads the category from a string, a related object, or categoryName', () => {
    const groups = groupByCategory([
      { name: 'A', category: 'Cooling', stock: 1 },
      { name: 'B', category: { name: 'Cooling' }, stock: 2 },
      { name: 'C', categoryName: 'Lighting', stock: 3 },
      { name: 'D', stock: 4 }
    ]);
    expect(groups.map((g) => [g.category, g.stock])).toEqual([['Cooling', 3], ['Lighting', 3], ['Uncategorized', 4]]);
  });
});

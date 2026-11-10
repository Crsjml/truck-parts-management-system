import { beforeEach, describe, expect, it, vi } from 'vitest';

// Ink-efficiency guard for all 6 report exports. Instead of trusting the
// source, it parses the PDF content stream each export actually produces —
// the same operators a printer driver receives.
const outputs = [];
vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal();
  class CapturingPdf extends mod.jsPDF {
    constructor(...args) {
      super(...args);
      this.save = () => { outputs.push(this.output()); };
    }
  }
  return { ...mod, jsPDF: CapturingPdf };
});

const { buildInvoicePdf } = await import('../invoicePdf');
const { buildPurchaseOrderPdf } = await import('../purchaseOrderPdf');
const { buildRfqPdf } = await import('../rfqPdf');
const { buildSalesSummaryPdf } = await import('../salesSummaryPdf');
const { buildBestSellingPartsPdf } = await import('../bestSellingPartsPdf');
const { buildSlowMovingStockPdf } = await import('../slowMovingStockPdf');

// Lightest a filled shape may be is "ultra-light": 85% of white or more.
const MIN_FILL_LIGHTNESS = 0.85;
// RGB (composite) is reserved for pale pastel tints only.
const MIN_RGB_COMPONENT = 0.85;

const COLOR_OP = /^([\d.]+(?: [\d.]+)*) (g|rg|k)$/;
const RGB_OP = /^([\d.]+) ([\d.]+) ([\d.]+) (rg|RG)$/;
const FILL_OP = /^(f|f\*|B|B\*|b|b\*)$/;

function lightness(values) {
  return Math.min(...values.map(Number));
}

// Walk the content stream, tracking the current non-stroking (fill) color, and
// report every filled shape painted darker than the allowed threshold.
function inkViolations(pdfSource) {
  const lines = pdfSource.split('\n').map((l) => l.trim());
  const dark = [];
  const rgbDark = [];
  let fill = 0;
  let inText = false;
  lines.forEach((line) => {
    if (line === 'BT') inText = true;
    if (line === 'ET') inText = false;
    const rgb = line.match(RGB_OP);
    if (rgb && lightness(rgb.slice(1, 4)) < MIN_RGB_COMPONENT) rgbDark.push(line);
    const color = line.match(COLOR_OP);
    if (color) fill = lightness(color[1].split(' '));
    if (!inText && FILL_OP.test(line) && fill < MIN_FILL_LIGHTNESS) dark.push(`${line} @ ${fill}`);
  });
  return { dark, rgbDark };
}

const formatCurrency = (v) => `PHP ${Number(v).toFixed(2)}`;
const po = {
  poNumber: 'PO-20261110-0001', status: 'CONFIRMED', createdAt: '2026-11-10', totalAmount: 1700,
  supplier: { name: 'Isuzu Parts Co', contactPerson: 'Ana', address: 'Manila', phone: '02-123', email: 'a@b.ph', paymentTerms: 'NET30' },
  items: [{ sku: 'BRK-PAD-00001', name: 'Brake Pad Set', quantity: 2, unitPrice: 850, subtotal: 1700, part: { oem: '8980066870' } }]
};
const range = { start: '2026-10-11', end: '2026-11-10' };

const exporters = {
  'Sales Invoice': () => buildInvoicePdf({
    invoiceNumber: 'INV-20261110-0001', transactionDate: '2026-11-10T02:00:00.000Z',
    customerName: 'Juan Dela Cruz', customerContact: '0917-123-4567',
    items: [{ name: 'Brake Pad Set', price: 850, quantity: 2 }],
    subtotal: 1517.86, discount: 0, taxAmount: 182.14, total: 1700, paymentMethod: 'CASH', amountTendered: 2000, changeGiven: 300
  }, { formatCurrency }),
  'Purchase Order': () => buildPurchaseOrderPdf(po),
  RFQ: () => buildRfqPdf(po),
  'Sales Summary': () => buildSalesSummaryPdf([{
    transactionDate: new Date().toISOString(), total: 1700, subtotal: 1517.86, discount: 0, taxAmount: 182.14,
    paymentMethod: 'CASH', status: 'COMPLETED', items: [{ name: 'Brake Pad Set', quantity: 2, price: 850 }]
  }], { selectedDate: new Date().toISOString().split('T')[0] }),
  'Best-Selling Parts': () => buildBestSellingPartsPdf([
    { rank: 1, rankDelta: 1, name: 'Brake Pad Set', sku: 'BRK-PAD-00001', oem: '898', category: 'Brakes', stock: 18, quantity: 42, revenue: 35700 }
  ], { dateRange: range }),
  'Slow-Moving Stock': () => buildSlowMovingStockPdf([
    { name: 'Radiator Cap', sku: 'COO-CAP-00001', oem: null, stock: 34, unitsSold: 0, daysSinceLastSale: 92 }
  ], { dateRange: range })
};

describe('report PDFs are ink-efficient for print', () => {
  beforeEach(() => { outputs.length = 0; });

  Object.entries(exporters).forEach(([name, run]) => {
    describe(name, () => {
      it('produces a PDF', () => {
        run();
        expect(outputs).toHaveLength(1);
      });

      it('paints no dark or solid background fills', () => {
        run();
        expect(inkViolations(outputs[0]).dark).toEqual([]);
      });

      it('uses RGB only for pale pastel tints (text and rules are single-channel gray)', () => {
        run();
        expect(inkViolations(outputs[0]).rgbDark).toEqual([]);
      });

      it('draws primary text in pure single-channel black', () => {
        run();
        expect(outputs[0]).toMatch(/^0\.? g$/m);
      });
    });
  });
});

describe('report PDF text survives the print fonts', () => {
  beforeEach(() => { outputs.length = 0; });

  it('prints full 13-character SKUs (XXX-XXX-#####) on Best-Selling and Slow-Moving', () => {
    exporters['Best-Selling Parts']();
    exporters['Slow-Moving Stock']();
    expect(outputs[0]).toContain('(BRK-PAD-00001)');
    expect(outputs[1]).toContain('(COO-CAP-00001)');
  });

  it('writes rank movement in ASCII (Helvetica has no arrow glyphs)', () => {
    exporters['Best-Selling Parts']();
    expect(outputs[0]).toContain('(+1)');
  });
});

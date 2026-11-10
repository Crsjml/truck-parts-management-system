import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsPDF attaches text()/save() per instance, so record them via a subclass.
const printed = [];
vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal();
  class RecordingPdf extends mod.jsPDF {
    constructor(...args) {
      super(...args);
      const text = this.text.bind(this);
      this.text = (value, ...rest) => {
        printed.push(Array.isArray(value) ? value.join(' ') : String(value));
        return text(value, ...rest);
      };
      this.save = () => {};
    }
  }
  return { ...mod, jsPDF: RecordingPdf };
});

const { buildInvoicePdf } = await import('../invoicePdf');

const formatCurrency = (v) => `PHP ${Number(v).toFixed(2)}`;
const baseTx = {
  transactionDate: '2026-11-10T02:00:00.000Z',
  customerName: 'Juan Dela Cruz',
  customerContact: '0917-123-4567',
  items: [{ name: 'Brake Pad Set', price: 850, quantity: 2 }],
  subtotal: 1517.86, discount: 0, taxAmount: 182.14, total: 1700, paymentMethod: 'CARD'
};
const allText = () => printed.join('\n');

describe('buildInvoicePdf invoice number', () => {
  beforeEach(() => { printed.length = 0; });

  it('prints the transaction invoice number when present', () => {
    buildInvoicePdf({ ...baseTx, invoiceNumber: 'INV-20261110-0007' }, { formatCurrency });
    expect(allText()).toContain('Invoice No : INV-20261110-0007');
  });

  it('prints a dash instead of inventing a number when the invoice number is missing', () => {
    buildInvoicePdf({ ...baseTx, invoiceNumber: '' }, { formatCurrency });
    expect(allText()).toContain('Invoice No : —');
    expect(allText()).not.toMatch(/INV-\d{8}-\d{4}/);
  });
});

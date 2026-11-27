import { beforeEach, describe, expect, it, vi } from 'vitest';

const saved = [];
vi.mock('jspdf', async (importOriginal) => {
  const mod = await importOriginal();
  class CapturingPdf extends mod.jsPDF {
    constructor(...args) {
      super(...args);
      this.save = () => { saved.push(this); };
    }
  }
  return { ...mod, jsPDF: CapturingPdf };
});

const { buildSalesSummaryPdf } = await import('../salesSummaryPdf');

const tx = {
  id: 'a', invoiceNumber: 'a', transactionDate: '2026-11-26T01:00:00+08:00', status: 'COMPLETED',
  paymentMethod: 'CASH', discount: 0, subtotal: 1000, taxAmount: 120, total: 1000,
  items: [{ name: 'Oil Filter', partId: 'p1', quantity: 1, price: 1000 }]
};

describe('buildSalesSummaryPdf currency', () => {
  beforeEach(() => { saved.length = 0; });

  it('defaults to PHP-coded money', () => {
    buildSalesSummaryPdf([tx], { selectedDate: '2026-11-26' });
    expect(saved[0].output()).toContain('PHP 1,000.00');
  });

  it('formats every money cell with the supplied formatter', () => {
    buildSalesSummaryPdf([tx], { selectedDate: '2026-11-26', formatCurrency: (v) => `USD ${v}` });
    const out = saved[0].output();
    expect(out).toContain('USD 1000');
    expect(out).not.toContain('PHP');
  });
});

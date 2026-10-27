import { describe, it, expect } from 'vitest';
import { buildInvoicePdf } from '../invoicePdf';
import { buildSlowMovingStockPdf } from '../slowMovingStockPdf';
import { buildSalesSummaryPdf } from '../salesSummaryPdf';
import { buildBestSellingPartsPdf } from '../bestSellingPartsPdf';

const formatCurrency = (v) => `PHP ${Number(v).toFixed(2)}`;

describe('shared PDF kit smoke tests', () => {
  it('buildInvoicePdf runs without throwing', () => {
    const tx = {
      invoiceNumber: 'INV-20261027-0001',
      transactionDate: new Date().toISOString(),
      customerName: 'Juan Dela Cruz',
      customerContact: '0917-123-4567',
      items: [{ name: 'Brake Pad Set', price: 850, quantity: 2 }],
      subtotal: 1700,
      discount: 0,
      taxAmount: 182.14,
      total: 1700,
      paymentMethod: 'CASH',
      amountTendered: 2000,
      changeGiven: 300
    };
    expect(() => buildInvoicePdf(tx, { formatCurrency, displayCurrency: 'PHP', duplicate: false })).not.toThrow();
  });

  it('buildSlowMovingStockPdf runs without throwing', () => {
    const items = [
      { name: 'Radiator Cap 1.1bar', sku: 'RC-11', oem: 'OEM-123', stock: 34, unitsSold: 0, daysSinceLastSale: 92 },
      { name: 'Wiper Blade 22"', sku: 'WB-22', oem: null, stock: 18, unitsSold: 0, daysSinceLastSale: null }
    ];
    const dateRange = { start: '2026-09-27', end: '2026-10-27' };
    expect(() => buildSlowMovingStockPdf(items, { dateRange })).not.toThrow();
  });

  it('buildSalesSummaryPdf runs without throwing', () => {
    const transactions = [
      {
        transactionDate: new Date().toISOString(),
        total: 1700,
        subtotal: 1700,
        discount: 0,
        taxAmount: 182.14,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        items: [{ name: 'Brake Pad Set', quantity: 2, price: 850 }]
      }
    ];
    expect(() => buildSalesSummaryPdf(transactions, { selectedDate: new Date().toISOString().split('T')[0] })).not.toThrow();
  });

  it('buildBestSellingPartsPdf runs without throwing', () => {
    const ranked = [
      { rank: 1, rankDelta: null, name: 'Brake Pad Set', sku: 'BP-ELF', oem: 'OEM-1', category: 'Brakes', stock: 18, quantity: 42, revenue: 35700 }
    ];
    const dateRange = { start: '2026-09-27', end: '2026-10-27' };
    expect(() => buildBestSellingPartsPdf(ranked, { dateRange })).not.toThrow();
  });
});

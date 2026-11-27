import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BestSellingPartsReport from '../analytics/BestSellingPartsReport';

vi.mock('../../utils/bestSellingPartsPdf', () => ({ buildBestSellingPartsPdf: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (v) => `$${v}` })
}));

const sale = (items) => ({
  id: 't1', transactionDate: new Date(Date.now() - 2 * 864e5).toISOString(),
  status: 'Completed', salesChannel: 'POS', items
});
const transactions = [sale([
  { partId: 'p1', name: 'Brake Pad', quantity: 10, price: 10 },
  { partId: 'p2', name: 'Oil Filter', quantity: 5, price: 100 },
  { partId: 'p3', name: 'Fan Belt', quantity: 1, price: 20 }
])];
const parts = [
  { id: 'p1', name: 'Brake Pad', sku: 'BRK-1', category: 'Brakes', stock: 0, minStock: 5 },
  { id: 'p2', name: 'Oil Filter', sku: 'OIL-9', category: 'Engine', stock: 3, minStock: 5 },
  { id: 'p3', name: 'Fan Belt', sku: 'BLT-2', category: 'Engine', stock: 50, minStock: 5 }
];

describe('Best-selling parts: summary strip and labels', () => {
  it('shows period totals for parts, units and revenue', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    const strip = screen.getByRole('group', { name: 'Totals for the selected period' });
    expect(within(strip).getByText('3')).toBeTruthy();
    expect(within(strip).getByText('Parts ranked')).toBeTruthy();
    expect(within(strip).getByText('16')).toBeTruthy();
    expect(within(strip).getByText('Units sold')).toBeTruthy();
    expect(within(strip).getByText('$620')).toBeTruthy();
    expect(within(strip).getByText('Revenue')).toBeTruthy();
  });

  it('omits the strip when nothing sold', () => {
    render(<BestSellingPartsReport transactions={[]} parts={parts} />);
    expect(screen.queryByRole('group', { name: 'Totals for the selected period' })).toBeNull();
  });

  it('gives the Low stock chip a warning tone instead of grey', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    const chip = screen.getByText('Low stock');
    expect(chip.className).toContain('amber');
    expect(chip.className).not.toContain('text-muted-foreground');
  });

  it('labels the stock column "Stock available" to match the PDF', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    expect(screen.getByRole('columnheader', { name: 'Stock available' })).toBeTruthy();
  });
});

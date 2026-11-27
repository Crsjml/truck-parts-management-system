import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SlowMovingStockReport from '../analytics/SlowMovingStockReport';

vi.mock('../../utils/slowMovingStockPdf', () => ({ buildSlowMovingStockPdf: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (v) => `$${v}` })
}));

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const sale = (id, n, partId) => ({
  id, transactionDate: daysAgo(n), status: 'Completed', salesChannel: 'POS',
  items: [{ partId, name: partId, quantity: 1, price: 1 }]
});
const parts = [
  { id: 'never', name: 'Never Part', sku: 'N-1', category: 'A', stock: 3, price: 1 },
  { id: 'old', name: 'Old Part', sku: 'O-1', category: 'A', stock: 3, price: 1 },
  { id: 'recent', name: 'Recent Part', sku: 'R-1', category: 'A', stock: 3, price: 1 }
];
const transactions = [sale('t1', 120, 'old'), sale('t2', 45, 'recent')];

const lastSaleCell = (partName) => {
  const row = screen.getByText(partName).closest('tr');
  return within(row).getAllByRole('cell').at(-1);
};

describe('Slow-moving Last sale emphasis', () => {
  it('flags never-sold and very old stock, with words and not colour alone', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    expect(lastSaleCell('Never Part')).toHaveAttribute('data-severity', 'never');
    expect(lastSaleCell('Never Part')).toHaveTextContent('Never sold');
    expect(lastSaleCell('Old Part')).toHaveAttribute('data-severity', 'old');
    expect(lastSaleCell('Old Part')).toHaveTextContent('120 days ago');
    expect(within(lastSaleCell('Old Part')).getByText('Idle 90+ days')).toBeTruthy();
  });

  it('leaves recent sales unemphasised', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    expect(lastSaleCell('Recent Part')).toHaveAttribute('data-severity', 'recent');
    expect(within(lastSaleCell('Recent Part')).queryByText('Idle 90+ days')).toBeNull();
  });
});

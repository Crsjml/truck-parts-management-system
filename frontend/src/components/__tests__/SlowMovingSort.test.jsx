import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
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
// value: Alpha 10, Bravo 300, Charlie 50 (no sale ever), Delta no cost
const parts = [
  { id: 'a', name: 'Alpha', sku: 'A', category: 'X', stock: 5, price: 2 },
  { id: 'b', name: 'Bravo', sku: 'B', category: 'X', stock: 3, price: 100 },
  { id: 'c', name: 'Charlie', sku: 'C', category: 'X', stock: 10, price: 5 },
  { id: 'd', name: 'Delta', sku: 'D', category: 'X', stock: 1 }
];
const transactions = [sale('t1', 40, 'a'), sale('t2', 70, 'b')];

const names = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
const header = (name) => screen.getByRole('columnheader', { name: new RegExp(name) });
const sortBy = (name) => fireEvent.click(within(header(name)).getByRole('button'));

describe('Slow-moving sorting', () => {
  it('defaults to longest idle first with no column marked sorted', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    expect(names()).toEqual(['Charlie', 'Delta', 'Bravo', 'Alpha']);
    expect(header('Stock value')).toHaveAttribute('aria-sort', 'none');
  });

  it('sorts by stock value, largest first then smallest first, with missing costs last', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    sortBy('Stock value');
    expect(names()).toEqual(['Bravo', 'Charlie', 'Alpha', 'Delta']);
    expect(header('Stock value')).toHaveAttribute('aria-sort', 'descending');
    sortBy('Stock value');
    expect(names()).toEqual(['Alpha', 'Charlie', 'Bravo', 'Delta']);
    expect(header('Stock value')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by last sale with never-sold treated as the longest idle', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    sortBy('Last sale');
    expect(names()).toEqual(['Charlie', 'Delta', 'Bravo', 'Alpha']);
    sortBy('Last sale');
    expect(names()).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  });

  it('sorts by current stock', () => {
    render(<SlowMovingStockReport transactions={transactions} parts={parts} />);
    sortBy('Current Stock');
    expect(names()).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
  });
});

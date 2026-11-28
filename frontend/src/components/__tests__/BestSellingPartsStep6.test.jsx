import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import BestSellingPartsReport from '../analytics/BestSellingPartsReport';
import { buildBestSellingPartsPdf } from '../../utils/bestSellingPartsPdf';

vi.mock('../../utils/bestSellingPartsPdf', () => ({ buildBestSellingPartsPdf: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (v) => `$${v}` })
}));

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const sale = (id, items) => ({
  id, transactionDate: daysAgo(2), status: 'Completed', salesChannel: 'POS', items
});

// Brake: 10 units / $100 total; Filter: 5 units / $500 total; Belt: 1 unit
const transactions = [
  sale('t1', [
    { partId: 'p1', name: 'Brake Pad', quantity: 10, price: 10 },
    { partId: 'p2', name: 'Oil Filter', quantity: 5, price: 100 },
    { partId: 'p3', name: 'Fan Belt', quantity: 1, price: 20 }
  ])
];
const parts = [
  { id: 'p1', name: 'Brake Pad', sku: 'BRK-1', category: 'Brakes', stock: 0, minStock: 5 },
  { id: 'p2', name: 'Oil Filter', sku: 'OIL-9', category: 'Engine', stock: 3, minStock: 5 },
  { id: 'p3', name: 'Fan Belt', sku: 'BLT-2', category: 'Engine', stock: 50, minStock: 5 }
];

const bodyNames = () =>
  screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[2].textContent);

beforeEach(() => vi.clearAllMocks());

describe('Best-selling parts: sorting', () => {
  it('defaults to Units descending and toggles to Revenue', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    const units = screen.getByRole('columnheader', { name: /Units/ });
    const revenue = screen.getByRole('columnheader', { name: /Revenue/ });
    expect(units).toHaveAttribute('aria-sort', 'descending');
    expect(revenue).toHaveAttribute('aria-sort', 'none');
    expect(bodyNames()).toEqual(['Brake Pad', 'Oil Filter', 'Fan Belt']);

    fireEvent.click(within(revenue).getByRole('button'));
    expect(revenue).toHaveAttribute('aria-sort', 'descending');
    expect(units).toHaveAttribute('aria-sort', 'none');
    expect(bodyNames()).toEqual(['Oil Filter', 'Brake Pad', 'Fan Belt']);

    fireEvent.click(within(revenue).getByRole('button'));
    expect(revenue).toHaveAttribute('aria-sort', 'ascending');
    expect(bodyNames()).toEqual(['Fan Belt', 'Brake Pad', 'Oil Filter']);
  });

  it('keeps the rank tied to units sold, not the current sort', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    fireEvent.click(within(screen.getByRole('columnheader', { name: /Revenue/ })).getByRole('button'));
    const firstRow = screen.getAllByRole('row')[1];
    expect(within(firstRow).getByText('#2')).toBeInTheDocument();
  });
});

describe('Best-selling parts: search', () => {
  it('filters by name, SKU and category inside a labelled search landmark', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    const box = screen.getByLabelText(/Search parts/i);
    fireEvent.change(box, { target: { value: 'blt-2' } });
    expect(bodyNames()).toEqual(['Fan Belt']);
    fireEvent.change(box, { target: { value: 'engine' } });
    expect(bodyNames()).toEqual(['Oil Filter', 'Fan Belt']);
    fireEvent.change(box, { target: { value: 'brake' } });
    expect(bodyNames()).toEqual(['Brake Pad']);
  });

  it('shows guidance when nothing matches', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    fireEvent.change(screen.getByLabelText(/Search parts/i), { target: { value: 'zzz' } });
    expect(screen.getByText(/widen the date range or check the channel filter/i)).toBeInTheDocument();
  });

  it('resets to page 1 when search or sort changes', () => {
    const many = [sale('big', Array.from({ length: 12 }, (_, i) => ({
      partId: `q${i}`, name: `Part ${String(i).padStart(2, '0')}`, quantity: 100 - i, price: 1
    })))];
    render(<BestSellingPartsReport transactions={many} parts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Showing 11 to 12 of 12/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('columnheader', { name: /Revenue/ })).getByRole('button'));
    expect(screen.getByText(/Showing 1 to 10 of 12/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText(/Search parts/i), { target: { value: 'part' } });
    expect(screen.getByText(/Showing 1 to 10 of 12/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });
});

describe('Best-selling parts: paging and raw search', () => {
  const big = (n) => [sale('big', Array.from({ length: n }, (_, i) => ({
    partId: `q${i}`, name: `Part ${String(i).padStart(2, '0')}`, quantity: 100 - i, price: 1
  })))];

  it('clamps a stranded page when the data shrinks', () => {
    const { rerender } = render(<BestSellingPartsReport transactions={big(25)} parts={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Showing 21 to 25 of 25/)).toBeInTheDocument();
    rerender(<BestSellingPartsReport transactions={big(12)} parts={[]} />);
    expect(screen.getByText(/Showing 11 to 12 of 12/)).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBe(3);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    rerender(<BestSellingPartsReport transactions={big(5)} parts={[]} />);
    expect(screen.getAllByRole('row').length).toBe(6);
  });

  it('does not match display fallbacks such as N/A, Uncategorized or undefined', () => {
    const txs = [sale('x', [
      { partId: 'a1', name: 'Alpha', quantity: 2, price: 1 },
      { partId: 'a2', quantity: 1, price: 1 }
    ])];
    const noSku = [{ id: 'a1', name: 'Alpha' }];
    render(<BestSellingPartsReport transactions={txs} parts={noSku} />);
    const box = screen.getByLabelText(/Search parts/i);
    fireEvent.change(box, { target: { value: 'n' } });
    // "Alpha" matches 'n'? No: 'alpha' has no n, and N/A / undefined are only display fallbacks.
    expect(screen.queryByText('Alpha')).toBeNull();
    fireEvent.change(box, { target: { value: 'undefined' } });
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.queryByText(/^undefined$/)).toBeNull();
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.getByText(/No parts match your search/)).toBeInTheDocument();
  });
});

describe('Best-selling parts: stock badges', () => {
  it('flags out of stock and low stock but not healthy stock', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    const [brake, filter, belt] = screen.getAllByRole('row').slice(1);
    const out = within(brake).getByText('Out of stock');
    expect(out.className).toContain('alarm-text');
    expect(within(filter).getByText('Low stock')).toBeInTheDocument();
    expect(within(belt).queryByText(/stock$/)).toBeNull();
  });

  it('shows the available quantity, not raw stock, when units are reserved', () => {
    const reserved = [{ id: 'p1', name: 'Brake Pad', sku: 'B', category: 'Brakes', stock: 5, reservedStock: 5, minStock: 2 }];
    render(<BestSellingPartsReport transactions={transactions} parts={reserved} />);
    const row = screen.getAllByRole('row')[1];
    const cell = within(row).getAllByRole('cell')[5];
    expect(within(cell).getByText('Out of stock')).toBeInTheDocument();
    expect(cell).toHaveTextContent('0');
    expect(cell).toHaveTextContent('(5 reserved)');
    expect(cell.textContent.replace('(5 reserved)', '')).not.toMatch(/5/);
  });
});

describe('Best-selling parts: rank change baseline', () => {
  it('renames the column, states the baseline and explains NEW and the dash', () => {
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    expect(screen.queryByText('Momentum')).toBeNull();
    expect(screen.getByRole('columnheader', { name: /Rank change/ })).toBeInTheDocument();
    expect(screen.getByText(/vs previous 31 days/i)).toBeInTheDocument();
    expect(screen.getByText(/NEW = not ranked in the previous period/i)).toBeInTheDocument();
    expect(screen.getByText(/— = unchanged/i)).toBeInTheDocument();
  });
});

describe('Best-selling parts: PDF export', () => {
  it('labels the button with the part count and exports all ranked parts', async () => {
    const showToast = vi.fn();
    render(<BestSellingPartsReport transactions={transactions} parts={parts} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF (all 3 parts)' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/exported/i), 'success'));
    expect(buildBestSellingPartsPdf).toHaveBeenCalledOnce();
    expect(buildBestSellingPartsPdf.mock.calls[0][0]).toHaveLength(3);
  });

  it('shows only a toast (no inline alert) when showToast is provided', async () => {
    const showToast = vi.fn();
    buildBestSellingPartsPdf.mockImplementationOnce(() => { throw new Error('jsPDF exploded'); });
    render(<BestSellingPartsReport transactions={transactions} parts={parts} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/jsPDF exploded/), 'error'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: /Export PDF/ })).toBeEnabled();
  });

  it('falls back to an inline alert without a toast and clears it when the range changes', async () => {
    buildBestSellingPartsPdf.mockImplementationOnce(() => { throw new Error('jsPDF exploded'); });
    const { container } = render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/jsPDF exploded/);
    const start = container.querySelector('input[type="date"]');
    fireEvent.change(start, { target: { value: start.value.slice(0, 8) + '01' } });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('ignores a second click while an export is in progress', async () => {
    let release;
    buildBestSellingPartsPdf.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    render(<BestSellingPartsReport transactions={transactions} parts={parts} />);
    const btn = screen.getByRole('button', { name: /Export PDF/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(buildBestSellingPartsPdf).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('aria-busy', 'true');
    release();
    await waitFor(() => expect(btn).toHaveAttribute('aria-busy', 'false'));
  });

  it('disables export with an explanation when there are no rows', () => {
    render(<BestSellingPartsReport transactions={[]} parts={parts} />);
    const btn = screen.getByRole('button', { name: /Export PDF/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/no sales/i));
  });
});

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import SlowMovingStockReport from '../analytics/SlowMovingStockReport';
import { buildSlowMovingStockPdf } from '../../utils/slowMovingStockPdf';
import { toLocalDateKey, addLocalDays } from '../../utils/localDate';

vi.mock('../../utils/slowMovingStockPdf', () => ({ buildSlowMovingStockPdf: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (v) => `$${v}` })
}));

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const sale = (id, n, partId, channel = 'POS') => ({
  id, transactionDate: daysAgo(n), status: 'Completed', salesChannel: channel,
  items: [{ partId, name: partId, quantity: 1, price: 1 }]
});

const parts = [
  { id: 'p1', name: 'Brake Pad', sku: 'BRK-1', category: 'Brakes', stock: 4, price: 10 },
  { id: 'p2', name: 'Oil Filter', sku: '', category: 'Engine', stock: 9, price: 5 },
  { id: 'p3', name: 'Fan Belt', sku: 'BLT-2', category: { name: 'Engine' }, stock: 2 }, // no cost
  { id: 'p4', name: 'Spark Plug', sku: 'SPK-4', category: 'Ignition', stock: 7, price: 2 },
  { id: 'p5', name: 'Sold Recently', sku: 'REC-5', category: 'Brakes', stock: 5, price: 1 }
];
// p1 last sold 50d ago, p4 last sold 80d ago, p5 sold in the window; p2/p3 never
const transactions = [sale('t1', 50, 'p1'), sale('t2', 80, 'p4'), sale('t3', 3, 'p5')];

const names = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
const renderIt = (props = {}) => render(<SlowMovingStockReport transactions={transactions} parts={parts} {...props} />);

beforeEach(() => vi.clearAllMocks());

describe('Slow-moving stock: rows and totals', () => {
  it('lists Never-sold first (by stock), then longest idle', () => {
    renderIt();
    expect(names()).toEqual(['Oil Filter', 'Fan Belt', 'Spark Plug', 'Brake Pad']);
  });

  it('totals parts and capital, ignoring parts without a cost', () => {
    renderIt();
    // 9*5 + 7*2 + 4*10 = 99; Fan Belt has no cost
    expect(screen.getByText('4 parts')).toBeInTheDocument();
    expect(screen.getByText('$99')).toBeInTheDocument();
    expect(screen.getByText(/1 without cost, not counted/)).toBeInTheDocument();
    const fanRow = screen.getByText('Fan Belt').closest('tr');
    expect(within(fanRow).getAllByRole('cell')[4]).toHaveTextContent('—');
    expect(within(fanRow).getAllByRole('cell')[2]).toHaveTextContent('Engine');
  });

  it('shows an em dash for a missing SKU and no Units Sold column', () => {
    renderIt();
    const row = screen.getByText('Oil Filter').closest('tr');
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('—');
    expect(screen.queryByText(/Units Sold/i)).not.toBeInTheDocument();
  });
});

describe('Slow-moving stock: last sale scope', () => {
  it('uses allTransactions for Last Sale when the list is channel-filtered', () => {
    renderIt({ transactions: [], allTransactions: transactions });
    const row = screen.getByText('Brake Pad').closest('tr');
    expect(within(row).getAllByRole('cell')[5]).toHaveTextContent('50 days ago');
    expect(screen.getByRole('columnheader', { name: /Last sale \(any channel\)/ })).toBeInTheDocument();
  });

  it('shows Never sold when there is no sale on any channel', () => {
    renderIt();
    expect(within(screen.getByText('Oil Filter').closest('tr')).getAllByRole('cell')[5]).toHaveTextContent('Never sold');
  });
});

describe('Slow-moving stock: window presets', () => {
  it('defaults to 30 days and switches the range with aria-pressed', () => {
    renderIt();
    const group = screen.getByRole('group', { name: /Look-back window/ });
    expect(within(group).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: '90 days' }));
    const today = toLocalDateKey(new Date());
    const dates = document.querySelectorAll('input[type="date"]');
    expect(dates[0].value).toBe(addLocalDays(today, -90));
    expect(dates[1].value).toBe(today);
    expect(within(group).getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a wider window removes parts sold inside it from the list', () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: '6 months' }));
    expect(names()).not.toContain('Sold Recently');
    // 60 days window: Brake Pad (50d) now counts as sold
    fireEvent.click(screen.getByRole('button', { name: '60 days' }));
    expect(names()).not.toContain('Brake Pad');
    expect(names()).toContain('Spark Plug');
  });
});

describe('Slow-moving stock: empty states', () => {
  it('says every part sold when nothing is slow, and explains the disabled export', () => {
    renderIt({ parts: [parts[4]] });
    expect(screen.getByText(/Every stocked part sold in this period\. Try a longer/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Export PDF/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAccessibleDescription(/nothing to export/);
  });

  it('gives a search-specific message', () => {
    renderIt();
    fireEvent.change(screen.getByLabelText(/Search parts/i), { target: { value: 'zzz' } });
    expect(screen.getByText(/No parts match your search/)).toBeInTheDocument();
  });
});

describe('Slow-moving stock: export', () => {
  it('labels the button with the full count and toasts on success', async () => {
    const showToast = vi.fn();
    renderIt({ showToast });
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF (all 4 parts)' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('PDF exported (4 parts).', 'success'));
    expect(buildSlowMovingStockPdf).toHaveBeenCalledTimes(1);
    expect(buildSlowMovingStockPdf.mock.calls[0][0]).toHaveLength(4);
  });

  it('toasts the error when showToast is given', async () => {
    buildSlowMovingStockPdf.mockImplementationOnce(() => { throw new Error('boom'); });
    const showToast = vi.fn();
    renderIt({ showToast });
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('PDF export failed: boom', 'error'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falls back to an inline alert, cleared when the range changes', async () => {
    buildSlowMovingStockPdf.mockImplementationOnce(() => { throw new Error('boom'); });
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF export failed: boom');
    fireEvent.click(screen.getByRole('button', { name: '60 days' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('ignores a second click while an export is running', async () => {
    let release;
    buildSlowMovingStockPdf.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    renderIt();
    const btn = screen.getByRole('button', { name: /Export PDF/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(buildSlowMovingStockPdf).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /Exporting/ })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole('button', { name: /Export PDF/ })).toBeEnabled());
  });
});

describe('Slow-moving stock: pager', () => {
  const many = Array.from({ length: 23 }, (_, i) => ({ id: `m${i}`, name: `Part ${String(i).padStart(2, '0')}`, sku: `S${i}`, category: 'X', stock: 100 - i, price: 1 }));

  it('pages by 10, shows the live count and clamps when a search shrinks the list', () => {
    render(<SlowMovingStockReport transactions={[]} parts={many} />);
    const nav = screen.getByRole('navigation', { name: /pagination/i });
    expect(within(nav).getByText(/Showing 1 to 10 of 23 parts/)).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(within(nav).getByRole('button', { name: 'Next' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'Next' }));
    expect(within(nav).getByText(/Showing 21 to 23 of 23 parts/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Search parts/i), { target: { value: 'part 0' } });
    expect(names()).toHaveLength(10);
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Search parts/i), { target: { value: '' } });
    expect(screen.getByText(/Showing 1 to 10 of 23 parts/)).toBeInTheDocument();
  });

  it('uses scope=col headers and an sr-only caption', () => {
    renderIt();
    screen.getAllByRole('columnheader').forEach((th) => expect(th).toHaveAttribute('scope', 'col'));
    expect(screen.getByText(/longest idle first/).tagName).toBe('CAPTION');
  });
});

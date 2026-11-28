import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import Analytics from '../Analytics';

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: 15 },
    formatCurrency: (val) => `$${val}`,
    formatBaseCurrency: (val) => `$${val}`,
    formatCompactCurrency: (val) => `$${val}`,
    formatCompactBaseCurrency: (val) => `$${val}`
  })
}));
vi.mock('../../authStore', () => ({ fetchCategoriesList: vi.fn().mockResolvedValue([]) }));
vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }) } }
}));

global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const tx = (i, over = {}) => ({
  id: `tx${i}`,
  invoiceNumber: `INV-${i}`,
  customerName: `Customer ${i}`,
  transactionDate: daysAgo(1),
  salesChannel: 'POS',
  paymentMethod: 'CASH',
  status: 'Completed',
  total: 100,
  items: [{ quantity: 1, price: 100 }],
  ...over
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

describe('Online payment mix', () => {
  it('computes the dominant method share from real payments', () => {
    const txs = [
      tx(1, { salesChannel: 'WEB', paymentMethod: 'CARD', total: 300 }),
      tx(2, { salesChannel: 'WEB', paymentMethod: 'GCASH', total: 100 })
    ];
    render(<Analytics parts={[]} transactions={txs} />);
    fireEvent.click(screen.getByRole('button', { name: /Online/i }));

    expect(screen.getByText('75% Card')).toBeInTheDocument();
    expect(screen.getByText(/25% GCash/)).toBeInTheDocument();
    expect(screen.queryByText('100% Card')).not.toBeInTheDocument();
  });

  it('shows 100% only when every online payment used that method', () => {
    render(<Analytics parts={[]} transactions={[tx(1, { salesChannel: 'WEB', paymentMethod: 'GCASH', total: 80 })]} />);
    fireEvent.click(screen.getByRole('button', { name: /Online/i }));
    expect(screen.getByText('100% GCash')).toBeInTheDocument();
  });
});

describe('Sales invoice ledger paging', () => {
  const many = Array.from({ length: 12 }, (_, i) => tx(i + 1, { transactionDate: daysAgo(1 + i * 0.01) }));
  const viewButtons = () => screen.getAllByRole('button', { name: /View Invoice Details/i });

  it('defaults to 10 rows with a "Page X of Y" label and a page-size control', () => {
    render(<Analytics parts={[]} transactions={many} />);
    expect(viewButtons()).toHaveLength(10);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    const size = screen.getByLabelText(/Rows per page/i);
    expect(size).toHaveValue('10');
    expect(within(size).getAllByRole('option').map(o => o.textContent)).toEqual(['10', '25', '50']);
  });

  it('changes page size and resets to page 1', () => {
    render(<Analytics parts={[]} transactions={many} />);
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(viewButtons()).toHaveLength(2);

    fireEvent.change(screen.getByLabelText(/Rows per page/i), { target: { value: '25' } });
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(viewButtons()).toHaveLength(12);
  });

  it('keeps cancelled orders in the ledger', () => {
    render(<Analytics parts={[]} transactions={[tx(1), tx(2, { status: 'Cancelled' })]} />);
    expect(viewButtons()).toHaveLength(2);
  });
});

describe('KPI delta baseline', () => {
  const withPrior = [tx(1), tx(2, { transactionDate: daysAgo(40), total: 50 })];

  it('names the baseline period in the delta label', () => {
    render(<Analytics parts={[]} transactions={withPrior} />);
    expect(screen.getAllByText(/vs previous 30 days/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/vs prior$/i)).not.toBeInTheDocument();
  });

  it('hides the empty "No prior period" line on All Time', () => {
    render(<Analytics parts={[]} transactions={withPrior} />);
    fireEvent.click(screen.getByRole('button', { name: /All Time/i }));
    expect(screen.queryByText(/No prior period/i)).not.toBeInTheDocument();
  });
});

describe('Order Status total', () => {
  it('notes cancelled orders are included in the total', () => {
    render(<Analytics parts={[]} transactions={[tx(1), tx(2, { status: 'Cancelled' })]} />);
    expect(screen.getByText(/2 orders · incl\. 1 cancelled/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import Analytics from '../Analytics';
import DailySalesSummary from '../analytics/DailySalesSummary';

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatBaseCurrency: (v) => `$${v}`,
    formatCurrency: (v) => `$${v}`,
    formatCompactBaseCurrency: (v) => `$${v}`,
    formatCompactCurrency: (v) => `$${v}`
  })
}));
vi.mock('../../authStore', () => ({ fetchCategoriesList: vi.fn().mockResolvedValue([]) }));
vi.mock('../../supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const TAB_NAMES = ['Overview', 'Daily Sales', 'Best-Selling Parts', 'Slow-Moving Stock', 'Busy Periods'];
const tab = (name) => screen.getByRole('tab', { name });

const tx = (over) => ({
  id: 'x', invoiceNumber: 'INV-1', customerName: 'C', salesChannel: 'WEB', status: 'COMPLETED',
  transactionDate: new Date().toISOString(), total: 100, items: [{ quantity: 1, price: 100 }], ...over
});

describe('Analytics tab bar semantics', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  it('renders a labelled tablist with roving tabindex and linked panel', () => {
    render(<Analytics parts={[]} transactions={[]} />);
    const list = screen.getByRole('tablist');
    expect(list).toHaveAttribute('aria-label');
    expect(within(list).getAllByRole('tab').map((t) => t.textContent)).toEqual(TAB_NAMES);
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Overview')).toHaveAttribute('tabindex', '0');
    expect(tab('Daily Sales')).toHaveAttribute('aria-selected', 'false');
    expect(tab('Daily Sales')).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab('Overview').id);
    expect(tab('Overview')).toHaveAttribute('aria-controls', panel.id);
  });

  it('ArrowRight/ArrowLeft wrap, Home/End jump, and aria-selected follows', () => {
    render(<Analytics parts={[]} transactions={[]} />);
    fireEvent.keyDown(tab('Overview'), { key: 'ArrowRight' });
    expect(tab('Daily Sales')).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tab('Daily Sales'));
    fireEvent.keyDown(tab('Daily Sales'), { key: 'ArrowLeft' });
    fireEvent.keyDown(tab('Overview'), { key: 'ArrowLeft' });
    expect(tab('Busy Periods')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('Busy Periods'), { key: 'ArrowRight' });
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('Overview'), { key: 'End' });
    expect(tab('Busy Periods')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tab('Busy Periods'), { key: 'Home' });
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab('Overview').id);
  });

  it('does not step the Daily Sales day when arrows are pressed inside the tab bar', () => {
    const { container } = render(
      <>
        <div role="tablist"><button role="tab" data-testid="t">t</button></div>
        <DailySalesSummary transactions={[]} />
      </>
    );
    const input = () => container.querySelector('input[type="date"]');
    const before = input().value;
    fireEvent.keyDown(screen.getByTestId('t'), { key: 'ArrowLeft' });
    expect(input().value).toBe(before);
    // control: the same key from the page body still steps the day
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(input().value).not.toBe(before);
  });
});

describe('Analytics shared header', () => {
  const txs = [tx({ id: 'a', salesChannel: 'WEB', total: 100 }), tx({ id: 'b', salesChannel: 'POS', total: 50 })];

  it.each(TAB_NAMES)('shows the channel selector on %s and it filters', (name) => {
    render(<Analytics parts={[]} transactions={txs} />);
    fireEvent.click(tab(name));
    const group = screen.getByRole('group', { name: /sales channel/i });
    fireEvent.click(within(group).getByRole('button', { name: 'Online' }));
    expect(within(group).getByRole('button', { name: 'Online' })).toHaveAttribute('aria-pressed', 'true');
    if (name !== 'Overview') expect(screen.getByTestId('tab-scope')).toHaveTextContent('Online only');
  });

  it('shows the period selector on Overview only', () => {
    render(<Analytics parts={[]} transactions={txs} />);
    expect(screen.getByRole('button', { name: 'Last 7 Days' })).toBeInTheDocument();
    fireEvent.click(tab('Best-Selling Parts'));
    expect(screen.queryByRole('button', { name: 'Last 7 Days' })).toBeNull();
  });

  it('states scope per report tab and that Busy Periods has its own range', () => {
    render(<Analytics parts={[]} transactions={txs} />);
    fireEvent.click(tab('Daily Sales'));
    expect(screen.getByTestId('tab-scope')).toHaveTextContent('In-store + Online');
    fireEvent.click(tab('Busy Periods'));
    expect(screen.getByTestId('tab-scope')).toHaveTextContent(/own date range/i);
  });

  it('derives the period label in Needs attention from PERIODS', () => {
    render(<Analytics parts={[]} transactions={txs} />);
    fireEvent.click(screen.getByRole('button', { name: 'All Time' }));
    expect(screen.getByText(/All channels · All Time/)).toBeInTheDocument();
  });

  it('shows the empty state when the period has only cancelled orders', () => {
    render(<Analytics parts={[]} transactions={[tx({ status: 'CANCELLED' })]} />);
    expect(screen.getAllByText('No data for selected period.').length).toBeGreaterThan(0);
  });
});

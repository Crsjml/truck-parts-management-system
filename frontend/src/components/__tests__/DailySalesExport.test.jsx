import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DailySalesSummary from '../analytics/DailySalesSummary';
import { buildSalesSummaryPdf } from '../../utils/salesSummaryPdf';

vi.mock('../../utils/salesSummaryPdf', () => ({ buildSalesSummaryPdf: vi.fn() }));
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (n) => `PHP ${n}` })
}));

const sale = {
  id: 'a', invoiceNumber: 'a', transactionDate: '2026-11-26T01:00:00Z', status: 'COMPLETED', paymentMethod: 'CASH',
  discount: 0, subtotal: 0, taxAmount: 0, total: 100, items: [{ name: 'Oil Filter', partId: 'p1', quantity: 1, price: 100 }]
};

describe('Daily Sales PDF export feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T04:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('confirms a successful export with a toast', async () => {
    const showToast = vi.fn();
    render(<DailySalesSummary transactions={[sale]} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/PDF exported/), 'success'));
    expect(buildSalesSummaryPdf).toHaveBeenCalledTimes(1);
  });

  it('reports a failed export instead of failing silently', async () => {
    buildSalesSummaryPdf.mockImplementationOnce(() => { throw new Error('boom'); });
    const showToast = vi.fn();
    render(<DailySalesSummary transactions={[sale]} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('PDF export failed: boom', 'error'));
  });

  it('explains why export is disabled when the day has no sales', () => {
    render(<DailySalesSummary transactions={[]} />);
    const button = screen.getByRole('button', { name: /Export PDF/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/No sales on this day/);
  });
});

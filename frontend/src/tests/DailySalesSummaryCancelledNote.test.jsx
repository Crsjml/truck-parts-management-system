import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DailySalesSummary from '../components/analytics/DailySalesSummary';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (n) => `PHP ${n}` }),
}));

const base = { paymentMethod: 'CASH', discount: 0, subtotal: 0, taxAmount: 0 };
const tx = (id, status) => ({
  ...base, id, invoiceNumber: id, transactionDate: '2026-11-26T01:00:00Z', status, total: 100,
  items: [{ name: 'Oil Filter', partId: 'p1', quantity: 1, price: 100 }]
});

describe('DailySalesSummary Order Status note', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T04:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('explains that cancelled orders are excluded from sales figures', () => {
    render(<DailySalesSummary transactions={[tx('a', 'COMPLETED'), tx('b', 'CANCELLED')]} />);
    expect(screen.getAllByText('Cancelled orders are excluded from sales figures').length).toBeGreaterThan(0);
  });
});

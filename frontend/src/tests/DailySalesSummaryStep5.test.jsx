import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DailySalesSummary from '../components/analytics/DailySalesSummary';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (n) => `PHP ${n}` }),
}));

const dateInput = (c) => c.querySelector('input[type="date"]');
const base = { paymentMethod: 'CASH', discount: 0, subtotal: 0, taxAmount: 0 };
// 2026-11-26 08:00 Manila
const NOW = '2026-11-26T00:00:00Z';
const tx = (id, date, status, items, total) => ({ ...base, id, invoiceNumber: id, transactionDate: date, status, total, items });

describe('DailySalesSummary step 5', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T04:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const data = [
    tx('a', '2026-11-26T01:00:00Z', 'COMPLETED', [{ name: 'Oil Filter', partId: 'p1', quantity: 2, price: 50 }], 100),
    tx('b', '2026-11-25T01:00:00Z', 'COMPLETED', [{ name: 'Oil Filter', partId: 'p1', quantity: 1, price: 50 }], 50),
  ];

  it('labels KPI deltas "vs previous day"', () => {
    render(<DailySalesSummary transactions={data} />);
    expect(screen.getAllByText(/vs previous day/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/vs prior period/)).toBeNull();
  });

  it('shows revenue column and rank badge in Top Selling Parts', () => {
    render(<DailySalesSummary transactions={data} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Revenue')).toBeTruthy();
    expect(within(table).getByText('PHP 100')).toBeTruthy();
    expect(within(table).getByText('—')).toBeTruthy();
  });

  it('gives icon buttons aria-labels and the date input a label', () => {
    const { container } = render(<DailySalesSummary transactions={data} />);
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeTruthy();
    expect(screen.getByLabelText('Select date')).toBe(dateInput(container));
    expect(dateInput(container).className).not.toMatch(/(^|\s)focus:border/);
    expect(dateInput(container).className).toMatch(/focus-visible:ring/);
  });

  describe('arrow keys', () => {
    it('ArrowLeft on body changes day, using fresh state across presses', () => {
      const { container } = render(<DailySalesSummary transactions={data} />);
      fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
      fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
      expect(dateInput(container).value).toBe('2026-11-24');
      fireEvent.keyDown(document.body, { key: 'ArrowRight' });
      expect(dateInput(container).value).toBe('2026-11-25');
    });

    it('ArrowRight is a no-op on today', () => {
      const { container } = render(<DailySalesSummary transactions={data} />);
      fireEvent.keyDown(document.body, { key: 'ArrowRight' });
      expect(dateInput(container).value).toBe('2026-11-26');
    });

    it('ignores events targeting the date input', () => {
      const { container } = render(<DailySalesSummary transactions={data} />);
      fireEvent.keyDown(dateInput(container), { key: 'ArrowLeft' });
      expect(dateInput(container).value).toBe('2026-11-26');
    });

    it('still steps when a day button has focus after being clicked', () => {
      const { container } = render(<DailySalesSummary transactions={data} />);
      const prev = screen.getByRole('button', { name: 'Previous day' });
      fireEvent.click(prev);
      prev.focus();
      fireEvent.keyDown(prev, { key: 'ArrowLeft' });
      expect(dateInput(container).value).toBe('2026-11-24');
    });

    it.each(['altKey', 'metaKey', 'ctrlKey', 'shiftKey'])('does not step with %s held', (mod) => {
      const { container } = render(<DailySalesSummary transactions={data} />);
      fireEvent.keyDown(document.body, { key: 'ArrowLeft', [mod]: true });
      expect(dateInput(container).value).toBe('2026-11-26');
    });

    it('calls preventDefault only when a step happens', () => {
      render(<DailySalesSummary transactions={data} />);
      // fireEvent returns false when preventDefault was called
      expect(fireEvent.keyDown(document.body, { key: 'ArrowRight' })).toBe(true);
      expect(fireEvent.keyDown(document.body, { key: 'ArrowLeft' })).toBe(false);
      expect(fireEvent.keyDown(document.body, { key: 'ArrowLeft', altKey: true })).toBe(true);
      expect(fireEvent.keyDown(document.body, { key: 'ArrowRight' })).toBe(false);
    });

    it('ignores select, textarea and tablist targets', () => {
      const { container } = render(
        <div>
          <select data-testid="s" /><textarea data-testid="t" />
          <div role="tablist"><span data-testid="tab" /></div>
          <DailySalesSummary transactions={data} />
        </div>
      );
      for (const id of ['s', 't', 'tab']) fireEvent.keyDown(screen.getByTestId(id), { key: 'ArrowLeft' });
      expect(dateInput(container).value).toBe('2026-11-26');
    });
  });

  it('shows Today button only for past dates and jumps back', () => {
    const { container } = render(<DailySalesSummary transactions={data} />);
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
    fireEvent.change(dateInput(container), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(dateInput(container).value).toBe('2026-11-26');
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
  });

  it('cancelled-only day reads as no sales, disables PDF, keeps status breakdown', () => {
    const cancelled = [tx('c', NOW, 'CANCELLED', [{ name: 'Gasket', partId: 'p9', quantity: 1, price: 10 }], 10)];
    render(<DailySalesSummary transactions={cancelled} />);
    expect(screen.getByText('No sales recorded for this day')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Export PDF/ }).disabled).toBe(true);
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('truly empty day shows the neutral empty state', () => {
    render(<DailySalesSummary transactions={[]} />);
    expect(screen.getByText('No sales recorded for this day')).toBeTruthy();
  });
});

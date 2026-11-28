import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PeakSalesPeriodReport from '../analytics/PeakSalesPeriodReport';
import DateRangePicker from '../analytics/DateRangePicker';
import { PeakTooltipContent, peakTickInterval } from '../analytics/ChartRenderer';
import { peakSalesBuckets, peakCalloutText } from '../../utils/salesAnalytics';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    Bar: (props) => <actual.Bar {...props} isAnimationActive={false} />,
    ResponsiveContainer: ({ children }) => React.cloneElement(children, { width: 600, height: 400 })
  };
});
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatBaseCurrency: (v) => `$${v}`,
    formatCompactBaseCurrency: (v) => `$${v}K!`
  })
}));

const at = (iso, total, id = iso + total) => ({ id, transactionDate: iso, total, status: 'Completed', salesChannel: 'POS', items: [] });
const day = (d) => new Date(2024, 10, d, 12, 0, 0).toISOString();
const range = (s, e) => ({ start: new Date(2024, 10, s), end: new Date(2024, 10, e, 23, 59, 59, 999) });

describe('peakCalloutText', () => {
  const txs = [at(day(13), 100), at(day(14), 8000), at(day(14), 4400), at(day(15), 50)];

  it('names the busiest day with revenue and invoices', () => {
    const series = peakSalesBuckets(txs, range(12, 16), 'day');
    expect(peakCalloutText(series, 'day', (v) => `P${v}`)).toBe('Busiest day: Thu 14 Nov, P12400 from 2 invoices');
  });

  it('uses singular invoice', () => {
    const series = peakSalesBuckets([at(day(14), 5)], range(12, 16), 'day');
    expect(peakCalloutText(series, 'day', (v) => `P${v}`)).toMatch(/from 1 invoice$/);
  });

  it('names the busiest week as a 7-day span, not a calendar week', () => {
    const series = peakSalesBuckets(txs, range(1, 28), 'week');
    expect(series[0].label).toBe('7 days from Nov 1');
    expect(peakCalloutText(series, 'week', (v) => `P${v}`)).toBe('Busiest week (7 days from Nov 8): P12500 from 3 invoices');
  });

  it('names the busiest month', () => {
    const series = peakSalesBuckets(txs, range(1, 30), 'month');
    expect(peakCalloutText(series, 'month', (v) => `P${v}`)).toBe('Busiest month: Nov 2024, P12550 from 4 invoices');
  });

  it('returns null with no sales', () => {
    const series = peakSalesBuckets([], range(1, 5), 'day');
    expect(peakCalloutText(series, 'day', String)).toBeNull();
  });

  it('on a tie, the first (earliest) period is the peak', () => {
    const series = peakSalesBuckets([at(day(14), 100), at(day(15), 100)], range(12, 16), 'day');
    expect(series.filter((s) => s.isPeak)).toHaveLength(1);
    expect(peakCalloutText(series, 'day', (v) => `P${v}`)).toMatch(/Thu 14 Nov/);
  });
});

describe('week buckets are fixed 7-day slices', () => {
  it('slices start exactly 7 days apart', () => {
    const series = peakSalesBuckets([], range(1, 20), 'week');
    expect(series).toHaveLength(3);
    expect(series[1].date.getDate() - series[0].date.getDate()).toBe(7);
  });
});

describe('PeakTooltipContent', () => {
  const fmt = (v) => `$${v}`;
  it('shows revenue, invoice count and Busiest flag for the peak', () => {
    render(<PeakTooltipContent active payload={[{ payload: { label: 'Nov 14', revenue: 12400, invoices: 9, isPeak: true } }]} formatCurrency={fmt} />);
    expect(screen.getByText('$12400')).toBeInTheDocument();
    expect(screen.getByText('9 invoices')).toBeInTheDocument();
    expect(screen.getByText('Busiest')).toBeInTheDocument();
  });
  it('omits the flag for other buckets and renders nothing when inactive', () => {
    const { rerender, container } = render(<PeakTooltipContent active payload={[{ payload: { label: 'x', revenue: 1, invoices: 1, isPeak: false } }]} formatCurrency={fmt} />);
    expect(screen.queryByText('Busiest')).toBeNull();
    expect(screen.getByText('1 invoice')).toBeInTheDocument();
    rerender(<PeakTooltipContent active={false} payload={[]} formatCurrency={fmt} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DateRangePicker labels', () => {
  it('labels both inputs', () => {
    render(<DateRangePicker start="2024-11-01" end="2024-11-05" onChange={() => {}} />);
    expect(screen.getByLabelText('Start date')).toHaveValue('2024-11-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2024-11-05');
    expect(screen.getByLabelText('Start date').className).not.toMatch(/glowing/);
    expect(screen.getByLabelText('Start date').className).toMatch(/focus-visible:ring-2/);
  });
});

describe('PeakSalesPeriodReport', () => {
  const recent = (n, total) => at(new Date(Date.now() - n * 864e5).toISOString(), total);

  it('shows empty-state guidance and no callout without sales', () => {
    render(<PeakSalesPeriodReport transactions={[]} />);
    expect(screen.getByText('No sales in this period. Widen the date range or check the channel filter.')).toBeInTheDocument();
    expect(screen.queryByText(/Busiest/)).toBeNull();
  });

  it('shows the callout, legend, own-range subtitle and group toggle state', () => {
    render(<PeakSalesPeriodReport transactions={[recent(2, 500), recent(3, 100)]} />);
    expect(screen.getByText(/Busiest day:/)).toBeInTheDocument();
    expect(screen.getByText(/Highlighted bar/i)).toBeInTheDocument();
    expect(screen.getByText(/own date range/i)).toBeInTheDocument();
    const group = screen.getByRole('group', { name: /group by/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'day' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'week' }));
    expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Busiest week/)).toBeInTheDocument();
  });
});

describe('peakTickInterval', () => {
  it('keeps every label for small counts and thins long ranges', () => {
    expect(peakTickInterval(12)).toBe(0);
    expect(peakTickInterval(30)).toBe(2);
    expect(peakTickInterval(5, 'week')).toBe(0);
    expect(peakTickInterval(9, 'week')).toBe(1);
  });
});

describe('peakSalesBuckets calendar structure (any zone)', () => {
  const r = { start: new Date(2026, 9, 25), end: new Date(2026, 10, 3, 23, 59, 59, 999) };
  const edge = [
    at(new Date(2026, 9, 25, 0, 0, 0, 0).toISOString(), 1, 'first'),
    at(new Date(2026, 10, 3, 23, 30).toISOString(), 2, 'late'),
    at(new Date(2026, 10, 3, 23, 59, 59, 999).toISOString(), 4, 'last')
  ];
  it.each(['day', 'week'])('%s starts are local midnights, calendar-aligned, and lose no sale', (by) => {
    const series = peakSalesBuckets(edge, r, by);
    const step = by === 'week' ? 7 : 1;
    series.forEach((s, i) => {
      expect([s.date.getHours(), s.date.getMinutes(), s.date.getSeconds()]).toEqual([0, 0, 0]);
      if (i > 0) {
        const prev = series[i - 1].date;
        expect(new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + step).getTime()).toBe(s.date.getTime());
      }
    });
    expect(series).toHaveLength(by === 'week' ? 2 : 10);
    expect(series.reduce((n, s) => n + s.invoices, 0)).toBe(3);
    expect(series.reduce((n, s) => n + s.revenue, 0)).toBe(7);
    expect(series[0].invoices).toBe(1);
    const lastDay = series[series.length - 1];
    expect(lastDay.invoices).toBe(by === 'week' ? 2 : 2);
  });
  it('puts a 23:30 sale on the last day in the last day bucket, not the one before', () => {
    const series = peakSalesBuckets(edge, r, 'day');
    expect(series[8].invoices).toBe(0);
    expect(series[9].invoices).toBe(2);
  });
});

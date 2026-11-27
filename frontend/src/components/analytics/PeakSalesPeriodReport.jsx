import React, { useState, useMemo } from 'react';
import DateRangePicker from './DateRangePicker';
import ChartRenderer from './ChartRenderer';
import { peakSalesBuckets, peakCalloutText } from '../../utils/salesAnalytics';
import { useSettings } from '../../context/SettingsContext';
import { toLocalDateKey, parseLocalDateKey, addLocalDays } from '../../utils/localDate';

export default function PeakSalesPeriodReport({ transactions }) {
  const { formatBaseCurrency, formatCompactBaseCurrency } = useSettings();
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const last30Key = addLocalDays(todayKey, -30);
  
  const [dateRange, setDateRange] = useState({
    start: last30Key,
    end: todayKey
  });
  const [bucketBy, setBucketBy] = useState('day'); // 'day', 'week', 'month'

  const series = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    
    const start = parseLocalDateKey(dateRange.start);
    const end = parseLocalDateKey(dateRange.end);
    end.setHours(23, 59, 59, 999);
    
    return peakSalesBuckets(transactions, { start, end }, bucketBy);
  }, [transactions, dateRange, bucketBy]);

  const callout = useMemo(
    () => peakCalloutText(series, bucketBy, formatBaseCurrency),
    [series, bucketBy, formatBaseCurrency]
  );
  const rangeLabel = (key) => parseLocalDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Busy Periods</h3>
          <p className="text-xs text-muted-foreground">
            This tab has its own date range.
            {dateRange.start && dateRange.end && <> Showing {rangeLabel(dateRange.start)} to {rangeLabel(dateRange.end)}.</>}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div role="group" aria-label="Group by" className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground" aria-hidden="true">Group by</span>
          <div className="flex items-center bg-secondary p-1 rounded-lg border border-border">
            {['day', 'week', 'month'].map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={bucketBy === b}
                onClick={() => setBucketBy(b)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  bucketBy === b
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          </div>

          <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
        </div>
      </div>

      {callout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{callout}</p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--chart-2))' }} />Highlighted bar = busiest period</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--chart-1))' }} />Other periods</span>
          </p>
        </div>
      )}

      <div className="w-full min-h-[320px] h-80 pt-2">
        {!series.some((s) => s.invoices > 0) ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No sales in this period. Widen the date range or check the channel filter.</div>
        ) : (
          <ChartRenderer type="peak" data={series} formatCurrency={formatBaseCurrency} extraProps={{ formatCompactCurrency: formatCompactBaseCurrency, bucketBy }} />
        )}
      </div>
    </div>
  );
}

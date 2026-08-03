import React, { useState, useMemo } from 'react';
import DateRangePicker from './DateRangePicker';
import ChartRenderer from './ChartRenderer';
import { peakSalesBuckets } from '../../utils/salesAnalytics';
import { useSettings } from '../../context/SettingsContext';

export default function PeakSalesPeriodReport({ transactions }) {
  const { formatBaseCurrency } = useSettings();
  const today = new Date();
  const last30 = new Date(today.getTime() - 30 * 864e5);
  
  const [dateRange, setDateRange] = useState({
    start: last30.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });
  const [bucketBy, setBucketBy] = useState('day'); // 'day', 'week', 'month'

  const series = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    
    return peakSalesBuckets(transactions, { start, end }, bucketBy);
  }, [transactions, dateRange, bucketBy]);

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Peak Sales Period</h3>
          <p className="text-xs text-muted-foreground">Highlighting the highest revenue period in the range.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center bg-secondary p-1 rounded-lg border border-border">
            {['day', 'week', 'month'].map((b) => (
              <button
                key={b}
                onClick={() => setBucketBy(b)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                  bucketBy === b 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
        </div>
      </div>

      <div className="w-full min-h-[320px] h-80 pt-2">
        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No sales data for selected period.</div>
        ) : (
          <ChartRenderer type="peak" data={series} formatCurrency={formatBaseCurrency} />
        )}
      </div>
    </div>
  );
}

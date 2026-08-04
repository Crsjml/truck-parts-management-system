import React, { useState, useMemo } from 'react';
import DateRangePicker from './DateRangePicker';
import { slowMovingParts } from '../../utils/salesAnalytics';

export default function SlowMovingStockReport({ transactions, parts }) {
  const today = new Date();
  const last30 = new Date(today.getTime() - 30 * 864e5);
  
  const [dateRange, setDateRange] = useState({
    start: last30.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });

  const slowMoving = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    
    // threshold = 0
    return slowMovingParts(parts, transactions, { start, end }, 0);
  }, [transactions, parts, dateRange]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Slow-Moving Stock</h3>
          <p className="text-xs text-muted-foreground">Parts with zero sales in period despite having stock.</p>
        </div>
        <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
      </div>

      <div className="overflow-x-auto">
        {slowMoving.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No slow-moving parts found for selected period.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                <th className="py-3 px-3">Part Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Units Sold (Period)</th>
                <th className="py-3 px-3 text-center">Last Sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slowMoving.map((item) => (
                <tr key={item.id} className="hover:bg-secondary transition-colors">
                  <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{item.sku || 'N/A'}</td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">{item.stock}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-brandRed-700 dark:text-brandRed-300 bg-brandRed-500/10 border border-brandRed-500/30 px-2 py-0.5 rounded">
                      {item.unitsSold}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-muted-foreground">
                    {item.daysSinceLastSale !== null ? `${item.daysSinceLastSale} days ago` : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

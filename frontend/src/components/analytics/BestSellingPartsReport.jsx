import React, { useState, useMemo } from 'react';
import DateRangePicker from './DateRangePicker';
import { rankPartsBySales } from '../../utils/salesAnalytics';
import { useSettings } from '../../context/SettingsContext';

export default function BestSellingPartsReport({ transactions, parts }) {
  const { formatBaseCurrency } = useSettings();
  const today = new Date();
  const last30 = new Date(today.getTime() - 30 * 864e5);
  
  const [dateRange, setDateRange] = useState({
    start: last30.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });

  const ranked = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);
    
    const rankedData = rankPartsBySales(transactions, { start, end });
    
    // Add SKU lookup
    const partMap = new Map(parts.map(p => [p.name, p.sku]));
    
    return rankedData.map(r => ({
      ...r,
      sku: partMap.get(r.name) || 'N/A'
    }));
  }, [transactions, parts, dateRange]);

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Best-Selling Parts</h3>
          <p className="text-xs text-muted-foreground">Ranked by units sold in selected period.</p>
        </div>
        <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
      </div>

      <div className="overflow-x-auto">
        {ranked.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No sales data for selected period.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                <th className="py-3 px-3 w-16 text-center">Rank</th>
                <th className="py-3 px-3">Part Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {ranked.map((item) => (
                <tr key={item.name} className="hover:bg-secondary transition-colors">
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-brandBlue-400 bg-brandBlue-950/40 border border-brandBlue-800/35 px-2 py-0.5 rounded">
                      #{item.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{item.sku}</td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">{formatBaseCurrency(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

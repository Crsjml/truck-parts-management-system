import React, { useState, useMemo, useEffect } from 'react';
import DateRangePicker from './DateRangePicker';
import { rankPartsBySales, getRankDeltaBadge } from '../../utils/salesAnalytics';
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
    
    const partMap = new Map(parts.map(p => [p.name, p]));
    
    return rankedData.map(r => ({
      ...r,
      sku: partMap.get(r.name)?.sku || 'N/A',
      stock: partMap.get(r.name)?.stock ?? 'N/A',
      category: partMap.get(r.name)?.category || partMap.get(r.name)?.categoryName || 'Uncategorized'
    }));
  }, [transactions, parts, dateRange]);

  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [dateRange]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
                <th className="py-3 px-3 text-center">Momentum</th>
                <th className="py-3 px-3">Part Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranked.slice((page - 1) * 10, page * 10).map((item) => {
                const { text, style } = getRankDeltaBadge(item.rankDelta);
                return (
                  <tr key={item.name} className="hover:bg-secondary transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-brandBlue-700 dark:text-brandBlue-300 bg-brandBlue-500/10 border border-brandBlue-500/30 px-2 py-0.5 rounded">
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${style}`}>
                        {text}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{item.sku}</td>
                    <td className="py-3 px-3 text-muted-foreground">{item.category}</td>
                    <td className="py-3 px-3 text-right font-semibold text-foreground">{item.stock}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">{formatBaseCurrency(item.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {ranked.length > 10 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, ranked.length)} of {ranked.length} parts
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(Math.ceil(ranked.length / 10), p + 1))} disabled={page === Math.ceil(ranked.length / 10)}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

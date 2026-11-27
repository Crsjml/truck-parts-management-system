import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DownloadSimple, CaretUp, CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import DateRangePicker from './DateRangePicker';
import { rankPartsBySales, getRankDeltaBadge } from '../../utils/salesAnalytics';
import { buildBestSellingPartsPdf } from '../../utils/bestSellingPartsPdf';
import { useSettings } from '../../context/SettingsContext';
import { toLocalDateKey, parseLocalDateKey, addLocalDays } from '../../utils/localDate';
import { usePdfExport } from '../../hooks/usePdfExport';

const PAGE_SIZE = 10;
const MS_PER_DAY = 864e5;

// Same rule as the app's low-stock alert (App.jsx): available stock <= part.minStock.
export function getStockStatus(part) {
  if (!part || typeof part.stock !== 'number') return null;
  const available = part.stock - (part.reservedStock || 0);
  if (available <= 0) return 'out';
  if (available <= (part.minStock ?? 0)) return 'low';
  return null;
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = sort.dir === 'asc' ? CaretUp : CaretDown;
  return (
    <th scope="col" className="py-3 px-3 text-right" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-semibold uppercase hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        {label}
        {active && <Icon weight="bold" aria-hidden="true" className="w-3 h-3" />}
      </button>
    </th>
  );
}

export default function BestSellingPartsReport({ transactions, parts, showToast }) {
  const { formatBaseCurrency } = useSettings();
  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const last30Key = addLocalDays(todayKey, -30);

  const [dateRange, setDateRange] = useState({ start: last30Key, end: todayKey });
  const [sort, setSort] = useState({ key: 'quantity', dir: 'desc' });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // The previous comparison window has the same length as the selected range.
  const baselineDays = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 0;
    const span = parseLocalDateKey(dateRange.end) - parseLocalDateKey(dateRange.start);
    return Math.round(span / MS_PER_DAY) + 1;
  }, [dateRange]);

  const ranked = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = parseLocalDateKey(dateRange.start);
    const end = parseLocalDateKey(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const rankedData = rankPartsBySales(transactions, { start, end });
    const byId = new Map(parts.filter(p => p.id != null).map(p => [p.id, p]));
    const byName = new Map(parts.map(p => [p.name, p]));

    return rankedData.map(r => {
      const part = (r.partId != null && byId.get(r.partId)) || byName.get(r.name);
      return {
        ...r,
        sku: part?.sku || 'N/A',
        oem: part?.oem || 'N/A',
        stock: part?.stock ?? 'N/A',
        available: typeof part?.stock === 'number' ? part.stock - (part.reservedStock || 0) : null,
        reserved: part?.reservedStock || 0,
        rawSku: part?.sku,
        rawCategory: part?.category || part?.categoryName,
        stockStatus: getStockStatus(part),
        category: part?.category || part?.categoryName || 'Uncategorized'
      };
    });
  }, [transactions, parts, dateRange]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? ranked.filter(r => [r.name ?? '', r.rawSku ?? '', r.rawCategory ?? ''].some(v => String(v).toLowerCase().includes(q)))
      : ranked;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => factor * ((a[sort.key] || 0) - (b[sort.key] || 0)) || a.rank - b.rank);
  }, [ranked, query, sort]);

  useEffect(() => setPage(1), [dateRange, sort, query]);

  const handleSort = (key) =>
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));

  const runExport = useCallback(() => buildBestSellingPartsPdf(ranked, { dateRange }), [ranked, dateRange]);
  const onExportSuccess = useCallback(() => showToast?.(`PDF exported (${ranked.length} parts).`, 'success'), [showToast, ranked.length]);
  const onExportError = useCallback((err) => showToast?.(`PDF export failed: ${err.message}`, 'error'), [showToast]);
  const { exportPdf, isExporting, error: exportError, reset: resetExportError } = usePdfExport(runExport, { onSuccess: onExportSuccess, onError: onExportError });

  useEffect(() => resetExportError(), [dateRange, resetExportError]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const noRows = ranked.length === 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Best-Selling Parts</h3>
          <p className="text-xs text-muted-foreground">Ranked by units sold in selected period.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
          <button
            type="button"
            onClick={() => exportPdf()}
            disabled={noRows || isExporting}
            aria-busy={isExporting}
            aria-describedby={noRows ? 'bsp-export-hint' : undefined}
            title={noRows ? 'No sales in this period, so there is nothing to export.' : 'Exports every ranked part, not just this page.'}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary hover:bg-muted text-foreground border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting…' : `Export PDF (all ${ranked.length} parts)`}
          </button>
          {noRows && <span id="bsp-export-hint" className="sr-only">No sales in this period, so there is nothing to export.</span>}
        </div>
      </div>

      {exportError && !showToast && (
        <p role="alert" className="text-xs font-semibold text-alarm-text">
          PDF export failed: {exportError.message}
        </p>
      )}

      {!noRows && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div role="search" className="relative w-full sm:w-72">
            <label htmlFor="bsp-search" className="sr-only">Search parts</label>
            <MagnifyingGlass aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              id="bsp-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU or category"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Rank change compares units sold vs previous {baselineDays} days.{' '}
            <span>NEW = not ranked in the previous period.</span>{' '}
            <span>— = unchanged.</span>
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {noRows
              ? 'No sales data for this period. Try to widen the date range or check the channel filter.'
              : 'No parts match your search. Clear it, widen the date range or check the channel filter.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">
              Best-selling parts ranked by units sold. Rank stays fixed when you re-sort. Rank change is vs the previous {baselineDays} days.
            </caption>
            <thead>
              <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                <th scope="col" title="Rank by units sold; stays fixed when re-sorting" className="py-3 px-3 w-16 text-center">Rank</th>
                <th scope="col" title={`Change in rank vs previous ${baselineDays} days`} className="py-3 px-3 text-center">Rank change</th>
                <th scope="col" className="py-3 px-3">Part Name</th>
                <th scope="col" className="py-3 px-3">SKU</th>
                <th scope="col" className="py-3 px-3">Category</th>
                <th scope="col" className="py-3 px-3 text-right">Stock</th>
                <SortHeader label="Units Sold" sortKey="quantity" sort={sort} onSort={handleSort} />
                <SortHeader label="Revenue" sortKey="revenue" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((item) => {
                const { text, style } = getRankDeltaBadge(item.rankDelta);
                return (
                  <tr key={item.partId ?? item.name} className="hover:bg-secondary transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-brandBlue-700 dark:text-brandBlue-300 bg-brandBlue-500/10 border border-brandBlue-500/30 px-2 py-0.5 rounded">
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 ${style}`}>
                        {text}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{item.sku}</td>
                    <td className="py-3 px-3 text-muted-foreground">{item.category}</td>
                    <td className="py-3 px-3 text-right font-semibold text-foreground">
                      <span className="inline-flex items-center justify-end gap-2">
                        {item.stockStatus === 'out' && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-alarm-text/40 bg-alarm-text/10 text-alarm-text">Out of stock</span>
                        )}
                        {item.stockStatus === 'low' && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground">Low stock</span>
                        )}
                        {item.available !== null ? item.available : item.stock}
                        {item.reserved > 0 && <span className="text-xs font-normal text-muted-foreground">({item.reserved} reserved)</span>}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">{formatBaseCurrency(item.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {visible.length > PAGE_SIZE && (
          <nav aria-label="Best-selling parts pagination" className="flex items-center justify-between border-t border-border pt-4">
            <p aria-live="polite" className="text-xs text-muted-foreground">
              Showing {((safePage - 1) * PAGE_SIZE) + 1} to {Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length} parts
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground">
                Previous
              </button>
              <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground">
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

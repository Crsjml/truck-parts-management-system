import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DownloadSimple, MagnifyingGlass, Warning, CaretUp, CaretDown } from '@phosphor-icons/react';
import DateRangePicker from './DateRangePicker';
import { slowMovingParts } from '../../utils/salesAnalytics';
import { buildSlowMovingStockPdf } from '../../utils/slowMovingStockPdf';
import { useSettings } from '../../context/SettingsContext';
import { toLocalDateKey, parseLocalDateKey, addLocalDays } from '../../utils/localDate';
import { usePdfExport } from '../../hooks/usePdfExport';
import { lastSaleText, lastSaleSeverity, oldSaleThreshold, stockValueOf, OLD_SALE_DAYS, EM_DASH } from '../../utils/slowMovingLabels';

const PAGE_SIZE = 10;
const DEFAULT_WINDOW_DAYS = 30;
const PRESETS = [
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 182, label: '6 months' }
];
const MS_PER_DAY = 864e5;
// Missing values (no cost) sort last; never-sold counts as the longest idle.
const SORT_VALUE = {
  stock: (r) => r.stock || 0,
  stockValue: (r) => (r.stockValue === null ? null : r.stockValue),
  lastSale: (r) => (r.daysSinceLastSale === null || r.daysSinceLastSale === undefined ? Infinity : r.daysSinceLastSale)
};
const LAST_SALE_TONE = {
  never: 'text-alarm-text font-bold',
  old: 'text-amber-800 dark:text-amber-300 font-bold',
  recent: 'text-muted-foreground'
};

const categoryOf = (part) => {
  const c = part.category;
  return (c && typeof c === 'object' ? c.name : c) || part.categoryName || 'Uncategorized';
};


function SortHeader({ label, title, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = sort.dir === 'asc' ? CaretUp : CaretDown;
  return (
    <th scope="col" title={title} className="py-3 px-3 text-right" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
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

function LastSaleCell({ days, threshold }) {
  const severity = lastSaleSeverity(days, threshold);
  return (
    <td data-severity={severity} className={`py-3 px-3 text-right tabular-nums ${LAST_SALE_TONE[severity]}`}>
      <span className="inline-flex flex-col items-end">
        <span className="inline-flex items-center gap-1">
          {severity !== 'recent' && <Warning weight="bold" aria-hidden="true" className="w-3.5 h-3.5" />}
          {lastSaleText(days)}
        </span>
        {severity === 'old' && <span className="text-[11px] font-semibold">Idle {threshold}+ days</span>}
      </span>
    </td>
  );
}

export default function SlowMovingStockReport({ transactions, parts, allTransactions, showToast }) {
  const { formatBaseCurrency, formatPdfBaseCurrency } = useSettings();
  const todayKey = toLocalDateKey(new Date());

  const [dateRange, setDateRange] = useState({ start: addLocalDays(todayKey, -DEFAULT_WINDOW_DAYS), end: todayKey });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });

  const activeDays = PRESETS.find(
    (p) => dateRange.end === todayKey && dateRange.start === addLocalDays(todayKey, -p.days)
  )?.days;

  const windowDays = useMemo(() => {
    const start = parseLocalDateKey(dateRange.start);
    const end = parseLocalDateKey(dateRange.end);
    return start && end ? Math.round((end - start) / MS_PER_DAY) : 0;
  }, [dateRange]);
  const idleThreshold = oldSaleThreshold(windowDays);

  const rows = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = parseLocalDateKey(dateRange.start);
    const end = parseLocalDateKey(dateRange.end);
    end.setHours(23, 59, 59, 999);
    return slowMovingParts(parts, transactions, { start, end }, 0, allTransactions ?? transactions)
      .map((p) => ({ ...p, categoryLabel: categoryOf(p), stockValue: stockValueOf(p) }));
  }, [transactions, allTransactions, parts, dateRange]);


  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => [r.name, r.sku, r.categoryLabel].some((v) => String(v ?? '').toLowerCase().includes(q)))
      : rows;
    if (!sort.key) return filtered;
    const valueOf = SORT_VALUE[sort.key];
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av === null || bv === null) return (av === null) - (bv === null); // missing last
      if (av === bv) return 0;
      return factor * (av < bv ? -1 : 1);
    });
  }, [rows, query, sort]);

  // The summary describes what the table shows, so it follows the search.
  const isSearching = query.trim() !== '';
  const summary = useMemo(() => ({
    count: visible.length,
    capital: visible.reduce((sum, r) => sum + (r.stockValue ?? 0), 0),
    missingCost: visible.filter((r) => r.stockValue === null).length
  }), [visible]);

  const handleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));

  useEffect(() => setPage(1), [dateRange, query, sort]);

  const runExport = useCallback(() => buildSlowMovingStockPdf(rows, { dateRange, formatCurrency: formatPdfBaseCurrency }), [rows, dateRange, formatPdfBaseCurrency]);
  const onExportSuccess = useCallback(() => showToast?.(`PDF exported (${rows.length} parts).`, 'success'), [showToast, rows.length]);
  const onExportError = useCallback((err) => showToast?.(`PDF export failed: ${err.message}`, 'error'), [showToast]);
  const { exportPdf, isExporting, error: exportError, reset: resetExportError } = usePdfExport(runExport, { onSuccess: onExportSuccess, onError: onExportError });

  useEffect(() => resetExportError(), [dateRange, resetExportError]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const noRows = rows.length === 0;
  const emptyHint = 'Every stocked part sold in this period, so there is nothing to export.';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Slow-Moving Stock</h3>
          <p className="text-xs text-muted-foreground">Parts in stock with no sales in this period.</p>
          <p className="text-xs text-muted-foreground">
            Last sale counts every sales channel. Stock idle {idleThreshold}+ days is flagged "Idle {idleThreshold}+ days" (twice the
            look-back window, minimum {OLD_SALE_DAYS}). "Never sold" means no sale on record.
          </p>
          <p aria-live="polite" className="text-xs text-foreground mt-1 tabular-nums">
            <span className="font-semibold">
              {isSearching ? `${summary.count} of ${rows.length} parts match` : `${summary.count} ${summary.count === 1 ? 'part' : 'parts'}`}
            </span>
            {' · '}
            <span className="font-semibold">{formatBaseCurrency(summary.capital)}</span> capital tied up
            {summary.missingCost > 0 && (
              <span className="text-muted-foreground"> ({summary.missingCost} without cost, not counted)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Look-back window" className="inline-flex rounded-lg border border-border overflow-hidden">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                aria-pressed={activeDays === p.days}
                onClick={() => setDateRange({ start: addLocalDays(todayKey, -p.days), end: todayKey })}
                className={`px-2.5 py-1.5 text-xs font-semibold border-r border-border last:border-r-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  activeDays === p.days ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <DateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />
          <button
            type="button"
            onClick={() => exportPdf()}
            disabled={noRows || isExporting}
            aria-busy={isExporting}
            aria-describedby={noRows ? 'sms-export-hint' : undefined}
            title={noRows ? emptyHint : 'Exports every slow-moving part, not just this page.'}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary hover:bg-muted text-foreground border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting…' : `Export PDF (all ${rows.length} parts)`}
          </button>
          {noRows && <span id="sms-export-hint" className="sr-only">{emptyHint}</span>}
        </div>
      </div>

      {exportError && !showToast && (
        <p role="alert" className="text-xs font-semibold text-alarm-text">
          PDF export failed: {exportError.message}
        </p>
      )}

      {!noRows && (
        <div role="search" className="relative w-full sm:w-72">
          <label htmlFor="sms-search" className="sr-only">Search parts</label>
          <MagnifyingGlass aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            id="sms-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU or category"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        {visible.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {noRows
              ? 'Every stocked part sold in this period. Try a longer window to find slower stock.'
              : 'No parts match your search. Clear it or widen the date range.'}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <caption className="sr-only">
              Parts in stock with no sales in the selected period, longest idle first unless you sort a column. Last sale counts every sales channel.
            </caption>
            <thead>
              <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                <th scope="col" className="py-3 px-3">Part Name</th>
                <th scope="col" className="py-3 px-3">SKU</th>
                <th scope="col" className="py-3 px-3">Category</th>
                <SortHeader label="Current Stock" sortKey="stock" sort={sort} onSort={handleSort} />
                <SortHeader label="Stock value" title="Current stock x unit cost" sortKey="stockValue" sort={sort} onSort={handleSort} />
                <SortHeader label="Last sale (any channel)" title="Most recent sale on any channel, regardless of the channel filter" sortKey="lastSale" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((item) => (
                <tr key={item.id} className="hover:bg-secondary transition-colors">
                  <td className="py-3 px-3 font-semibold text-foreground">{item.name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{item.sku || EM_DASH}</td>
                  <td className="py-3 px-3 text-muted-foreground">{item.categoryLabel}</td>
                  <td className="py-3 px-3 text-right font-semibold text-foreground tabular-nums">{item.stock}</td>
                  <td className="py-3 px-3 text-right font-semibold text-foreground tabular-nums">
                    {item.stockValue === null ? EM_DASH : formatBaseCurrency(item.stockValue)}
                  </td>
                  <LastSaleCell days={item.daysSinceLastSale} threshold={idleThreshold} />
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {visible.length > PAGE_SIZE && (
          <nav aria-label="Slow-moving stock pagination" className="flex items-center justify-between border-t border-border pt-4">
            <p aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
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

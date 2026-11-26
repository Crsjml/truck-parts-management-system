import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList,
} from 'recharts';
import {
  CheckCircle, Info, WarningCircle, Truck, EnvelopeSimple, DownloadSimple, Clock, CaretRight,
} from '@phosphor-icons/react';
import { REPORT_PERIODS, buildReportData, buildReportCsv } from './reportMetrics';

// Chart styling comes from the app's design tokens so charts follow the theme
// and keep AA contrast. Red is reserved for problem states.
const TICK = { fontSize: 12, fill: 'hsl(var(--foreground) / 0.78)' };
const GRID = 'hsl(var(--border))';
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px -2px rgb(15 23 42 / 0.12)',
};
const CURSOR = { fill: 'hsl(var(--muted))' };
const PRIMARY = 'hsl(var(--chart-1))';
const POSITIVE = 'hsl(var(--chart-2))';
const NEUTRAL = 'hsl(var(--chart-6))';

const STATUS_COLORS = {
  Draft: 'hsl(var(--chart-6) / 0.55)',
  'RFQ Sent': 'hsl(var(--chart-3))',
  Confirmed: 'hsl(var(--chart-1))',
  Received: 'hsl(var(--chart-2))',
  Cancelled: 'hsl(var(--chart-6))',
  'Problem Reported': 'hsl(var(--chart-danger))',
  'Returned to Supplier': 'hsl(var(--chart-4))',
};
const statusColor = (name) => STATUS_COLORS[name] || NEUTRAL;

const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactPeso = (v) => `₱${COMPACT.format(v)}`;

function Panel({ title, note, children, className = '' }) {
  return (
    <section className={`bg-background border border-border rounded-xl p-5 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => (
  <p className="text-sm text-muted-foreground py-10 text-center">{children}</p>
);

function AttentionRow({ icon: Icon, count, label, hint, onOpen, urgent = true }) {
  const active = count > 0;
  const tone = active && urgent ? 'text-alarm-text' : active ? 'text-foreground' : 'text-muted-foreground';
  const body = (
    <>
      <Icon weight="duotone" className={`w-5 h-5 shrink-0 ${tone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={`font-display text-xl font-bold tabular-nums ${tone}`}>{count}</span>
      {active && onOpen && <CaretRight weight="bold" className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  return (
    <li>
      {active && onOpen ? (
        <button type="button" onClick={onOpen} aria-label={`${label}: ${count}. View these orders`}
          className="flex w-full items-center gap-3 py-3 rounded-md hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {body}
        </button>
      ) : <div className="flex items-center gap-3 py-3">{body}</div>}
    </li>
  );
}

function ReportsSkeleton() {
  const block = 'rounded-xl border border-border bg-background animate-pulse';
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-secondary/20 space-y-6" aria-busy="true" role="status">
      <span className="sr-only">Loading purchasing reports…</span>
      <div className="h-14 w-72 rounded-lg bg-muted animate-pulse" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={`${block} h-48`} />
        <div className={`${block} h-48 xl:col-span-2`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${block} h-72`} /><div className={`${block} h-72`} />
      </div>
    </div>
  );
}

function Figure({ label, value, unit, note, help }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5 py-4 min-w-0">
      <dt className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        {label}
        {help && (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`What does "${label}" mean?`}
            className="-m-[15px] p-[15px] rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </dt>
      <dd className="mt-1.5 font-display text-2xl font-bold text-foreground tabular-nums tracking-tight [overflow-wrap:anywhere]">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </dd>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      {open && <p className="mt-2 rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">{help}</p>}
    </div>
  );
}

function PeriodControl({ value, onChange }) {
  return (
    <div role="group" aria-label="Report period" className="inline-flex rounded-lg border border-border bg-background p-0.5">
      {REPORT_PERIODS.map(p => {
        const selected = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={selected}
            aria-label={p.label}
            title={p.label}
            onClick={() => onChange(p.key)}
            className={`min-h-11 min-w-11 sm:min-h-8 sm:min-w-0 px-3.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}

function PipelineBar({ data, total }) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img"
        aria-label={`Order status mix: ${data.map(d => `${d.name} ${d.value}`).join(', ')}`}>
        {data.map(d => (
          <div key={d.name} style={{ width: `${(d.value / total) * 100}%`, backgroundColor: statusColor(d.name) }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border">
        {data.map(d => (
          <li key={d.name} className="flex items-center gap-3 py-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor(d.name) }} aria-hidden="true" />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="tabular-nums font-semibold text-foreground">{d.value}</span>
            <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAX_OVERSTOCK_CHIPS = 3;
const PERIOD_STORAGE_KEY = 'purchasing.reports.period';
const readStoredPeriod = () => {
  try {
    const saved = sessionStorage.getItem(PERIOD_STORAGE_KEY);
    return REPORT_PERIODS.some(p => p.key === saved) ? saved : 'ytd';
  } catch { return 'ytd'; }
};

function downloadCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PurchasingReports({ purchaseOrders, transactions, formatCurrency, onNotify, onDrillDown, isLoading = false }) {
  const [period, setPeriodState] = useState(readStoredPeriod);
  const setPeriod = (next) => {
    setPeriodState(next);
    try { sessionStorage.setItem(PERIOD_STORAGE_KEY, next); } catch { /* storage unavailable: period just won't persist */ }
  };
  const [exported, setExported] = useState(false);
  const periodLabel = REPORT_PERIODS.find(p => p.key === period).label;
  const data = useMemo(
    () => buildReportData({ purchaseOrders, transactions, period }),
    [purchaseOrders, transactions, period],
  );
  const { attention } = data;
  const needsAttention = attention.problems + attention.overdue + attention.awaitingReply > 0;
  const overstockRanked = data.purchaseVsSales.filter(p => p.overstock).sort((a, b) => (b.purchased - b.sold) - (a.purchased - a.sold));
  const overstocked = overstockRanked.slice(0, MAX_OVERSTOCK_CHIPS);
  const overstockHidden = overstockRanked.length - overstocked.length;
  const open = (kind) => (onDrillDown ? () => onDrillDown(kind) : undefined);

  if (isLoading) return <ReportsSkeleton />;
  const periodIsEmpty = data.pipelineTotal === 0;

  const handleExport = () => {
    try {
      downloadCsv(buildReportCsv(data, periodLabel), `purchasing-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (err) {
      onNotify?.(err?.message || 'Could not export the report. Try again.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-secondary/20 space-y-6">
      <header>
        <h2 id="purchasing-reports-title" tabIndex={-1} className="font-display text-2xl font-bold text-foreground focus:outline-none">Purchasing Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">What needs action now, then how purchasing performed in the period you pick.</p>
      </header>

      <section aria-labelledby="now-title" className="space-y-3">
        <div>
          <h3 id="now-title" className="text-base font-bold text-foreground">Right now</h3>
          <p className="text-xs text-muted-foreground">Current open orders. The period selector below does not change these.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-background border border-border rounded-xl p-5" aria-labelledby="attention-title" role="group">
            <h4 id="attention-title" className="text-sm font-bold text-foreground">Needs attention</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Open orders. Select a row to see them.</p>
            {needsAttention ? (
              <ul className="mt-2 divide-y divide-border">
                <AttentionRow icon={WarningCircle} count={attention.problems} label="Problem orders" hint="Defects reported, not yet resolved" onOpen={open('problems')} />
                <AttentionRow icon={Clock} count={attention.overdue} label="Late receipts"
                  hint={attention.overdue ? `Confirmed, past the promised date. Oldest is ${attention.oldestOverdueDays} day${attention.oldestOverdueDays === 1 ? '' : 's'} late` : 'Confirmed, past the promised date'}
                  onOpen={open('overdue')} />
                <AttentionRow icon={EnvelopeSimple} count={attention.awaitingReply} label="Awaiting supplier reply" hint="RFQs sent, no confirmation yet" urgent={false} onOpen={open('awaitingReply')} />
              </ul>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-foreground">
                <CheckCircle weight="fill" className="w-5 h-5 text-chart-positive" aria-hidden="true" />
                Nothing needs attention. {attention.drafts > 0 && `${attention.drafts} draft${attention.drafts > 1 ? 's' : ''} still unsent.`}
              </p>
            )}
          </div>
          <dl className="flex items-center bg-background border border-border rounded-xl [&>div]:w-full">
            <Figure label="Capital in transit" value={formatCurrency(data.capitalInTransit)}
              help="Sum of order totals for all Confirmed orders not yet received. Not affected by the period."
              note={`${data.confirmedCount} confirmed order${data.confirmedCount === 1 ? '' : 's'} awaiting delivery`} />
          </dl>
        </div>
      </section>

      <section aria-labelledby="period-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="period-title" className="text-base font-bold text-foreground">In this period: {periodLabel.toLowerCase()}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodControl value={period} onChange={setPeriod} />
            <button
              type="button"
              onClick={handleExport}
              disabled={periodIsEmpty}
              className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-8 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"
            >
              {exported ? <CheckCircle weight="fill" className="w-4 h-4 text-chart-positive" aria-hidden="true" /> : <DownloadSimple weight="bold" className="w-4 h-4" aria-hidden="true" />}
              {exported ? 'Exported' : 'Export CSV'}
            </button>
          </div>
        </div>
        {periodIsEmpty ? (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-sm font-semibold text-foreground">No purchase orders were created {periodLabel.toLowerCase()}.</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a wider period to see spend and delivery performance.</p>
            <div className="mt-4 flex justify-center gap-2">
              {REPORT_PERIODS.filter(p => (p.key === 'ytd' || p.key === 'all') && p.key !== period).map(p => (
                <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
                  className="min-h-11 sm:min-h-8 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Show {p.label.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-3 bg-background border border-border rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
          <Figure label="Spend" value={formatCurrency(data.totalSpend)}
            help="Sum of order totals for purchase orders created in this period and marked Received."
            note={`${data.receivedCount} received order${data.receivedCount === 1 ? '' : 's'}`} />
          <Figure label="Order-to-receipt time" value={data.avgLeadTimeDays ?? '—'} unit={data.avgLeadTimeDays == null ? '' : 'days'}
            help="Average days between creating a purchase order and its last update when marked Received."
            note="Average from creating a PO to receiving it" />
          <Figure label="On-time delivery" value={data.onTimeRate ?? '—'} unit={data.onTimeRate == null ? '' : '%'}
            help="Share of received orders whose receipt date was on or before the promised delivery date."
            note={data.onTimeSample ? `Of ${data.onTimeSample} received with a promised date` : 'No received orders with a promised date'} />
        </dl>
        )}
      </section>

      {!periodIsEmpty && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Spend by supplier" note="Received orders">
          {data.spendBySupplier.length ? (
            <div className="h-72" role="img" aria-label={`Spend by supplier: ${data.spendBySupplier.map(s => `${s.name} ${formatCurrency(s.total)}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer={false} data={data.spendBySupplier} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={TICK} width={130} axisLine={false} tickLine={false} />
                  <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE}
                    formatter={(v, _n, item) => [`${formatCurrency(v)} · ${item.payload.count} order${item.payload.count === 1 ? '' : 's'}`, 'Spend']} />
                  <Bar isAnimationActive={false} dataKey="total" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="total" position="right" formatter={compactPeso} fill="hsl(var(--foreground))" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No received orders in this period.</Empty>}
        </Panel>

        <Panel title="Order status" note={`${data.pipelineTotal} orders created in this period`}>
          {data.pipelineTotal ? <PipelineBar data={data.pipeline} total={data.pipelineTotal} /> : <Empty>No orders in this period.</Empty>}
        </Panel>

        <Panel title="Orders created per month">
          {data.timeline.length ? (
            <div className="h-64" role="img" aria-label={`Orders per month: ${data.timeline.map(t => `${t.month} ${t.count}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer={false} data={data.timeline} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, 'Orders']} />
                  <Bar isAnimationActive={false} dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} barSize={28}>
                    <LabelList dataKey="count" position="top" fill="hsl(var(--foreground))" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No purchase orders in this period.</Empty>}
        </Panel>

        <Panel title="Most restocked parts" note="Units received">
          {data.topParts.length ? (
            <div className="h-72" role="img" aria-label={`Most restocked parts: ${data.topParts.map(p => `${p.name} ${p.qty}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer={false} data={data.topParts} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={TICK} width={150} axisLine={false} tickLine={false} />
                  <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, 'Units received']} />
                  <Bar isAnimationActive={false} dataKey="qty" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="qty" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No received orders in this period.</Empty>}
        </Panel>

        <Panel className="lg:col-span-2" title="Bought vs sold" note="Your most-purchased parts. Parts that sold under half of what was bought are flagged below.">
          {data.purchaseVsSales.length ? (
            <>
              <div style={{ height: Math.max(160, data.purchaseVsSales.length * 76 + 56) }} role="img" aria-label={`Purchased versus sold: ${data.purchaseVsSales.map(p => `${p.name} bought ${p.purchased}, sold ${p.sold}`).join('; ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart accessibilityLayer={false} data={data.purchaseVsSales} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={TICK} width={170} axisLine={false} tickLine={false} />
                    <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" formatter={(v) => <span className="text-foreground">{v}</span>} />
                    <Bar isAnimationActive={false} dataKey="purchased" name="Bought" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={14}>
                      <LabelList dataKey="purchased" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                    <Bar isAnimationActive={false} dataKey="sold" name="Sold" fill={POSITIVE} radius={[0, 4, 4, 0]} barSize={14}>
                      <LabelList dataKey="sold" position="right" fill="hsl(var(--foreground))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {overstocked.length ? (
                <div className="mt-3">
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Truck weight="duotone" className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    Selling through slowly (under half of what was bought). Select a part to open it:
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {overstocked.map(p => (
                      <li key={p.name}>
                        <button type="button" onClick={onDrillDown ? () => onDrillDown('part', p.name) : undefined} disabled={!onDrillDown}
                          className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-8 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {p.name} <span className="tabular-nums text-muted-foreground">{p.purchased - p.sold} unsold</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {overstockHidden > 0 && <p className="mt-2 text-xs text-muted-foreground">and {overstockHidden} more in the chart above.</p>}
                </div>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle weight="fill" className="w-4 h-4 text-chart-positive" aria-hidden="true" />
                  Sales are keeping pace with purchases on these parts.
                </p>
              )}
            </>
          ) : <Empty>No received orders in this period. Receive a purchase order to compare it with sales.</Empty>}
        </Panel>
      </div>
      )}
    </div>
  );
}

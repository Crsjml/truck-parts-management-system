// Pure metrics for the Purchasing Reports window. No React, no I/O: everything is
// derived from the PO / parts / transaction arrays so it can be unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_N = 8;
const TIMELINE_MONTHS = 8;
const PVS_PARTS = 6;
// A part is overstock-risk only when it sold under this share of what was bought.
const OVERSTOCK_SELL_THROUGH = 0.5;

export const REPORT_PERIODS = [
  { key: 'month', label: 'This month', short: 'Month' },
  { key: 'quarter', label: 'This quarter', short: 'Quarter' },
  { key: 'ytd', label: 'Year to date', short: 'YTD' },
  { key: 'all', label: 'All time', short: 'All' },
];

export const periodStart = (period, now = new Date()) => {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === 'month') return new Date(y, m, 1);
  if (period === 'quarter') return new Date(y, Math.floor(m / 3) * 3, 1);
  if (period === 'ytd') return new Date(y, 0, 1);
  return null;
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
};

// Every month between the first and last key, so quiet months show as zero instead of vanishing.
const fillMonths = (sortedKeys) => {
  if (!sortedKeys.length) return [];
  const [y0, m0] = sortedKeys[0].split('-').map(Number);
  const [y1, m1] = sortedKeys[sortedKeys.length - 1].split('-').map(Number);
  const out = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y += 1, m = 1) : (m += 1)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return out;
};

const sumBy = (rows, pick) => rows.reduce((acc, row) => acc + (Number(pick(row)) || 0), 0);

const tallyQuantities = (items) => items.reduce((acc, item) => {
  acc[item.name] = (acc[item.name] || 0) + (Number(item.quantity) || 0);
  return acc;
}, {});

export function buildReportData({ purchaseOrders = [], transactions = [], period = 'ytd', now = new Date() }) {
  const start = periodStart(period, now);
  const inPeriod = (value) => !start || (value && new Date(value) >= start);

  const pos = purchaseOrders.filter(po => inPeriod(po.createdAt));
  const received = pos.filter(po => po.status === 'Received');

  const totalSpend = sumBy(received, po => po.totalAmount);

  // Snapshot figures: what is true right now, regardless of the selected period.
  const confirmed = purchaseOrders.filter(po => po.status === 'Confirmed');
  const capitalInTransit = sumBy(confirmed, po => po.totalAmount);
  const overdue = confirmed.filter(po => po.expectedDeliveryDate && new Date(po.expectedDeliveryDate) < now);
  const problemOrders = purchaseOrders.filter(po => po.status === 'Problem Reported');
  const awaitingReply = purchaseOrders.filter(po => po.status === 'RFQ Sent');
  const drafts = purchaseOrders.filter(po => po.status === 'Draft');

  const leadTimed = received.filter(po => po.createdAt && po.updatedAt);
  const avgLeadTimeDays = leadTimed.length
    ? Math.round(sumBy(leadTimed, po => Math.max(0, (new Date(po.updatedAt) - new Date(po.createdAt)) / DAY_MS)) / leadTimed.length)
    : null;

  const dated = received.filter(po => po.expectedDeliveryDate && po.updatedAt);
  const onTimeCount = dated.filter(po => new Date(po.updatedAt) <= new Date(po.expectedDeliveryDate)).length;
  const onTimeRate = dated.length ? Math.round((onTimeCount / dated.length) * 100) : null;

  const pipeline = Object.entries(pos.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const bySupplier = received.reduce((acc, po) => {
    const name = po.supplier?.name || 'Unknown';
    const row = acc[name] || { name, total: 0, count: 0 };
    row.total += Number(po.totalAmount) || 0;
    row.count += 1;
    acc[name] = row;
    return acc;
  }, {});
  const spendBySupplier = Object.values(bySupplier).sort((a, b) => b.total - a.total).slice(0, TOP_N);

  const purchasedQty = tallyQuantities(received.flatMap(po => po.items || []));
  const topParts = Object.entries(purchasedQty)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, TOP_N);

  const soldQty = tallyQuantities(
    transactions.filter(tx => inPeriod(tx.transactionDate)).flatMap(tx => tx.items || []),
  );
  const purchaseVsSales = Object.entries(purchasedQty)
    .map(([name, purchased]) => ({ name, purchased, sold: soldQty[name] || 0 }))
    .sort((a, b) => b.purchased - a.purchased)
    .slice(0, PVS_PARTS)
    .map(row => ({ ...row, overstock: row.sold < row.purchased * OVERSTOCK_SELL_THROUGH }));

  const byMonth = pos.reduce((acc, po) => {
    if (!po.createdAt) return acc;
    const key = monthKey(new Date(po.createdAt));
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const timeline = fillMonths(Object.keys(byMonth).sort()).slice(-TIMELINE_MONTHS)
    .map(key => ({ month: monthLabel(key), count: byMonth[key] || 0 }));

  return {
    totalSpend,
    receivedCount: received.length,
    capitalInTransit,
    confirmedCount: confirmed.length,
    avgLeadTimeDays,
    onTimeRate,
    onTimeSample: dated.length,
    attention: {
      problems: problemOrders.length,
      overdue: overdue.length,
      oldestOverdueDays: overdue.length
        ? Math.max(...overdue.map(po => Math.floor((now - new Date(po.expectedDeliveryDate)) / DAY_MS)))
        : 0,
      awaitingReply: awaitingReply.length,
      drafts: drafts.length,
    },
    pipeline,
    pipelineTotal: pos.length,
    spendBySupplier,
    topParts,
    purchaseVsSales,
    timeline,
  };
}

const csvCell = (value) => {
  const text = String(value ?? '');
  // Neutralise spreadsheet formula injection from supplier / part names.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function buildReportCsv(data, periodLabel) {
  const rows = [
    ['Purchasing report', periodLabel],
    [],
    ['Metric', 'Value'],
    ['Total spend (received)', data.totalSpend],
    ['Capital in transit', data.capitalInTransit],
    ['Average lead time (days)', data.avgLeadTimeDays ?? ''],
    ['On-time delivery (%)', data.onTimeRate ?? ''],
    ['Problem orders', data.attention.problems],
    ['Late receipts', data.attention.overdue],
    [],
    ['Supplier', 'Spend', 'Orders'],
    ...data.spendBySupplier.map(s => [s.name, s.total, s.count]),
    [],
    ['Part', 'Purchased', 'Sold'],
    ...data.purchaseVsSales.map(p => [p.name, p.purchased, p.sold]),
    [],
    ['Status', 'Orders'],
    ...data.pipeline.map(p => [p.name, p.value]),
    [],
    ['Awaiting supplier reply', data.attention.awaitingReply],
    [],
    ['Most restocked part', 'Units received'],
    ...data.topParts.map(p => [p.name, p.qty]),
    [],
    ['Month', 'Orders created'],
    ...data.timeline.map(t => [t.month, t.count]),
  ];
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

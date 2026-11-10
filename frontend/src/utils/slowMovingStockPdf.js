// frontend/src/utils/slowMovingStockPdf.js
// Report 06 — Slow-Moving Stock (docs/reports/06-slow-moving-stock.md), open
// style with a CONTROL BREAK on category: the category prints once per group,
// each group ends with a subtotal line, and the report footer carries the
// grand total. Renders the same `slowMovingParts()` rows shown on screen by
// SlowMovingStockReport.jsx so the PDF numbers always match the dashboard.
import {
  jsPDF, safe, masthead, paginate, openTable, totalCell, qty, formatDate, formatDateTime, INK, INK_2, MARGIN
} from './pdf/reportPdfKit';

const UNCATEGORIZED = 'Uncategorized';

// Parts may carry the category as a string, a related { name } object, or
// a flattened `categoryName` — accept all three.
function categoryName(item) {
  const c = item.category;
  if (c && typeof c === 'object') return c.name;
  return c || item.categoryName;
}

// Group rows by category (alphabetical), keeping the on-screen order inside each group.
export function groupByCategory(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = safe(categoryName(item), 18) || UNCATEGORIZED;
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, rows]) => ({ category, rows, stock: rows.reduce((s, r) => s + (r.stock || 0), 0) }));
}

function lastSale(days) {
  return days !== null && days !== undefined ? `${days} days ago` : 'Never';
}

function groupRows({ category, rows, stock }) {
  const detail = rows.map((item, i) => [
    i === 0 ? { content: category, bold: true } : '',
    safe(item.sku, 13) || 'N/A',
    safe(item.name, 32),
    safe(item.oem, 14) || 'N/A',
    qty(item.stock),
    qty(item.unitsSold),
    lastSale(item.daysSinceLastSale)
  ]);
  const subtotal = [
    { content: `${category} SUBTOTAL  (${rows.length} parts)`, colSpan: 4, styles: { halign: 'right', fontStyle: 'italic' } },
    totalCell(stock, 'single'),
    { content: '', colSpan: 2 }
  ];
  return [...detail, subtotal];
}

export function buildSlowMovingStockPdf(items, { dateRange }) {
  const doc = new jsPDF();
  const dateLine = `Period : ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;

  masthead(doc, { title: 'SLOW-MOVING STOCK REPORT', meta: [dateLine, `Generated : ${formatDateTime(new Date())}`] });

  doc.setFontSize(8);
  doc.setTextColor(INK_2);
  doc.text('Criteria: parts with stock on hand and 0 units sold during the period. Grouped by category.', MARGIN, 42);
  doc.setTextColor(INK);

  const groups = groupByCategory(items);
  const totalStock = groups.reduce((sum, g) => sum + g.stock, 0);

  openTable(doc, {
    startY: 46,
    columns: [
      { head: 'CATEGORY', width: 26 },
      { head: 'SKU', mono: true, width: 30 },
      { head: 'PART NAME' },
      { head: 'OEM/MPN', mono: true, width: 26 },
      { head: 'STOCK\nON HAND', align: 'right', mono: true, width: 19 },
      { head: 'UNITS\nSOLD', align: 'right', mono: true, width: 15 },
      { head: 'LAST\nSALE', align: 'right', width: 24 }
    ],
    body: groups.length ? groups.flatMap(groupRows) : [[{ content: 'No slow-moving parts for this period.', colSpan: 7 }]],
    foot: [[
      { content: `GRAND TOTAL  (${items.length} idle parts)`, colSpan: 4, styles: { halign: 'right' }, bold: true },
      totalCell(totalStock, 'double', true),
      { content: '', colSpan: 2 }
    ]]
  });

  paginate(doc, {
    title: 'SLOW-MOVING STOCK REPORT', dateLine, abbrev: ['OEM'],
    notes: 'Blank UNITS SOLD = none sold in the period.'
  });

  const filenameDate = new Date().toISOString().split('T')[0];
  doc.save(`Slow_Moving_Stock_Report_${filenameDate}.pdf`);
}

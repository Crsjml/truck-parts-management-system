// frontend/src/utils/bestSellingPartsPdf.js
// Report 05 — Best-Selling Parts (docs/reports/05-best-selling-parts.md), A4
// landscape, open style. Takes the SAME ranked+enriched rows
// BestSellingPartsReport.jsx renders on screen (rankPartsBySales + part
// lookup) so the PDF totals always match the dashboard.
import {
  jsPDF, safe, masthead, paginate, openTable, totalCell, qty, formatMoney, formatDate, formatDateTime
} from './pdf/reportPdfKit';

// The on-screen badge uses ▲/▼, which jsPDF's built-in Helvetica cannot
// encode (they print as mojibake), so the PDF spells movement in ASCII.
function momentumText(rankDelta) {
  if (rankDelta === null || rankDelta === undefined) return 'NEW';
  if (rankDelta > 0) return `+${rankDelta}`;
  if (rankDelta < 0) return `${rankDelta}`;
  return '-';
}

const COLUMNS = [
  { head: 'RANK', align: 'right', mono: true, width: 14 },
  { head: 'MOVE', align: 'center', width: 15 },
  { head: 'SKU', mono: true, width: 32 },
  { head: 'PART NAME' },
  { head: 'OEM/MPN', mono: true, width: 28 },
  { head: 'CATEGORY', width: 34 },
  { head: 'STOCK\nON HAND', align: 'right', mono: true, width: 20 },
  { head: 'UNITS\nSOLD', align: 'right', mono: true, width: 20 },
  { head: 'REVENUE', align: 'right', mono: true, width: 38 }
];

export function buildBestSellingPartsPdf(ranked, { dateRange }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const dateLine = `Period : ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`;

  masthead(doc, {
    title: 'BEST-SELLING PARTS REPORT',
    meta: [dateLine, `Generated : ${formatDateTime(new Date())}`]
  });

  const totalUnits = ranked.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalRevenue = ranked.reduce((sum, item) => sum + (item.revenue || 0), 0);

  openTable(doc, {
    startY: 40,
    columns: COLUMNS,
    body: ranked.map((item) => [
      item.rank,
      momentumText(item.rankDelta),
      safe(item.sku, 13) || 'N/A',
      safe(item.name, 40),
      safe(item.oem, 14) || 'N/A',
      safe(item.category, 18) || 'Uncategorized',
      qty(item.stock),
      qty(item.quantity),
      formatMoney(item.revenue)
    ]),
    foot: [[
      { content: 'GRAND TOTAL', colSpan: 7, styles: { halign: 'right' }, bold: true },
      totalCell(totalUnits.toLocaleString('en-US'), 'double', true),
      totalCell(formatMoney(totalRevenue), 'double', true)
    ]]
  });

  paginate(doc, {
    title: 'BEST-SELLING PARTS REPORT', dateLine, abbrev: ['OEM', 'MOVE'],
    notes: `Showing 1 to ${ranked.length} of ${ranked.length} parts, ranked by units sold.`
  });
  doc.save(`Best_Selling_Parts_${formatDate(dateRange.end).replace(/\//g, '-')}.pdf`);
}

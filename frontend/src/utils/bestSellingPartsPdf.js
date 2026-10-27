// frontend/src/utils/bestSellingPartsPdf.js
// Report 05 — Best-Selling Parts (docs/reports/05-best-selling-parts.md), A4
// landscape per spec. Takes the SAME ranked+enriched rows
// BestSellingPartsReport.jsx renders on screen (rankPartsBySales + part
// lookup) so the PDF totals always match the dashboard.
import {
  jsPDF, autoTable, BRAND, safe, masthead, paginate, headStyle,
  alternateRowStyles, footStyles, numCol, formatMoney, formatDate, formatDateTime
} from './pdf/reportPdfKit';
import { getRankDeltaBadge } from './salesAnalytics';

function momentumText(rankDelta) {
  return getRankDeltaBadge(rankDelta).text;
}

export function buildBestSellingPartsPdf(ranked, { dateRange }) {
  const doc = new jsPDF({ orientation: 'landscape' });

  masthead(doc, {
    title: 'BEST-SELLING PARTS REPORT',
    color: BRAND,
    meta: [
      `Period : ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
      `Generated : ${formatDateTime(new Date())}`
    ]
  });

  const totalUnits = ranked.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalRevenue = ranked.reduce((sum, item) => sum + (item.revenue || 0), 0);

  autoTable(doc, {
    startY: 40,
    head: [['RANK', 'MOV', 'PART NAME', 'SKU', 'OEM / MPN', 'CATEGORY', 'STOCK', 'UNITS', 'REVENUE']],
    body: ranked.map(item => [
      item.rank,
      momentumText(item.rankDelta),
      safe(item.name, 28),
      safe(item.sku, 12) || 'N/A',
      safe(item.oem, 12) || 'N/A',
      safe(item.category, 18) || 'Uncategorized',
      item.stock,
      item.quantity,
      formatMoney(item.revenue)
    ]),
    foot: [[
      { content: '', colSpan: 6 },
      { content: 'TOTAL', styles: { halign: 'right' } },
      totalUnits,
      formatMoney(totalRevenue)
    ]],
    theme: 'grid',
    headStyles: headStyle(BRAND),
    alternateRowStyles,
    footStyles,
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: numCol('center'),
      1: { halign: 'center' },
      3: numCol('left'),
      4: numCol('left'),
      6: numCol('right'),
      7: numCol('right'),
      8: numCol('right')
    },
    margin: { left: 14, right: 14 }
  });

  paginate(doc, { notes: `Showing 1 to ${ranked.length} of ${ranked.length} parts.` });

  doc.save(`Best_Selling_Parts_${formatDate(dateRange.end).replace(/\//g, '-')}.pdf`);
}

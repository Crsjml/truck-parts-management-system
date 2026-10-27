// frontend/src/utils/slowMovingStockPdf.js
// Report 06 — Slow-Moving Stock (docs/reports/06-slow-moving-stock.md).
// Renders the same `slowMovingParts()` rows shown on screen by
// SlowMovingStockReport.jsx so the PDF numbers always match the dashboard.
import {
  jsPDF, autoTable, BRAND, INK, safe, masthead, paginate, numCol, headStyle,
  alternateRowStyles, footStyles, formatDate, formatDateTime
} from './pdf/reportPdfKit';

export function buildSlowMovingStockPdf(items, { dateRange }) {
  const doc = new jsPDF();

  masthead(doc, {
    title: 'SLOW-MOVING STOCK REPORT',
    color: BRAND,
    meta: [
      `Period : ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
      `Generated : ${formatDateTime(new Date())}`
    ]
  });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text('Criteria: parts with stock on hand and 0 units sold during the period', 14, 42);

  const totalIdleStockUnits = items.reduce((sum, item) => sum + (item.stock || 0), 0);

  autoTable(doc, {
    startY: 47,
    head: [['PART NAME', 'SKU', 'OEM / MPN', 'CURRENT STOCK', 'UNITS SOLD', 'LAST SALE']],
    body: items.map((item) => [
      safe(item.name, 28),
      safe(item.sku, 12) || 'N/A',
      safe(item.oem, 12) || 'N/A',
      item.stock,
      item.unitsSold,
      item.daysSinceLastSale !== null ? `${item.daysSinceLastSale} days ago` : 'Never'
    ]),
    foot: [[
      { content: `TOTAL IDLE PARTS: ${items.length}`, colSpan: 3, styles: { halign: 'left' } },
      { content: `TOTAL IDLE STOCK UNITS: ${totalIdleStockUnits}`, colSpan: 3, styles: { halign: 'right' } }
    ]],
    theme: 'grid',
    headStyles: headStyle(BRAND),
    bodyStyles: { fontSize: 9, textColor: INK },
    alternateRowStyles,
    footStyles,
    columnStyles: {
      1: numCol('left'),
      2: numCol('left'),
      3: numCol('center'),
      4: numCol('center'),
      5: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  paginate(doc, { notes: `Showing ${items.length} of ${items.length} slow-moving parts.` });

  const filenameDate = new Date().toISOString().split('T')[0];
  doc.save(`Slow_Moving_Stock_Report_${filenameDate}.pdf`);
}

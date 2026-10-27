// frontend/src/utils/salesSummaryPdf.js
// Report 04 — Sales Summary (docs/reports/04-sales-summary.md).
// Recomputes through the SAME salesAnalytics.js helpers DailySalesSummary.jsx
// uses on screen (computeKpis, dayPaymentMix, orderStatusBreakdown) so the
// exported figures can never drift from what's displayed for the selected day.
import {
  jsPDF, autoTable, BRAND, INK, MUTED, safe, masthead, paginate, headStyle,
  alternateRowStyles, numCol, formatMoney, formatDate, formatDateTime
} from './pdf/reportPdfKit';
import { inRange, computeKpis, orderStatusBreakdown, dayPaymentMix } from './salesAnalytics';

function dayBounds(selectedDate) {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);
  const prevStart = new Date(start.getTime() - 864e5);
  const prevEnd = new Date(end.getTime() - 864e5);
  return { start, end, prevStart, prevEnd };
}

function sumUnits(transactions) {
  return transactions.reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);
}

function deltaText(delta) {
  if (delta === null || delta === undefined) return 'N/A';
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

export function buildSalesSummaryPdf(transactions, { selectedDate }) {
  const { start, end, prevStart, prevEnd } = dayBounds(selectedDate);
  const dayTx = inRange(transactions, start, end);
  const prevDayTx = inRange(transactions, prevStart, prevEnd);

  const kpis = computeKpis(dayTx, prevDayTx);
  const curUnits = sumUnits(dayTx);
  const prevUnits = sumUnits(prevDayTx);
  const unitsDelta = prevUnits === 0 ? null : ((curUnits - prevUnits) / prevUnits) * 100;

  const discounts = dayTx.reduce((sum, t) => sum + (t.discount || 0), 0);
  const vatableSales = dayTx.reduce((sum, t) => sum + (t.subtotal || 0), 0);
  const vatAmount = dayTx.reduce((sum, t) => sum + (t.taxAmount || 0), 0);
  const netSales = kpis.revenue - discounts;

  const paymentMix = dayPaymentMix(transactions, { start, end });
  const orderStatuses = orderStatusBreakdown(transactions, { start, end });

  const doc = new jsPDF();
  masthead(doc, {
    title: 'SALES SUMMARY',
    color: BRAND,
    meta: [`Date : ${formatDate(start)}`, `Generated : ${formatDateTime(new Date())}`]
  });

  // KPI tiles — Gross Sales, Transactions, Units Sold (Avg Ticket tile dropped
  // per the finalized layout; it duplicated the on-screen KPI strip).
  const tiles = [
    ['GROSS SALES', formatMoney(kpis.revenue), deltaText(kpis.deltas?.revenue)],
    ['TRANSACTIONS', String(kpis.invoices), deltaText(kpis.deltas?.invoices)],
    ['UNITS SOLD', String(curUnits), deltaText(unitsDelta)]
  ];
  const tw = 59.3, gap = 3;
  let tx = 14;
  tiles.forEach(([label, value, delta]) => {
    doc.setDrawColor(210);
    doc.setFillColor(247, 248, 250);
    doc.roundedRect(tx, 42, tw, 21, 2, 2, 'FD');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(label, tx + 3, 48);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(value, tx + 3, 55);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`${delta} vs prev`, tx + 3, 60.5);
    tx += tw + gap;
  });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(`Gross Sales: ${formatMoney(kpis.revenue)}      Discounts: -${formatMoney(discounts)}      Net Sales: ${formatMoney(netSales)}`, 14, 71);
  doc.text(`VATable (net of VAT): ${formatMoney(vatableSales)}      Output VAT (12%): ${formatMoney(vatAmount)}`, 14, 76);

  autoTable(doc, {
    startY: 81,
    head: [['PAYMENT METHOD', 'AMOUNT', 'SHARE']],
    body: paymentMix.length
      ? [
          ...paymentMix.map(m => [safe(m.label, 14), formatMoney(m.amount), `${m.percentage.toFixed(1)}%`]),
          [
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: formatMoney(kpis.revenue), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: '100.0%', styles: { fontStyle: 'bold' } }
          ]
        ]
      : [['No payment data', '', '']],
    theme: 'grid',
    headStyles: headStyle(BRAND),
    bodyStyles: { fontSize: 9, textColor: INK },
    alternateRowStyles,
    columnStyles: { 1: numCol('right'), 2: numCol('center') },
    margin: { left: 14, right: 110 }
  });

  autoTable(doc, {
    startY: 81,
    head: [['ORDER STATUS', 'COUNT']],
    body: orderStatuses.length ? orderStatuses.map(s => [safe(s.name, 18), s.count]) : [['No orders', '']],
    theme: 'grid',
    headStyles: headStyle(BRAND),
    bodyStyles: { fontSize: 9, textColor: INK },
    alternateRowStyles,
    columnStyles: { 1: numCol('center') },
    margin: { left: 110, right: 14 }
  });

  paginate(doc, { notes: 'Deltas compare against the previous day.' });

  doc.save(`Sales_Summary_${formatDate(start).replace(/\//g, '-')}.pdf`);
}

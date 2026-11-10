// frontend/src/utils/salesSummaryPdf.js
// Report 04 — Sales Summary (docs/reports/04-sales-summary.md), open style.
// Recomputes through the SAME salesAnalytics.js helpers DailySalesSummary.jsx
// uses on screen (computeKpis, dayPaymentMix, orderStatusBreakdown) so the
// exported figures can never drift from what's displayed for the selected day.
import {
  jsPDF, safe, masthead, paginate, sectionLabel, openTable, totalCell, qty,
  formatMoney, formatDate, formatDateTime, INK, INK_2, RULE, MARGIN
} from './pdf/reportPdfKit';
import { inRange, computeKpis, orderStatusBreakdown, dayPaymentMix } from './salesAnalytics';

const HALF_SPLIT = 110; // x where the right-hand table column starts

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
  if (delta === null || delta === undefined) return 'N/A vs prev';
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs prev`;
}

// KPI strip — open figures, no boxes, closed by one rule.
function kpiStrip(doc, kpis, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const colW = width / kpis.length;
  kpis.forEach(([name, value, delta], i) => {
    const x = MARGIN + i * colW;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(INK_2);
    doc.text(name, x, y);
    doc.setFont('Courier', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
    doc.text(String(value), x, y + 7);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(INK_2);
    doc.text(delta, x, y + 12);
  });
  doc.setDrawColor(RULE);
  doc.line(MARGIN, y + 16, MARGIN + width, y + 16);
  doc.setTextColor(INK);
  doc.setFontSize(9);
}

function summarize(transactions, selectedDate) {
  const { start, end, prevStart, prevEnd } = dayBounds(selectedDate);
  const dayTx = inRange(transactions, start, end);
  const prevDayTx = inRange(transactions, prevStart, prevEnd);
  const kpis = computeKpis(dayTx, prevDayTx);
  const curUnits = sumUnits(dayTx);
  const prevUnits = sumUnits(prevDayTx);
  const discounts = dayTx.reduce((sum, t) => sum + (t.discount || 0), 0);
  return {
    start,
    kpis,
    curUnits,
    unitsDelta: prevUnits === 0 ? null : ((curUnits - prevUnits) / prevUnits) * 100,
    discounts,
    netSales: kpis.revenue - discounts,
    vatableSales: dayTx.reduce((sum, t) => sum + (t.subtotal || 0), 0),
    vatAmount: dayTx.reduce((sum, t) => sum + (t.taxAmount || 0), 0),
    paymentMix: dayPaymentMix(transactions, { start, end }),
    orderStatuses: orderStatusBreakdown(transactions, { start, end })
  };
}

function financialTable(doc, s) {
  const lines = [
    ['Gross Sales', formatMoney(s.kpis.revenue)],
    ['Less: Discounts', `-${formatMoney(s.discounts)}`],
    [{ content: 'Net Sales', bold: true }, totalCell(formatMoney(s.netSales), 'single', true)],
    ['VATable (net of VAT)', formatMoney(s.vatableSales)],
    ['Output VAT (12%)', formatMoney(s.vatAmount)]
  ];
  sectionLabel(doc, 'Financial Breakdown', MARGIN, 70);
  return openTable(doc, {
    startY: 72, rowRules: false, margin: { right: HALF_SPLIT },
    columns: [{ head: 'ITEM' }, { head: 'AMOUNT', align: 'right', mono: true }],
    body: lines
  });
}

function mixTables(doc, s, startY) {
  sectionLabel(doc, 'Payment Mix', MARGIN, startY - 2);
  const payY = openTable(doc, {
    startY, margin: { right: HALF_SPLIT },
    columns: [{ head: 'PAYMENT\nMETHOD' }, { head: 'AMOUNT', align: 'right', mono: true }, { head: 'SHARE', align: 'right', mono: true, width: 18 }],
    body: s.paymentMix.length
      ? s.paymentMix.map((m) => [safe(m.label, 14), formatMoney(m.amount), `${m.percentage.toFixed(1)}%`])
      : [['No payment data', '', '']],
    foot: [[{ content: 'TOTAL', bold: true }, totalCell(formatMoney(s.kpis.revenue), 'double', true), totalCell('100.0%', 'double', true)]]
  });
  sectionLabel(doc, 'Order Status', HALF_SPLIT, startY - 2);
  const statusTotal = s.orderStatuses.reduce((sum, o) => sum + (o.count || 0), 0);
  openTable(doc, {
    startY, margin: { left: HALF_SPLIT },
    columns: [{ head: 'ORDER\nSTATUS' }, { head: 'COUNT', align: 'right', mono: true, width: 20 }],
    body: s.orderStatuses.length ? s.orderStatuses.map((o) => [safe(o.name, 18), qty(o.count)]) : [['No orders', '']],
    foot: [[{ content: 'TOTAL', bold: true }, totalCell(statusTotal, 'double', true)]]
  });
  return Math.max(payY, doc.lastAutoTable.finalY);
}

export function buildSalesSummaryPdf(transactions, { selectedDate }) {
  const s = summarize(transactions, selectedDate);
  const dateLine = `Date : ${formatDate(s.start)}`;
  const doc = new jsPDF();

  masthead(doc, { title: 'SALES SUMMARY', meta: [dateLine, `Generated : ${formatDateTime(new Date())}`] });
  kpiStrip(doc, [
    ['GROSS SALES', formatMoney(s.kpis.revenue), deltaText(s.kpis.deltas?.revenue)],
    ['TRANSACTIONS', s.kpis.invoices, deltaText(s.kpis.deltas?.invoices)],
    ['UNITS SOLD', s.curUnits, deltaText(s.unitsDelta)]
  ], 44);

  const finY = financialTable(doc, s);
  const endY = mixTables(doc, s, finY + 10);
  doc.setFont('Helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(INK_2);
  doc.text('Deltas compare against the previous day.', MARGIN, endY + 10);
  doc.setTextColor(INK);

  paginate(doc, { title: 'SALES SUMMARY', dateLine });
  doc.save(`Sales_Summary_${formatDate(s.start).replace(/\//g, '-')}.pdf`);
}

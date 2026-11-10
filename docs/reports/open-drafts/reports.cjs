// Open-style report builders. Each takes a dataset (layout masks or sample
// data from data.cjs) and renders one report using the shared open-table kit.
const fs = require('fs');
const path = require('path');
const kit = require('../generate-report-open-drafts.cjs');
const { jsPDF, openTable, reportHeader, finish, label, totalRow, qty, php, LEGEND, abbrevLine, MARGIN, OUT_ROOT } = kit;

const isNum = (v) => typeof v === 'number';
const money = (v) => (isNum(v) ? php(v) : v);
const furniture = (d, title, dateLine, notes, abbrev = []) => ({
  title, dateLine, notes, legend: [...(d.legend ? LEGEND : []), abbrevLine(abbrev)].filter(Boolean),
});

function salesInvoice(d) {
  const v = d.invoice;
  const doc = new jsPDF();
  reportHeader(doc, { title: 'SALES INVOICE', meta: [`Invoice No : ${v.no}`, `Date : ${v.date}`] });
  label(doc, 'Bill To', MARGIN, 44);
  doc.text(`Customer Name : ${v.customer}`, MARGIN, 50);
  doc.text(`Contact Phone : ${v.phone}`, MARGIN, 55);
  const finalY = openTable(doc, {
    startY: 61,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 }, { head: 'SKU', mono: true, width: 32 },
      { head: 'PART DESCRIPTION' }, { head: 'UNIT\nPRICE', align: 'right', mono: true, width: 30 },
      { head: 'QTY', align: 'right', mono: true, width: 13 }, { head: 'AMOUNT', align: 'right', mono: true, width: 32 },
    ],
    body: v.items.map(([n, sku, name, price, q, amt]) => [n, sku, name, price, qty(q), amt]),
    foot: [
      totalRow(5, 'Subtotal (VATable)', v.subtotal, 'single'),
      totalRow(5, 'Less: Discount', v.discount),
      totalRow(5, 'VAT (12%)', v.vat),
      totalRow(5, 'NET TOTAL', v.net, 'double', true),
    ],
  });
  label(doc, 'Payment', MARGIN, finalY + 10);
  v.payment.forEach((line, i) => doc.text(line, MARGIN, finalY + 16 + i * 5));
  finish(doc, furniture(d, 'SALES INVOICE', `Date : ${v.date}`, 'Thank you for your business! Exchange is only valid within 7 days with this sales invoice.', ['QTY']));
  return doc;
}

function purchaseOrder(d) {
  const v = d.po;
  const doc = new jsPDF();
  reportHeader(doc, { title: 'PURCHASE ORDER', meta: [`PO No : ${v.no}`, `Date : ${v.date}`, `Status : ${v.status}`] });
  label(doc, 'Supplier (Vendor)', MARGIN, 44);
  label(doc, 'Deliver To', 120, 44);
  v.supplier.forEach((line, i) => doc.text(line, MARGIN, 50 + i * 5));
  ['Tarlac Truck Parts', 'Tarlac City, Philippines', '', '', `Expected Delivery : ${v.expected}`, `Source RFQ : ${v.rfq}`]
    .forEach((line, i) => doc.text(line, 120, 50 + i * 5));
  const finalY = openTable(doc, {
    startY: 84,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 }, { head: 'SKU', mono: true, width: 28 },
      { head: 'OEM/MPN', mono: true, width: 23 }, { head: 'DESCRIPTION' },
      { head: 'QTY', align: 'right', mono: true, width: 12 }, { head: 'UNIT\nPRICE', align: 'right', mono: true, width: 31 },
      { head: 'AMOUNT', align: 'right', mono: true, width: 38 },
    ],
    body: v.items.map(([n, sku, oem, name, q, price, amt]) => [n, sku, oem, name, qty(q), price, amt]),
    foot: [totalRow(6, 'GRAND TOTAL', v.total, 'double', true)],
  });
  doc.text(`Notes : ${v.notes}`, MARGIN, finalY + 10);
  doc.text(`Prepared by : ${v.preparedBy}`, MARGIN, finalY + 22);
  doc.text('Authorized Signature : ____________________', 120, finalY + 22);
  finish(doc, furniture(d, 'PURCHASE ORDER', `Date : ${v.date}`, 'This purchase order is subject to our standard terms and conditions.', ['QTY', 'OEM']));
  return doc;
}

function rfq(d) {
  const v = d.rfq;
  const doc = new jsPDF();
  reportHeader(doc, { title: 'REQUEST FOR QUOTATION', meta: [`RFQ No : ${v.no}`, `Date : ${v.date}`] });
  label(doc, 'To (Supplier)', MARGIN, 44);
  doc.text(v.supplier, MARGIN, 50);
  doc.text(`Email : ${v.email}`, MARGIN, 55);
  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', MARGIN, 64);
  doc.setFont('Helvetica', 'normal');
  const blank = '______________';
  const finalY = openTable(doc, {
    startY: 69,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 }, { head: 'SKU', mono: true, width: 30 }, { head: 'DESCRIPTION' },
      { head: 'QTY', align: 'right', mono: true, width: 13 }, { head: 'YOUR UNIT\nPRICE', align: 'right', width: 34 },
      { head: 'AMOUNT', align: 'right', width: 34 },
    ],
    body: v.items.map(([n, sku, name, q]) => [n, sku, name, qty(q), blank, blank]).map((r) => r.map((c) => ({ content: c, styles: { minCellHeight: 9, valign: 'bottom' } }))),
    foot: [totalRow(5, 'QUOTED TOTAL', blank, undefined, true)],
  });
  doc.text(`Quotation Valid Until : ${v.validUntil}`, MARGIN, finalY + 12);
  doc.text(`Supplier Name / Signature : ${v.signer}`, MARGIN, finalY + 22);
  finish(doc, furniture(d, 'REQUEST FOR QUOTATION', `Date : ${v.date}`, 'Please reply to this RFQ at your earliest convenience. Prices should be in PHP.', ['QTY']));
  return doc;
}

function kpiStrip(doc, kpis, y) {
  const w = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const colW = w / kpis.length;
  kpis.forEach(([name, value, delta], i) => {
    const x = MARGIN + i * colW;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(70); doc.text(name, x, y);
    doc.setFont('Courier', 'bold'); doc.setFontSize(12); doc.setTextColor(0); doc.text(String(value), x, y + 7);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(70); doc.text(delta, x, y + 12);
  });
  doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(MARGIN, y + 16, MARGIN + w, y + 16);
  doc.setTextColor(0); doc.setFontSize(9);
}

function salesSummary(d) {
  const v = d.summary;
  const doc = new jsPDF();
  reportHeader(doc, { title: 'SALES SUMMARY', meta: v.meta });
  kpiStrip(doc, v.kpis, 44);
  label(doc, 'Financial Breakdown', MARGIN, 70);
  const finY = openTable(doc, {
    startY: 72, rowRules: false, margin: { right: 110 },
    columns: [{ head: 'ITEM' }, { head: 'AMOUNT', align: 'right', mono: true }],
    body: v.lines.map(([k, amt], i) => (i === 2 ? [{ content: k, bold: true }, { content: amt, rule: 'single', bold: true }] : [k, amt])),
  });
  const half = { columns: null, startY: finY + 10 };
  label(doc, 'Payment Mix', MARGIN, half.startY - 2);
  const payY = openTable(doc, {
    startY: half.startY, margin: { right: 110 },
    columns: [{ head: 'PAYMENT\nMETHOD' }, { head: 'AMOUNT', align: 'right', mono: true }, { head: 'SHARE', align: 'right', mono: true, width: 18 }],
    body: v.payments,
    foot: [[{ content: 'TOTAL', bold: true }, { content: v.paymentsTotal, rule: 'double', bold: true, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } }, { content: '100.0%', bold: true, rule: 'double', styles: { halign: 'right', font: 'courier', fontSize: 8.5 } }]],
  });
  label(doc, 'Order Status', 110, half.startY - 2);
  openTable(doc, {
    startY: half.startY, margin: { left: 110 },
    columns: [{ head: 'ORDER\nSTATUS' }, { head: 'COUNT', align: 'right', mono: true, width: 20 }],
    body: v.statuses.map(([s, n]) => [s, qty(n)]),
    foot: [[{ content: 'TOTAL', bold: true }, { content: v.statusTotal, rule: 'double', bold: true, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } }]],
  });
  doc.setFont('Helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(70);
  doc.text('Deltas compare against the previous period.', MARGIN, Math.max(payY, doc.lastAutoTable.finalY) + 10);
  finish(doc, furniture(d, 'SALES SUMMARY', v.meta[0], ''));
  return doc;
}

function bestSelling(d, rowCount = 3) {
  const v = d.best;
  const rows = v.rowsFor ? v.rowsFor(rowCount) : v.rows;
  const units = v.rowsFor ? rows.reduce((s, r) => s + r[7], 0).toLocaleString('en-US') : v.units;
  const revenue = v.rowsFor ? php(rows.reduce((s, r) => s + r[8], 0)) : v.revenue;
  const doc = new jsPDF({ orientation: 'landscape' });
  reportHeader(doc, { title: 'BEST-SELLING PARTS REPORT', meta: v.meta });
  openTable(doc, {
    startY: 40,
    columns: [
      { head: 'RANK', align: 'right', mono: true, width: 14 }, { head: 'MOVE', align: 'center', width: 15 },
      { head: 'SKU', mono: true, width: 32 }, { head: 'PART NAME' }, { head: 'OEM/MPN', mono: true, width: 28 },
      { head: 'CATEGORY', width: 34 }, { head: 'STOCK\nON HAND', align: 'right', mono: true, width: 20 },
      { head: 'UNITS\nSOLD', align: 'right', mono: true, width: 20 }, { head: 'REVENUE', align: 'right', mono: true, width: 38 },
    ],
    body: rows.map((r) => [...r.slice(0, 6), qty(r[6]), qty(r[7]), money(r[8])]),
    foot: [[
      { content: 'GRAND TOTAL', colSpan: 7, styles: { halign: 'right' }, bold: true },
      { content: units, rule: 'double', bold: true, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } },
      { content: revenue, rule: 'double', bold: true, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } },
    ]],
  });
  finish(doc, furniture(d, 'BEST-SELLING PARTS REPORT', v.meta[0], `Showing 1 to ${rows.length} of ${rows.length} parts, ranked by units sold.`, ['OEM', 'MOVE']));
  return doc;
}

// Control break on CATEGORY: category printed once per group, then a group
// footer with subtotals; report footer carries the grand totals.
function slowMovingBody(groups) {
  return groups.flatMap((g) => [
    ...g.rows.map(([sku, name, oem, stock, sold, last], i) => [i === 0 ? { content: g.category, bold: true } : '', sku, name, oem, qty(stock), qty(sold), last]),
    [
      { content: `${g.category} SUBTOTAL  (${g.parts} parts)`, colSpan: 4, styles: { halign: 'right', fontStyle: 'italic' } },
      { content: g.stock, rule: 'single', styles: { halign: 'right', font: 'courier', fontSize: 8.5 } },
      { content: '', colSpan: 2 },
    ],
  ]);
}

function slowMoving(d) {
  const v = d.slow;
  const doc = new jsPDF();
  reportHeader(doc, { title: 'SLOW-MOVING STOCK REPORT', meta: v.meta });
  doc.setFontSize(8); doc.setTextColor(70);
  doc.text('Criteria: parts with stock on hand and low/zero units sold during the period. Grouped by category.', MARGIN, 42);
  doc.setTextColor(0);
  openTable(doc, {
    startY: 46,
    columns: [
      { head: 'CATEGORY', width: 26 }, { head: 'SKU', mono: true, width: 30 }, { head: 'PART NAME' },
      { head: 'OEM/MPN', mono: true, width: 26 }, { head: 'STOCK\nON HAND', align: 'right', mono: true, width: 19 },
      { head: 'UNITS\nSOLD', align: 'right', mono: true, width: 15 }, { head: 'LAST\nSALE', align: 'right', width: 24 },
    ],
    body: slowMovingBody(v.groups),
    foot: [[
      { content: `GRAND TOTAL  (${v.parts} idle parts)`, colSpan: 4, styles: { halign: 'right' }, bold: true },
      { content: v.stock, rule: 'double', bold: true, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } },
      { content: '', colSpan: 2 },
    ]],
  });
  finish(doc, furniture(d, 'SLOW-MOVING STOCK REPORT', v.meta[0], 'Blank UNITS SOLD = none sold in the period.', ['OEM']));
  return doc;
}

function save(doc, dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(doc.output('arraybuffer')));
  console.log('  wrote', path.relative(OUT_ROOT, path.join(dir, name)));
}

const REPORTS = [
  ['01-sales-invoice.pdf', salesInvoice], ['02-purchase-order.pdf', purchaseOrder], ['03-rfq.pdf', rfq],
  ['04-sales-summary.pdf', salesSummary], ['05-best-selling-parts.pdf', bestSelling], ['06-slow-moving-stock.pdf', slowMoving],
];

function run() {
  const { layout, sample } = require('./data.cjs');
  console.log('Generating OPEN-STYLE DRAFTS ->', OUT_ROOT);
  for (const [mode, data] of [['layout', layout], ['sample', sample]]) {
    REPORTS.forEach(([name, build]) => save(build(data), path.join(OUT_ROOT, mode), name));
  }
  save(bestSelling(sample, 48), path.join(OUT_ROOT, 'sample'), '05b-best-selling-parts-multipage.pdf');
  console.log('Done.');
}

module.exports = { run };

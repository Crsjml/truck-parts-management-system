/*
 * Report LAYOUT PDF generator for the 6 reports.
 *
 * Renders the formal report layout: every VARIABLE cell shows its field mask
 * spelled out literally (XXXX for text/number positions, PHP X,XXX.XX for
 * money) so the exact character positions/widths are visible. Literal labels,
 * column headings and totals captions stay as text.
 * Output -> ./report-layout-pdfs/
 *
 *   X = one character position (text or digit)
 *   ____ = blank, to be filled        XX/XX/XXXX = date
 *
 * Run from the repo root:
 *   NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/generate-report-layout-pdfs.cjs
 */
const fs = require('fs');
const path = require('path');

const { jsPDF } = require('jspdf');
const autoTableMod = require('jspdf-autotable');
const autoTable = autoTableMod.default || autoTableMod;

const OUT_DIR = path.join(__dirname, 'report-layout-pdfs');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Company logo (rasterized from frontend/src/components/Logo.jsx via make-logo-png.cjs).
const LOGO_PATH = path.join(__dirname, 'assets', 'logo-mark-print.png');
const LOGO_B64 = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH).toString('base64') : null;

// Ink-efficient PRINT palette — mirrors frontend/src/utils/pdf/reportPdfKit.js.
// Single numbers are written as DeviceGray ("0 g"), so text and rules print with
// black toner only; no solid/dark fills, only pale pastel tints (~3-6% coverage).
const INK = 0;                     // primary text — pure single-channel black
const INK_2 = 70;                  // secondary text / labels — dark gray
const RULE = 150;                  // structural rules, table borders, tile outlines
const RULE_SOFT = 205;             // row separators
const TINT_HEAD = [238, 241, 246]; // pale slate-blue pastel — table headers
const TINT_TOT = [244, 246, 249];  // paler pastel — totals rows / NET TOTAL box
const BRAND = INK;                 // aliases kept so existing call sites need no change
const CUST = BRAND;
const INT = BRAND;
const DIVIDER = RULE;
const MUTED = INK_2;
const ZEBRA = false;               // no striped rows — hairlines separate them instead
const FOOT = TINT_TOT;
const GRID = { lineColor: RULE_SOFT, lineWidth: 0.1, textColor: INK };

// Mask helpers — spell the picture out literally.
const X = (n) => 'X'.repeat(n);          // character positions (text or digit)
const N = (n) => 'X'.repeat(n);          // value placeholder — user prefers X over 9
// Money with 2 decimals and comma grouping for `int` integer positions.
const money = (int) => {
  const g = 'X'.repeat(int).replace(/\B(?=(X{3})+(?!X))/g, ',');
  return 'PHP ' + g + '.XX';
};

// ID / code masks — follow the house numbering conventions.
//   SKU : CATEGORY-PART-#####      (e.g. BRK-PAD-00001)   ^[A-Z]{3}-[A-Z]{3}-\d{5}$
//   OEM : manufacturer's own number, preserved as-is      (e.g. 8980066870)
//   Doc : TYPE-YYYYMMDD-####       (e.g. INV-20260929-0001)
const SKU = X(3) + '-' + X(3) + '-' + N(5);              // XXX-XXX-XXXXX  (CATEGORY-PART-#####)
const OEM = X(10);                                       // alphanumeric, hyphens allowed
const docNo = (type) => type + '-' + N(8) + '-' + N(4);  // TYPE-XXXXXXXX-XXXX  (TYPE-YYYYMMDD-####)

function save(doc, filename) {
  fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(doc.output('arraybuffer')));
  console.log('  wrote', filename);
}

function masthead(doc, { title, meta = [] }) {
  const w = doc.internal.pageSize.getWidth();
  // White masthead: light-gray DeviceGray logo, black company block, one crisp rule.
  if (LOGO_B64) {
    doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', 14, 7, 18, 18);
  }
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(17);
  doc.text('TARLAC TRUCK PARTS', 36, 14);
  doc.setTextColor(INK_2);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 36, 20);
  doc.text('Contact: XXXX XXX XXXX   TIN: XXX-XXX-XXX-XXX', 36, 25);
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(13);
  doc.text(title, w - 14, 13, { align: 'right' });
  doc.setTextColor(INK_2);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(line, w - 14, 20 + i * 5, { align: 'right' }));
  doc.setDrawColor(INK); doc.setLineWidth(0.6); doc.line(14, 34, w - 14, 34); doc.setLineWidth(0.2);
  doc.setTextColor(INK);
}

function legendFooter(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200); doc.line(14, h - 20, w - 14, h - 20);
  doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(MUTED);
  doc.text('ID FORMATS — SKU: CATEGORY-PART-##### (BRK-PAD-00001)   ·   Docs: TYPE-YYYYMMDD-#### (INV-20260929-0001)   ·   OEM/MPN: manufacturer no., preserved', 14, h - 14);
  doc.text('FIELD MASKS (shown at max size) — X = one character position (text or digit)   ____ = to be filled', 14, h - 9);
  doc.text('Page X of X', w - 14, h - 9, { align: 'right' });
}

const headStyle = () => ({ fillColor: TINT_HEAD, textColor: INK, fontStyle: 'bold', fontSize: 9, lineColor: RULE, lineWidth: 0.2 });

// Letter-spaced slate section label — a distinct tier above body text.
function sectionLabel(doc, text, x, y, color = INT) {
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(color);
  doc.setCharSpace(0.8); doc.text(text.toUpperCase(), x, y); doc.setCharSpace(0);
  doc.setTextColor(INK);
}

// Monospaced (tabular-figure) column style so digits align down the decimal.
const numCol = (halign = 'right') => ({ halign, font: 'courier', fontSize: 8.5 });

// ── Report 1 — Sales Invoice ────────────────────────────────────────────────
function salesInvoice() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SALES INVOICE', color: CUST, meta: ['Invoice No : ' + docNo('INV'), 'Date : XX/XX/XXXX XX:XX'] });
  sectionLabel(doc, 'Bill To / Customer Info', 14, 45, CUST);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Customer Name : ' + X(16), 14, 51);
  doc.text('Contact Phone : XXXX XXX XXXX', 14, 56);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'SKU', 'PART DESCRIPTION', 'UNIT PRICE', 'QTY', 'AMOUNT']],
    body: Array.from({ length: 3 }, () => [N(2), SKU, X(28), money(7), N(3), money(7)]),
    theme: 'grid', styles: GRID, headStyles: { ...headStyle(CUST), halign: 'left' }, bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ZEBRA },
    // SKU + numeric columns use Courier (monospace) so codes/digits align.
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', font: 'courier' },
      1: { font: 'courier' },
      3: { halign: 'right', font: 'courier' },
      4: { halign: 'center', font: 'courier' },
      5: { halign: 'right', font: 'courier' },
    },
    margin: { left: 14, right: 14 },
  });

  let y = doc.lastAutoTable.finalY + 8; doc.setFontSize(9);
  const right = (l, v, yy) => {
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(MUTED); doc.text(l, 120, yy);
    doc.setFont('Courier', 'normal'); doc.setTextColor(INK); doc.text(v, 196, yy, { align: 'right' });
  };
  right('Subtotal (VATable):', money(7), y);
  right('Discount:', '-' + money(7), y + 5.5);
  right('VAT (12%):', money(7), y + 11);
  doc.setFillColor(...FOOT); doc.setDrawColor(INK); doc.setLineWidth(0.4); doc.rect(118, y + 15, 78, 8, 'FD'); doc.setLineWidth(0.2);
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold'); doc.text('NET TOTAL:', 121, y + 20.3);
  doc.setFont('Courier', 'bold'); doc.text(money(7), 193, y + 20.3, { align: 'right' });
  // Payment block sits BELOW the totals (totals end at y+23) to avoid the
  // long cash/cheque lines crossing into the right-hand totals column.
  sectionLabel(doc, 'Payment', 14, y + 33, CUST);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(INK);
  doc.text('Payment Method : ' + X(12), 14, y + 39);
  doc.text('[CASH] Tendered: ' + money(7) + '   Change: ' + money(7), 14, y + 45);
  doc.text('[CHEQUE] Cheque No: ' + X(20) + '    [GCASH] GCash Ref: ' + N(13), 14, y + 51);
  legendFooter(doc);
  save(doc, '01-sales-invoice.pdf');
}

// ── Report 2 — Purchase Order ───────────────────────────────────────────────
function purchaseOrder() {
  const doc = new jsPDF();
  masthead(doc, { title: 'PURCHASE ORDER', color: INT, meta: ['PO No : ' + docNo('PO'), 'Date : XX/XX/XXXX', 'Status : ' + X(12)] });
  sectionLabel(doc, 'Supplier (Vendor)', 14, 45, INT); sectionLabel(doc, 'Deliver To', 120, 45, INT);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  [[X(40), 51], ['Attn: ' + X(30), 56], [X(40) + '   (address)', 61], ['Tel: ' + X(20), 66], ['Email: ' + X(30), 71], ['Payment Terms: ' + X(12), 76]]
    .forEach(([t, yy]) => doc.text(t, 14, yy));
  [['Tarlac Truck Parts', 51], ['Tarlac City, Philippines', 56], ['Expected Delivery : XX/XX/XXXX', 66], ['Source RFQ : ' + docNo('RFQ'), 71]]
    .forEach(([t, yy]) => doc.text(t, 120, yy));

  autoTable(doc, {
    startY: 82,
    head: [['#', 'SKU', 'OEM / MPN', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: Array.from({ length: 3 }, () => [N(2), SKU, OEM, X(20), N(3), money(6), money(7)]),
    theme: 'grid', styles: GRID, headStyles: headStyle(INT), bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 10, ...numCol('center') }, 1: numCol('left'), 2: numCol('left'),
      4: numCol('center'), 5: numCol('right'), 6: numCol('right'),
    },
    margin: { left: 14, right: 14 },
  });
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setTextColor(INK);
  doc.setFont('Courier', 'bold'); const gv = money(8); const gvw = doc.getTextWidth(gv);
  doc.setFont('Helvetica', 'bold'); doc.text('GRAND TOTAL:', 196 - gvw - 3, y, { align: 'right' });
  doc.setFont('Courier', 'bold'); doc.text(gv, 196, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Notes: ' + X(60), 14, y + 10);
  doc.text('Prepared by: ' + X(20), 14, y + 20);
  doc.text('Authorized Signature: ____________________', 120, y + 20);
  legendFooter(doc);
  save(doc, '02-purchase-order.pdf');
}

// ── Report 3 — RFQ ──────────────────────────────────────────────────────────
function rfq() {
  const doc = new jsPDF();
  masthead(doc, { title: 'REQUEST FOR QUOTATION', color: INT, meta: ['RFQ No : ' + docNo('RFQ'), 'Date : XX/XX/XXXX'] });
  sectionLabel(doc, 'To (Supplier)', 14, 45, INT);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text(X(40), 14, 51); doc.text('Email: ' + X(30), 14, 56);
  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', 14, 64);
  doc.setFont('Helvetica', 'normal');
  autoTable(doc, {
    startY: 70,
    head: [['#', 'SKU / DESCRIPTION', 'QTY REQ', 'YOUR UNIT PRICE', 'TOTAL']],
    body: Array.from({ length: 3 }, () => [N(2), '[' + SKU + '] ' + X(24), N(3), '____________', '____________']),
    theme: 'grid', styles: GRID, headStyles: headStyle(INT), bodyStyles: { fontSize: 9, minCellHeight: 10 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 0: { cellWidth: 10, ...numCol('center') }, 2: numCol('center'), 3: { cellWidth: 45, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' } },
    margin: { left: 14, right: 14 },
  });
  let y = doc.lastAutoTable.finalY + 12; doc.setFontSize(9);
  doc.text('Quotation Valid Until : ____________________', 14, y);
  doc.text('Supplier Name / Signature : ____________________', 14, y + 10);
  legendFooter(doc);
  save(doc, '03-rfq.pdf');
}

// ── Report 4 — Sales Summary ────────────────────────────────────────────────
function salesSummary() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SALES SUMMARY', color: CUST, meta: ['Period : XX/XX/XXXX to XX/XX/XXXX', 'Compared vs : XX/XXXX', 'Generated : XX/XX/XXXX XX:XX'] });
  // KPI tiles with period-over-period delta mask (Avg Ticket tile removed).
  const tiles = [['GROSS SALES', money(8), 'XX.X%'], ['TRANSACTIONS', N(5), 'XX.X%'], ['UNITS SOLD', N(6), 'XX.X%']];
  const tw = 59.3, gap = 3; let tx = 14;
  tiles.forEach(([lab, val, delta]) => {
    doc.setDrawColor(RULE); doc.setLineWidth(0.3); doc.roundedRect(tx, 42, tw, 21, 2, 2, 'S'); doc.setLineWidth(0.2);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(MUTED); doc.text(lab, tx + 3, 48);
    doc.setFont('Courier', 'bold'); doc.setFontSize(10); doc.setTextColor(INK); doc.text(val, tx + 3, 55);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(MUTED); doc.text(delta + ' vs prev', tx + 3, 60.5);
    tx += tw + gap;
  });
  doc.setFont('Helvetica', 'normal');
  // Financial breakdown — Net Sales = Gross - Discounts; VATable = Net / 1.12.
  doc.setFontSize(8.5); doc.setTextColor(INK);
  doc.text('Gross Sales: ' + money(8) + '      Discounts: -' + money(6) + '      Net Sales: ' + money(8), 14, 71);
  doc.text('VATable (net of VAT): ' + money(8) + '      Output VAT (12%): ' + money(7), 14, 76);

  // Payment Mix — all five methods the POS supports.
  autoTable(doc, {
    startY: 81, head: [['PAYMENT METHOD', 'AMOUNT', 'SHARE']],
    body: [[X(10), money(7), 'XXX.X%'], [X(10), money(7), 'XXX.X%'], [X(10), money(7), 'XXX.X%'], [X(10), money(7), 'XXX.X%'], [X(10), money(7), 'XXX.X%'],
           [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: money(8), styles: { fontStyle: 'bold', halign: 'right' } }, { content: '100.0%', styles: { fontStyle: 'bold' } }]],
    theme: 'grid', styles: GRID, headStyles: headStyle(CUST), bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 1: numCol('right'), 2: numCol('center') }, margin: { left: 14, right: 110 },
  });
  const payEndY = doc.lastAutoTable.finalY; // payment table is the taller of the two
  autoTable(doc, {
    startY: 81, head: [['ORDER STATUS', 'COUNT']],
    body: [[X(18), N(3)], [X(18), N(3)], [X(18), N(3)], [X(18), N(3)]],
    theme: 'grid', styles: GRID, headStyles: headStyle(CUST), bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 1: numCol('center') }, margin: { left: 110, right: 14 },
  });
  const y = Math.max(payEndY, doc.lastAutoTable.finalY) + 10;
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'italic'); doc.setTextColor(MUTED);
  doc.text('Deltas compare against the previous period.', 14, y);
  legendFooter(doc);
  save(doc, '04-sales-summary.pdf');
}

// ── Report 5 — Best-Selling Parts (landscape) ───────────────────────────────
function bestSelling() {
  const doc = new jsPDF({ orientation: 'landscape' });
  masthead(doc, { title: 'BEST-SELLING PARTS REPORT', color: CUST, meta: ['Period : XX/XX/XXXX to XX/XX/XXXX', 'Generated : XX/XX/XXXX XX:XX'] });
  autoTable(doc, {
    startY: 40,
    head: [['RANK', 'MOV', 'PART NAME', 'SKU', 'OEM / MPN', 'CATEGORY', 'STOCK', 'UNITS', 'REVENUE']],
    body: Array.from({ length: 3 }, () => [N(3), X(4), X(22), SKU, OEM, X(12), N(3), N(3), money(7)]),
    foot: [[{ content: '', colSpan: 6 }, { content: 'TOTAL', styles: { halign: 'right' } }, N(5), money(8)]],
    theme: 'grid', styles: GRID, headStyles: headStyle(CUST), alternateRowStyles: { fillColor: ZEBRA },
    footStyles: { fillColor: FOOT, textColor: INK, fontStyle: 'bold' }, bodyStyles: { fontSize: 9 },
    columnStyles: { 0: numCol('center'), 1: { halign: 'center' }, 3: numCol('left'), 4: numCol('left'), 6: numCol('right'), 7: numCol('right'), 8: numCol('right') },
    margin: { left: 14, right: 14 },
  });
  legendFooter(doc);
  save(doc, '05-best-selling-parts.pdf');
}

// ── Report 6 — Slow-Moving Stock ────────────────────────────────────────────
function slowMoving() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SLOW-MOVING STOCK REPORT', color: INT, meta: ['Period : XX/XX/XXXX to XX/XX/XXXX', 'Generated : XX/XX/XXXX XX:XX'] });
  doc.setFontSize(8); doc.setTextColor(MUTED);
  doc.text('Criteria: parts with stock on hand and 0 units sold during the period', 14, 42);
  autoTable(doc, {
    startY: 47,
    head: [['PART NAME', 'SKU', 'OEM / MPN', 'CURRENT STOCK', 'UNITS SOLD', 'LAST SALE']],
    body: [[X(22), SKU, OEM, N(3), N(3), N(3) + ' days ago'], [X(22), SKU, OEM, N(3), '0', 'Never'], [X(22), SKU, OEM, N(3), N(3), N(3) + ' days ago']],
    foot: [[{ content: 'TOTAL IDLE PARTS: ' + N(3), colSpan: 3, styles: { halign: 'left' } },
            { content: N(5), styles: { halign: 'center' } },
            { content: 'IDLE STOCK UNITS', colSpan: 2, styles: { halign: 'right' } }]],
    theme: 'grid', styles: GRID, headStyles: headStyle(INT), alternateRowStyles: { fillColor: ZEBRA },
    footStyles: { fillColor: FOOT, textColor: INK, fontStyle: 'bold' }, bodyStyles: { fontSize: 9 },
    columnStyles: { 1: numCol('left'), 2: numCol('left'), 3: numCol('center'), 4: numCol('center'), 5: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });
  legendFooter(doc);
  save(doc, '06-slow-moving-stock.pdf');
}

console.log('Generating REPORT LAYOUT PDFs ->', OUT_DIR);
salesInvoice();
purchaseOrder();
rfq();
salesSummary();
bestSelling();
slowMoving();
console.log('Done.');

/*
 * Report SAMPLE (mockup-with-data) PDF generator for the 6 reports.
 *
 * Same layout/masthead/styling as generate-report-layout-pdfs.cjs, but every
 * VARIABLE cell is filled with realistic Tarlac Truck Parts sample data instead
 * of the field-mask picture clause. Use these to show stakeholders what a real,
 * populated report looks like. The mask version documents the FORMAT; this
 * version documents the CONTENT.
 *
 * Numbers are kept internally consistent (line amounts sum to subtotal, VAT =
 * 12% of the VATable base, tendered - total = change) so each page reads like a
 * genuine document. All data is ILLUSTRATIVE / fictitious.
 * Output -> ./report-sample-pdfs/
 *
 * Run from the repo root:
 *   NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/generate-report-sample-pdfs.cjs
 */
const fs = require('fs');
const path = require('path');

const { jsPDF } = require('jspdf');
const autoTableMod = require('jspdf-autotable');
const autoTable = autoTableMod.default || autoTableMod;

const OUT_DIR = path.join(__dirname, 'report-sample-pdfs');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Company logo (rasterized from frontend/src/components/Logo.jsx via make-logo-png.cjs).
const LOGO_PATH = path.join(__dirname, 'assets', 'logo-mark.png');
const LOGO_B64 = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH).toString('base64') : null;

// Muted, formal palette (no bright colors) — one scheme shared by all reports.
const BRAND = [30, 41, 59];    // slate-800 — every masthead, table header, section label
const CUST = BRAND;
const INT = BRAND;
const DIVIDER = [203, 213, 225];
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];
const ZEBRA = [247, 248, 250]; // alternate table-row stripe
const FOOT = [235, 238, 242];  // footer / totals-row fill
const POS = [21, 128, 61];     // muted emerald — positive period-over-period delta
const NEG = [185, 28, 28];     // muted red — negative delta

// Money formatter: PHP 1,234.56 (comma grouping, always 2 decimals).
const php = (n) => 'PHP ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function save(doc, filename) {
  fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(doc.output('arraybuffer')));
  console.log('  wrote', filename);
}

function masthead(doc, { title, meta = [], color = CUST }) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(0, 0, w, 32, 'F');
  doc.setFillColor(...DIVIDER);
  doc.rect(0, 32, w, 0.8, 'F');
  doc.setFillColor(255, 255, 255); doc.roundedRect(13, 5, 22, 22, 4, 4, 'F');
  if (LOGO_B64) {
    doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', 15, 7, 18, 18);
  } else {
    doc.setTextColor(120, 120, 120); doc.setFont('Helvetica', 'italic'); doc.setFontSize(7);
    doc.text('LOGO', 24, 16, { align: 'center' });
  }
  doc.setLineWidth(0.2);
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(17);
  doc.text('TARLAC TRUCK PARTS', 40, 14);
  doc.setTextColor(...DIVIDER);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 40, 20);
  doc.text('Contact: 0917 555 1234   TIN: 123-456-789-000', 40, 25);
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(13);
  doc.text(title, w - 14, 13, { align: 'right' });
  doc.setTextColor(...DIVIDER);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(line, w - 14, 20 + i * 5, { align: 'right' }));
  doc.setTextColor(...INK);
}

function sampleFooter(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200); doc.line(14, h - 20, w - 14, h - 20);
  doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.text('SAMPLE REPORT — illustrative data only; figures and names are fictitious and for layout review.', 14, h - 14);
  doc.text('ID formats — SKU: CATEGORY-PART-#####   ·   Docs: TYPE-YYYYMMDD-####', 14, h - 9);
  doc.text('Page 1 of 1', w - 14, h - 9, { align: 'right' });
}

const headStyle = (c) => ({ fillColor: c, textColor: 255, fontSize: 9 });

function sectionLabel(doc, text, x, y, color = INT) {
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...color);
  doc.setCharSpace(0.8); doc.text(text.toUpperCase(), x, y); doc.setCharSpace(0);
  doc.setTextColor(...INK);
}

const numCol = (halign = 'right') => ({ halign, font: 'courier', fontSize: 8.5 });

// ── Report 1 — Sales Invoice ────────────────────────────────────────────────
function salesInvoice() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SALES INVOICE', color: CUST, meta: ['Invoice No : INV-20260929-0001', 'Date : 09/29/2026 14:32'] });
  sectionLabel(doc, 'Bill To / Customer Info', 14, 45, CUST);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Customer Name : Dela Cruz Trucking Services', 14, 51);
  doc.text('Contact Phone : 0917 820 4455', 14, 56);

  // Line items — amount = unit x qty; amounts sum to the VAT-inclusive total.
  const items = [
    ['1', 'BRK-PAD-00001', 'Front Brake Pad Set (Isuzu ELF)', php(1850), '4', php(7400)],
    ['2', 'FLT-AIR-00012', 'Air Filter Element (Hino 500)', php(980), '6', php(5880)],
    ['3', 'OIL-SEL-00007', 'Rear Wheel Oil Seal (Fuso 6D16)', php(420), '8', php(3360)],
  ];
  autoTable(doc, {
    startY: 62,
    head: [['#', 'SKU', 'PART DESCRIPTION', 'UNIT PRICE', 'QTY', 'AMOUNT']],
    body: items,
    theme: 'grid', headStyles: { ...headStyle(CUST), halign: 'left' }, bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ZEBRA },
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
    doc.setFont('Helvetica', 'normal'); doc.setTextColor(...MUTED); doc.text(l, 120, yy);
    doc.setFont('Courier', 'normal'); doc.setTextColor(...INK); doc.text(v, 196, yy, { align: 'right' });
  };
  // Total 16,640.00 VAT-inclusive -> VATable = /1.12, VAT = total - VATable.
  right('Subtotal (VATable):', php(14857.14), y);
  right('Discount:', '-' + php(0), y + 5.5);
  right('VAT (12%):', php(1782.86), y + 11);
  doc.setFillColor(...CUST); doc.rect(118, y + 15, 78, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold'); doc.text('NET TOTAL:', 121, y + 20.3);
  doc.setFont('Courier', 'bold'); doc.text(php(16640), 193, y + 20.3, { align: 'right' });
  sectionLabel(doc, 'Payment', 14, y + 33, CUST);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  doc.text('Payment Method : Cash', 14, y + 39);
  doc.text('[CASH] Tendered: ' + php(20000) + '   Change: ' + php(3360), 14, y + 45);
  doc.text('Cashier: J. Mercado    Branch: Main Store (Tarlac City)', 14, y + 51);
  sampleFooter(doc);
  save(doc, '01-sales-invoice.pdf');
}

// ── Report 2 — Purchase Order ───────────────────────────────────────────────
function purchaseOrder() {
  const doc = new jsPDF();
  masthead(doc, { title: 'PURCHASE ORDER', color: INT, meta: ['PO No : PO-20260925-0003', 'Date : 09/25/2026', 'Status : Confirmed'] });
  sectionLabel(doc, 'Supplier (Vendor)', 14, 45, INT); sectionLabel(doc, 'Deliver To', 120, 45, INT);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  [['Prime Diesel Parts Trading', 51], ['Attn: Mr. Ramon Santos', 56], ['123 Rizal Ave, Caloocan City', 61],
   ['Tel: 02 8743 9900', 66], ['Email: sales@primediesel.ph', 71], ['Payment Terms: 30 Days', 76]]
    .forEach(([t, yy]) => doc.text(t, 14, yy));
  [['Tarlac Truck Parts', 51], ['Tarlac City, Philippines', 56], ['Expected Delivery : 10/02/2026', 66], ['Source RFQ : RFQ-20260920-0002', 71]]
    .forEach(([t, yy]) => doc.text(t, 120, yy));

  const items = [
    ['1', 'BRK-PAD-00001', '8980066870', 'Front Brake Pad Set', '20', php(1250), php(25000)],
    ['2', 'CLT-DSC-00004', 'ME521103', 'Clutch Disc 300mm', '10', php(2400), php(24000)],
    ['3', 'SPR-LEF-00009', '48210-1880', 'Leaf Spring, Rear', '6', php(3800), php(22800)],
  ];
  autoTable(doc, {
    startY: 82,
    head: [['#', 'SKU', 'OEM / MPN', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: items,
    theme: 'grid', headStyles: headStyle(INT), bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 10, ...numCol('center') }, 1: numCol('left'), 2: numCol('left'),
      4: numCol('center'), 5: numCol('right'), 6: numCol('right'),
    },
    margin: { left: 14, right: 14 },
  });
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setTextColor(...INK);
  const gv = php(71800); doc.setFont('Courier', 'bold'); const gvw = doc.getTextWidth(gv);
  doc.setFont('Helvetica', 'bold'); doc.text('GRAND TOTAL:', 196 - gvw - 3, y, { align: 'right' });
  doc.setFont('Courier', 'bold'); doc.text(gv, 196, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Notes: Deliver to main warehouse; include packing slip and OR for 30-day terms.', 14, y + 10);
  doc.text('Prepared by: J. Mercado', 14, y + 20);
  doc.text('Authorized Signature: ____________________', 120, y + 20);
  sampleFooter(doc);
  save(doc, '02-purchase-order.pdf');
}

// ── Report 3 — RFQ ──────────────────────────────────────────────────────────
function rfq() {
  const doc = new jsPDF();
  masthead(doc, { title: 'REQUEST FOR QUOTATION', color: INT, meta: ['RFQ No : RFQ-20260920-0002', 'Date : 09/20/2026'] });
  sectionLabel(doc, 'To (Supplier)', 14, 45, INT);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Prime Diesel Parts Trading', 14, 51); doc.text('Email: sales@primediesel.ph', 14, 56);
  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', 14, 64);
  doc.setFont('Helvetica', 'normal');
  // Returned quotation: supplier has filled in unit price and line total (= unit x qty).
  const items = [
    ['1', '[BRK-PAD-00001] Front Brake Pad Set', '20', php(1250), php(25000)],
    ['2', '[CLT-DSC-00004] Clutch Disc 300mm', '10', php(2400), php(24000)],
    ['3', '[SPR-LEF-00009] Leaf Spring, Rear', '6', php(3800), php(22800)],
  ];
  autoTable(doc, {
    startY: 70,
    head: [['#', 'SKU / DESCRIPTION', 'QTY REQ', 'YOUR UNIT PRICE', 'TOTAL']],
    body: items,
    foot: [[{ content: 'QUOTED TOTAL', colSpan: 4, styles: { halign: 'right' } }, { content: php(71800), styles: { halign: 'right' } }]],
    theme: 'grid', headStyles: headStyle(INT), bodyStyles: { fontSize: 9, minCellHeight: 10 },
    alternateRowStyles: { fillColor: ZEBRA },
    footStyles: { fillColor: FOOT, textColor: 30, fontStyle: 'bold', font: 'courier' },
    columnStyles: { 0: { cellWidth: 10, ...numCol('center') }, 2: numCol('center'), 3: { cellWidth: 45, ...numCol('right') }, 4: { cellWidth: 35, ...numCol('right') } },
    margin: { left: 14, right: 14 },
  });
  let y = doc.lastAutoTable.finalY + 12; doc.setFontSize(9);
  doc.text('Quotation Valid Until : 10/05/2026', 14, y);
  doc.text('Supplier Name / Signature : Ramon Santos — Prime Diesel Parts Trading', 14, y + 10);
  sampleFooter(doc);
  save(doc, '03-rfq.pdf');
}

// ── Report 4 — Sales Summary ────────────────────────────────────────────────
function salesSummary() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SALES SUMMARY', color: CUST, meta: ['Period : 09/01/2026 to 09/30/2026', 'Compared vs : 08/2026', 'Generated : 10/01/2026 09:15'] });

  // KPI tiles with period-over-period delta (mirrors DailySalesSummary's computeKpis).
  const tiles = [
    ['GROSS SALES', php(1284560), '+8.4%', true],
    ['TRANSACTIONS', '342', '+5.2%', true],
    ['UNITS SOLD', '1,987', '+6.1%', true],
  ];
  const tw = 59.3, gap = 3; let tx = 14;
  tiles.forEach(([lab, val, delta, up]) => {
    doc.setDrawColor(210); doc.setFillColor(247, 248, 250); doc.roundedRect(tx, 42, tw, 21, 2, 2, 'FD');
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...MUTED); doc.text(lab, tx + 3, 48);
    doc.setFont('Courier', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK); doc.text(val, tx + 3, 55);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...(up ? POS : NEG));
    doc.text(delta + ' vs prev', tx + 3, 60.5);
    tx += tw + gap;
  });
  doc.setFont('Helvetica', 'normal');

  // Financial breakdown — Net Sales = Gross - Discounts; VATable = Net / 1.12.
  doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text('Gross Sales: ' + php(1284560) + '      Discounts: -' + php(24500) + '      Net Sales: ' + php(1260060), 14, 71);
  doc.text('VATable (net of VAT): ' + php(1125053.57) + '      Output VAT (12%): ' + php(135006.43), 14, 76);

  // Payment Mix — all five methods the POS supports (CASH, GCASH, CARD, BANK_TRANSFER, CHEQUE).
  autoTable(doc, {
    startY: 81, head: [['PAYMENT METHOD', 'AMOUNT', 'SHARE']],
    body: [
      ['Cash', php(617000), '48.0%'],
      ['GCash', php(288000), '22.4%'],
      ['Card', php(180560), '14.1%'],
      ['Transfer', php(120000), '9.3%'],
      ['Cheque', php(79000), '6.2%'],
      [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: php(1284560), styles: { fontStyle: 'bold', halign: 'right' } }, { content: '100.0%', styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid', headStyles: headStyle(CUST), bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 1: numCol('right'), 2: numCol('center') }, margin: { left: 14, right: 110 },
  });
  const payEndY = doc.lastAutoTable.finalY; // payment table is the taller of the two
  // Order Status — real POS statuses (sum = 342 = Transactions).
  autoTable(doc, {
    startY: 81, head: [['ORDER STATUS', 'COUNT']],
    body: [['Completed', '318'], ['Ready for Pickup', '9'], ['Cancelled', '12'], ['Order Placed', '3']],
    theme: 'grid', headStyles: headStyle(CUST), bodyStyles: { fontSize: 9 }, alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 1: numCol('center') }, margin: { left: 110, right: 14 },
  });
  // Anchor captions below whichever side table is taller (side-by-side tables).
  const y = Math.max(payEndY, doc.lastAutoTable.finalY) + 10;
  doc.setFontSize(7.5); doc.setFont('Helvetica', 'italic'); doc.setTextColor(...MUTED);
  doc.text('Deltas compare against the previous period (08/2026).', 14, y);
  sampleFooter(doc);
  save(doc, '04-sales-summary.pdf');
}

// ── Report 5 — Best-Selling Parts (landscape) ───────────────────────────────
function bestSelling() {
  const doc = new jsPDF({ orientation: 'landscape' });
  masthead(doc, { title: 'BEST-SELLING PARTS REPORT', color: CUST, meta: ['Period : 09/01/2026 to 09/30/2026', 'Generated : 10/01/2026 09:15'] });
  // MOV = rank movement vs. previous period. ASCII only (built-in font has no arrow glyphs).
  const rows = [
    ['1', 'UP', 'Front Brake Pad Set', 'BRK-PAD-00001', '8980066870', 'Brake System', '48', '210', php(388500)],
    ['2', 'UP', 'Clutch Disc 300mm', 'CLT-DSC-00004', 'ME521103', 'Transmission', '26', '154', php(369600)],
    ['3', 'DOWN', 'Air Filter Element', 'FLT-AIR-00012', '17801-2340', 'Filters', '132', '186', php(182280)],
  ];
  autoTable(doc, {
    startY: 40,
    head: [['RANK', 'MOV', 'PART NAME', 'SKU', 'OEM / MPN', 'CATEGORY', 'STOCK', 'UNITS', 'REVENUE']],
    body: rows,
    foot: [[{ content: '', colSpan: 6 }, { content: 'TOTAL', styles: { halign: 'right' } }, '550', php(940380)]],
    theme: 'grid', headStyles: headStyle(CUST), alternateRowStyles: { fillColor: ZEBRA },
    footStyles: { fillColor: FOOT, textColor: 30, fontStyle: 'bold' }, bodyStyles: { fontSize: 9 },
    columnStyles: { 0: numCol('center'), 1: { halign: 'center' }, 3: numCol('left'), 4: numCol('left'), 6: numCol('right'), 7: numCol('right'), 8: numCol('right') },
    margin: { left: 14, right: 14 },
  });
  sampleFooter(doc);
  save(doc, '05-best-selling-parts.pdf');
}

// ── Report 6 — Slow-Moving Stock ────────────────────────────────────────────
function slowMoving() {
  const doc = new jsPDF();
  masthead(doc, { title: 'SLOW-MOVING STOCK REPORT', color: INT, meta: ['Period : 09/01/2026 to 09/30/2026', 'Generated : 10/01/2026 09:15'] });
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text('Criteria: parts with stock on hand and low/zero units sold during the period', 14, 42);
  autoTable(doc, {
    startY: 47,
    head: [['PART NAME', 'SKU', 'OEM / MPN', 'CURRENT STOCK', 'UNITS SOLD', 'LAST SALE']],
    body: [
      ['Radiator Cap Assembly', 'RAD-CAP-00021', '21430-90001', '35', '2', '142 days ago'],
      ['Headlamp Bezel, Chrome', 'LMP-BZL-00033', '8970894400', '18', '0', 'Never'],
      ['Mud Flap Rubber, Pair', 'ACC-MUD-00045', 'MF-220-STD', '60', '3', '98 days ago'],
    ],
    foot: [[{ content: 'TOTAL IDLE PARTS: 27', colSpan: 3, styles: { halign: 'left' } },
            { content: '113', styles: { halign: 'center' } },
            { content: 'IDLE STOCK UNITS', colSpan: 2, styles: { halign: 'right' } }]],
    theme: 'grid', headStyles: headStyle(INT), alternateRowStyles: { fillColor: ZEBRA },
    footStyles: { fillColor: FOOT, textColor: 30, fontStyle: 'bold' }, bodyStyles: { fontSize: 9 },
    columnStyles: { 1: numCol('left'), 2: numCol('left'), 3: numCol('center'), 4: numCol('center'), 5: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });
  sampleFooter(doc);
  save(doc, '06-slow-moving-stock.pdf');
}

console.log('Generating REPORT SAMPLE PDFs ->', OUT_DIR);
salesInvoice();
purchaseOrder();
rfq();
salesSummary();
bestSelling();
slowMoving();
console.log('Done.');

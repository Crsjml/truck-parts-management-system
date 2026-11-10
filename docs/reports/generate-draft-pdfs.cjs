/*
 * Draft PDF generator for the 6 report layouts.
 *
 * Renders one sample PDF per report into ./pdf-drafts/ using the project's own
 * jsPDF + jspdf-autotable libraries, so the drafts match how the real exports
 * will look. Sample data is synthetic and hardcoded — this is a layout preview
 * tool, NOT the production export path (that gets wired up later).
 *
 * Run from the repo root:
 *   NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/generate-draft-pdfs.cjs
 */
const fs = require('fs');
const path = require('path');

const { jsPDF } = require('jspdf');
const autoTableMod = require('jspdf-autotable');
const autoTable = autoTableMod.default || autoTableMod;

const OUT_DIR = path.join(__dirname, 'pdf-drafts');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Shared helpers ──────────────────────────────────────────────────────────
const BLUE = [37, 99, 235];   // customer-facing docs
const NAVY = [27, 54, 93];    // internal / supplier docs
const RED = [220, 38, 38];

const peso = (n) =>
  'PHP ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function save(doc, filename) {
  fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(doc.output('arraybuffer')));
  console.log('  wrote', filename);
}

// Constant masthead: colored band + company block (left) + title/meta (right).
function masthead(doc, { title, meta = [], color = BLUE, accent = false }) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(0, 0, w, 32, 'F');
  if (accent) { doc.setFillColor(...RED); doc.rect(0, 32, w, 2, 'F'); }

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TARLAC TRUCK PARTS', 14, 14);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 14, 20);
  doc.text('Contact: 0917-XXX-XXXX   TIN: XXX-XXX-XXX-XXX', 14, 25);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, w - 14, 13, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(line, w - 14, 20 + i * 5, { align: 'right' }));

  doc.setTextColor(30, 41, 59);
}

function footer(doc, note) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(14, h - 16, w - 14, h - 16);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (note) doc.text(note, 14, h - 10);
  doc.text('Generated ' + new Date().toLocaleString('en-US') + '  ·  Page 1 of 1', w - 14, h - 10, { align: 'right' });
}

// ── Report 1 — Sales Invoice ────────────────────────────────────────────────
function salesInvoice() {
  const doc = new jsPDF();
  masthead(doc, {
    title: 'SALES INVOICE', color: BLUE, accent: true,
    meta: ['Invoice No: INV-000123', 'Date: 10/02/2026 14:35'],
  });

  doc.setFont('Helvetica', 'bold'); doc.setFontSize(10);
  doc.text('BILL TO / CUSTOMER INFO', 14, 45);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Customer Name: Juan Dela Cruz', 14, 51);
  doc.text('Contact Phone: 0917-123-4567', 14, 56);

  const items = [
    ['Brake Pad Set - Isuzu ELF', 850, 2],
    ['Oil Filter FH-120', 220, 4],
  ];
  autoTable(doc, {
    startY: 62,
    head: [['#', 'PART DESCRIPTION', 'UNIT PRICE', 'QTY', 'AMOUNT']],
    body: items.map((it, i) => [i + 1, it[0], peso(it[1]), it[2], peso(it[1] * it[2])]),
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: 255, fontSize: 9, halign: 'left' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const subtotal = items.reduce((s, it) => s + it[1] * it[2], 0);
  const discount = 100, vat = (subtotal - discount) * 0.12, total = subtotal - discount + vat;
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  const right = (label, val, yy) => { doc.text(label, 130, yy); doc.text(val, 196, yy, { align: 'right' }); };
  right('Subtotal (VATable):', peso(subtotal), y);
  right('Discount:', '-' + peso(discount), y + 5.5);
  right('VAT (12%):', peso(vat), y + 11);
  doc.setFillColor(...BLUE); doc.rect(128, y + 15, 68, 8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('Helvetica', 'bold');
  doc.text('NET TOTAL:', 131, y + 20.3); doc.text(peso(total), 193, y + 20.3, { align: 'right' });

  doc.setTextColor(30, 41, 59); doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Payment: CASH    Tendered: ' + peso(3000) + '    Change: ' + peso(3000 - total), 14, y + 20);

  footer(doc, 'Return Policy: Exchange valid within 7 days with this sales invoice.');
  save(doc, '01-sales-invoice.pdf');
}

// ── Report 2 — Purchase Order ───────────────────────────────────────────────
function purchaseOrder() {
  const doc = new jsPDF();
  masthead(doc, {
    title: 'PURCHASE ORDER', color: NAVY,
    meta: ['PO No: PO-000045', 'Date: 10/02/2026', 'Status: CONFIRMED'],
  });

  doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
  doc.text('SUPPLIER (VENDOR)', 14, 45);
  doc.text('DELIVER TO', 120, 45);
  doc.setFont('Helvetica', 'normal');
  [['Diesel Parts Trading Corp.', 51], ['Attn: Mr. Reyes', 56],
   ['12 Industrial Ave, Manila', 61], ['Tel: 02-8xxx  Email: dpt@mail.com', 66],
   ['Payment Terms: Net 30', 71]].forEach(([t, yy]) => doc.text(t, 14, yy));
  [['Tarlac Truck Parts', 51], ['Tarlac City, Philippines', 56],
   ['Expected Delivery: 10/20/2026', 66], ['Source RFQ: RFQ-000045', 71]].forEach(([t, yy]) => doc.text(t, 120, yy));

  const items = [
    ['BP-ELF', 'Brake Pad Set - ELF', 20, 650],
    ['OF-120', 'Oil Filter FH-120', 50, 160],
  ];
  autoTable(doc, {
    startY: 78,
    head: [['#', 'SKU', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: items.map((it, i) => [i + 1, it[0], it[1], it[2], peso(it[3]), peso(it[2] * it[3])]),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 10 }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const total = items.reduce((s, it) => s + it[2] * it[3], 0);
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(11);
  doc.text('GRAND TOTAL: ' + peso(total), 196, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Notes: Restock for Q4 demand.', 14, y + 10);
  doc.text('Prepared by: Admin', 14, y + 20);
  doc.text('Authorized Signature: ____________________', 110, y + 20);

  footer(doc, 'Purchase Order — internal procurement document.');
  save(doc, '02-purchase-order.pdf');
}

// ── Report 3 — RFQ (blank prices) ───────────────────────────────────────────
function rfq() {
  const doc = new jsPDF();
  masthead(doc, {
    title: 'REQUEST FOR QUOTATION', color: NAVY,
    meta: ['RFQ No: RFQ-000045', 'Date: 10/02/2026'],
  });

  doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TO (SUPPLIER)', 14, 45);
  doc.setFont('Helvetica', 'normal');
  doc.text('Diesel Parts Trading Corp.', 14, 51);
  doc.text('Email: dpt@mail.com', 14, 56);
  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', 14, 64);
  doc.setFont('Helvetica', 'normal');

  const items = [
    ['[BP-ELF] Brake Pad Set - ELF', 20],
    ['[OF-120] Oil Filter FH-120', 50],
    ['', ''],
  ];
  autoTable(doc, {
    startY: 70,
    head: [['#', 'SKU / DESCRIPTION', 'QTY REQ', 'YOUR UNIT PRICE', 'TOTAL']],
    body: items.map((it, i) => [it[0] ? i + 1 : '', it[0], it[1], '', '']),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, minCellHeight: 10 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center' }, 3: { cellWidth: 45 }, 4: { cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });

  let y = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.text('Quotation Valid Until: ____________________', 14, y);
  doc.text('Supplier Name / Signature: ____________________', 14, y + 10);
  footer(doc, 'Please reply to this RFQ at your earliest convenience.');
  save(doc, '03-rfq.pdf');
}

// ── Report 4 — Sales Summary ────────────────────────────────────────────────
function salesSummary() {
  const doc = new jsPDF();
  masthead(doc, {
    title: 'SALES SUMMARY', color: BLUE, accent: true,
    meta: ['Period: 10/01/2026 - 10/02/2026', 'Generated: 10/02/2026 14:35'],
  });

  // KPI tiles
  const tiles = [['GROSS SALES', peso(128450)], ['TRANSACTIONS', '37'], ['UNITS SOLD', '214'], ['AVG TICKET', peso(3471.62)]];
  const tw = 44, gap = 3; let tx = 14;
  tiles.forEach(([lab, val]) => {
    doc.setDrawColor(210); doc.setFillColor(247, 249, 252); doc.roundedRect(tx, 42, tw, 18, 2, 2, 'FD');
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.text(lab, tx + 3, 48);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 41, 59); doc.text(val, tx + 3, 56);
    doc.setFont('Helvetica', 'normal');
    tx += tw + gap;
  });
  doc.setFontSize(9); doc.setTextColor(30, 41, 59);
  doc.text('Discounts: -' + peso(2100) + '    VATable: ' + peso(114687.5) + '    VAT (12%): ' + peso(13762.5), 14, 68);

  autoTable(doc, {
    startY: 74,
    head: [['PAYMENT METHOD', 'AMOUNT', 'SHARE']],
    body: [['Cash', peso(70000), '54.5%'], ['GCash', peso(38450), '29.9%'], ['Card', peso(20000), '15.6%'],
           [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: peso(128450), styles: { fontStyle: 'bold', halign: 'right' } }, { content: '100.0%', styles: { fontStyle: 'bold' } }]],
    theme: 'grid', headStyles: { fillColor: BLUE, textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } }, margin: { left: 14, right: 110 },
  });

  autoTable(doc, {
    startY: 74,
    head: [['ORDER STATUS', 'COUNT']],
    body: [['Completed', '29'], ['Ready for Pickup', '5'], ['Cancelled', '3']],
    theme: 'grid', headStyles: { fillColor: BLUE, textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' } }, margin: { left: 110, right: 14 },
  });

  const y = Math.max(doc.lastAutoTable.finalY) + 8;
  autoTable(doc, {
    startY: y,
    head: [['RANK', 'TOP 5 SELLING PARTS', 'UNITS', 'REVENUE']],
    body: [['1', 'Brake Pad Set - Isuzu ELF', '42', peso(35700)], ['2', 'Oil Filter FH-120', '38', peso(8360)]],
    theme: 'grid', headStyles: { fillColor: BLUE, textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { halign: 'center', cellWidth: 16 }, 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  footer(doc, 'Sales summary for the selected period.');
  save(doc, '04-sales-summary.pdf');
}

// ── Report 5 — Best-Selling Parts (landscape) ───────────────────────────────
function bestSelling() {
  const doc = new jsPDF({ orientation: 'landscape' });
  masthead(doc, {
    title: 'BEST-SELLING PARTS REPORT', color: BLUE, accent: true,
    meta: ['Period: 09/02/2026 - 10/02/2026', 'Generated: 10/02/2026 14:35'],
  });

  const rows = [
    ['#1', 'NEW', 'Brake Pad Set Isuzu ELF', 'BP-ELF', 'Brakes', 18, 42, 35700],
    ['#2', '^ 3', 'Oil Filter FH-120', 'OF-120', 'Filters', 60, 38, 8360],
    ['#3', 'v 1', 'Clutch Disc 350mm', 'CL-350', 'Clutch', 7, 25, 18750],
  ];
  const totUnits = rows.reduce((s, r) => s + r[6], 0);
  const totRev = rows.reduce((s, r) => s + r[7], 0);

  autoTable(doc, {
    startY: 40,
    head: [['RANK', 'MOV', 'PART NAME', 'SKU', 'CATEGORY', 'STOCK', 'UNITS', 'REVENUE']],
    body: rows.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], peso(r[7])]),
    foot: [[{ content: '', colSpan: 5 }, { content: 'TOTAL', styles: { halign: 'right' } }, String(totUnits), peso(totRev)]],
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: 255, fontSize: 9 },
    footStyles: { fillColor: [230, 236, 245], textColor: 30, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  footer(doc, 'Showing 1 to 3 of 24 parts.');
  save(doc, '05-best-selling-parts.pdf');
}

// ── Report 6 — Slow-Moving Stock ────────────────────────────────────────────
function slowMoving() {
  const doc = new jsPDF();
  masthead(doc, {
    title: 'SLOW-MOVING STOCK REPORT', color: NAVY,
    meta: ['Period: 09/02/2026 - 10/02/2026', 'Generated: 10/02/2026 14:35'],
  });
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text('Criteria: parts with stock on hand and 0 units sold during the period', 14, 42);

  const rows = [
    ['Radiator Cap 1.1bar', 'RC-11', 34, 0, '92 days ago'],
    ['Wiper Blade 22"', 'WB-22', 18, 0, 'Never'],
    ['Tail Lamp Assy - Fuso', 'TL-FU', 6, 0, '140 days ago'],
  ];
  const idleParts = rows.length;
  const idleUnits = rows.reduce((s, r) => s + r[2], 0);

  autoTable(doc, {
    startY: 47,
    head: [['PART NAME', 'SKU', 'CURRENT STOCK', 'UNITS SOLD', 'LAST SALE']],
    body: rows,
    foot: [[{ content: 'TOTAL IDLE PARTS: ' + idleParts, colSpan: 2, styles: { halign: 'left' } },
            { content: String(idleUnits), styles: { halign: 'center' } },
            { content: 'IDLE STOCK UNITS', colSpan: 2, styles: { halign: 'right' } }]],
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9 },
    footStyles: { fillColor: [230, 234, 240], textColor: 30, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  footer(doc, 'Showing 1 to 3 of 12 slow-moving parts.');
  save(doc, '06-slow-moving-stock.pdf');
}

console.log('Generating draft report PDFs ->', OUT_DIR);
salesInvoice();
purchaseOrder();
rfq();
salesSummary();
bestSelling();
slowMoving();
console.log('Done.');

/*
 * OPEN-STYLE DRAFT generator for the 6 reports (experimental — the legacy
 * grid-style generators/PDFs are left untouched for comparison).
 *
 * Applies the output-design rules from the Systems Design "Output & Data
 * Design" reference (DLSU, M. J. Arcilla):
 *   - report header (page 1) + PAGE HEADER repeated on every later page, with
 *     the date and page number always in the same place
 *   - short, stacked column headings, justified over the field they head
 *     (numbers right-justified, codes/text left-justified)
 *   - open tables: no grid, one rule under the headings, short single rule
 *     above totals and a double rule under the grand total
 *   - control break (group footer) with subtotals, group value not repeated
 *   - zero quantities not printed in table bodies (money totals always print)
 *   - identifying fields first, consistent abbreviations
 *   - data picture notation: A = alphabetic, 9 = digit, Z = digit with
 *     leading-zero suppression, X = alphanumeric
 *
 * Output -> ./report-open-drafts/layout/  (field masks)
 *           ./report-open-drafts/sample/  (illustrative data, incl. a
 *                                          multi-page Best-Selling sample)
 * Run from the repo root:
 *   NODE_PATH="$(pwd)/frontend/node_modules" node docs/reports/generate-report-open-drafts.cjs
 */
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableMod = require('jspdf-autotable');
const autoTable = autoTableMod.default || autoTableMod;

const OUT_ROOT = path.join(__dirname, 'report-open-drafts');
const LOGO_PATH = path.join(__dirname, 'assets', 'logo-mark.png');
const LOGO_B64 = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH).toString('base64') : null;

// Ink-efficient print palette (single numbers -> DeviceGray, black toner only).
const INK = 0;
const INK_2 = 70;
const RULE = 150;
const RULE_SOFT = 215;
const MARGIN = 14;
const RUNNING_HEADER_TOP = 30; // continuation pages start below the page header
const FOOTER_H = 24;           // footer band height (rule to page edge)

// ── Picture notation ────────────────────────────────────────────────────────
const A = (n) => 'A'.repeat(n);                          // alphabetic
const X = (n) => 'X'.repeat(n);                          // alphanumeric
const D9 = (n) => '9'.repeat(n);                         // digits, zeros kept
const Z = (n) => 'Z'.repeat(n - 1) + '9';                // digits, leading zeros suppressed
const group3 = (s) => s.replace(/\B(?=(.{3})+$)/g, ','); // comma grouping on a mask
const money = (int) => 'PHP ' + group3(Z(int)) + '.99';
const SKU = A(3) + '-' + A(3) + '-' + D9(5);             // CATEGORY-PART-#####
const OEM = X(10);
const DATE = '99/99/9999';
const docNo = (type) => `${type}-${D9(8)}-${D9(4)}`;     // TYPE-YYYYMMDD-####
const php = (n) => 'PHP ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Page furniture ──────────────────────────────────────────────────────────
function companyBlock(doc) {
  if (LOGO_B64) doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', MARGIN, 7, 18, 18);
  doc.setTextColor(INK); doc.setFont('Helvetica', 'bold'); doc.setFontSize(17);
  doc.text('TARLAC TRUCK PARTS', 36, 14);
  doc.setTextColor(INK_2); doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 36, 20);
  doc.text('Contact: 0917 555 1234   TIN: 123-456-789-000', 36, 25);
}

// Report header — page 1 only.
function reportHeader(doc, { title, meta }) {
  const w = doc.internal.pageSize.getWidth();
  companyBlock(doc);
  doc.setTextColor(INK); doc.setFont('Helvetica', 'bold'); doc.setFontSize(13);
  doc.text(title, w - MARGIN, 13, { align: 'right' });
  doc.setTextColor(INK_2); doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(line, w - MARGIN, 20 + i * 5, { align: 'right' }));
  doc.setDrawColor(INK); doc.setLineWidth(0.6); doc.line(MARGIN, 34, w - MARGIN, 34); doc.setLineWidth(0.2);
  doc.setTextColor(INK);
}

// Page header — pages 2+: same date + page number position every page.
function pageHeader(doc, { title, dateLine }, page, total) {
  const w = doc.internal.pageSize.getWidth();
  doc.setTextColor(INK); doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`TARLAC TRUCK PARTS  ·  ${title}`, MARGIN, 14);
  doc.setFont('Helvetica', 'normal'); doc.setTextColor(INK_2);
  doc.text(`${dateLine}      PAGE ${page} OF ${total}`, w - MARGIN, 14, { align: 'right' });
  doc.setDrawColor(INK); doc.setLineWidth(0.4); doc.line(MARGIN, 18, w - MARGIN, 18); doc.setLineWidth(0.2);
}

// Page footer: legend / abbreviations / notes on the left, page number fixed
// at the top-right of the footer band (same place on every page).
function pageFooter(doc, { notes, legend }, page, total) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(RULE); doc.line(MARGIN, h - FOOTER_H, w - MARGIN, h - FOOTER_H);
  doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(INK_2);
  [...(legend || []), notes].filter(Boolean)
    .forEach((line, i) => doc.text(line, MARGIN, h - FOOTER_H + 5 + i * 3.6, { maxWidth: w - MARGIN * 2 - 28 }));
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`PAGE ${page} OF ${total}`, w - MARGIN, h - FOOTER_H + 5, { align: 'right' });
  doc.setTextColor(INK);
}

// Draw page headers/footers last, once the page count is final.
function finish(doc, opts) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p > 1) pageHeader(doc, opts, p, total);
    pageFooter(doc, opts, p, total);
  }
}

// ── Open table ──────────────────────────────────────────────────────────────
// columns: [{ head, align: 'left'|'right'|'center', mono, width }]
// A body/foot cell may be { content, rule: 'single'|'double', bold }.
function hrule(doc, x1, x2, y, color, width) {
  doc.setDrawColor(color); doc.setLineWidth(width); doc.line(x1, y, x2, y);
}

function drawCellRules(doc, data, { rowRules }) {
  const { cell, section } = data;
  const x1 = cell.x; const x2 = cell.x + cell.width;
  if (section === 'head') hrule(doc, x1, x2, cell.y + cell.height, INK, 0.4);
  if (section === 'body' && rowRules && !cell.raw?.rule) hrule(doc, x1, x2, cell.y + cell.height, RULE_SOFT, 0.1);
  const rule = cell.raw?.rule;
  if (!rule || cell.text.join('') === '') return;
  hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + 0.4, INK, 0.3);              // single rule above a total
  if (rule === 'double') {
    hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + cell.height - 0.6, INK, 0.3); // double rule under grand total
    hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + cell.height + 0.4, INK, 0.3);
  }
}

function cellStyle(col) {
  return { halign: col.align || 'left', ...(col.mono ? { font: 'courier', fontSize: 8.5 } : {}), ...(col.width ? { cellWidth: col.width } : {}) };
}

function boldCells(rows) {
  return rows.map((row) => row.map((c) => (c && typeof c === 'object' && c.bold ? { ...c, styles: { ...(c.styles || {}), fontStyle: 'bold' } } : c)));
}

function openTable(doc, { columns, body, foot = [], startY, margin = {}, rowRules = true }) {
  autoTable(doc, {
    startY,
    theme: 'plain',
    head: [columns.map((c) => ({ content: c.head, styles: { halign: c.align || 'left' } }))],
    body: boldCells(body),
    foot: boldCells(foot),
    showFoot: 'lastPage',
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 } },
    headStyles: { fontStyle: 'bold', fontSize: 8, valign: 'bottom', textColor: INK },
    footStyles: { fontStyle: 'normal', textColor: INK },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, cellStyle(c)])),
    margin: { left: MARGIN, right: MARGIN, top: RUNNING_HEADER_TOP, bottom: FOOTER_H + 4, ...margin },
    didDrawCell: (data) => drawCellRules(doc, data, { rowRules }),
  });
  return doc.lastAutoTable.finalY;
}

// Zero suppression: quantities of 0 print blank (reference "0.0 not printed").
const qty = (n) => (typeof n === 'number' && n === 0 ? '' : n);

function label(doc, text, x, y) {
  doc.setFont('Helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(INK);
  doc.setCharSpace(0.8); doc.text(text.toUpperCase(), x, y); doc.setCharSpace(0);
  doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
}

// Label-left / amount-right totals that sit UNDER the money column.
const totalRow = (span, text, amount, rule, bold = false) => [
  { content: text, colSpan: span, styles: { halign: 'right' }, bold },
  { content: amount, rule, bold, styles: { halign: 'right', font: 'courier', fontSize: 8.5 } },
];

// Consistent abbreviations; each report footer lists only the ones it uses.
const ABBREV = { QTY: 'QTY = quantity', OEM: 'OEM/MPN = manufacturer part no.', MOVE: 'MOVE = rank change vs previous period' };
const abbrevLine = (keys) => (keys.length ? 'ABBREVIATIONS: ' + keys.map((k) => ABBREV[k]).join('   ·   ') : '');
const LEGEND = [
  'PICTURE: A = alphabetic   9 = digit   Z = digit, leading zero suppressed   X = alphanumeric   ____ = to be filled',
  'ID FORMATS: SKU = CATEGORY-PART-#####   ·   Docs = TYPE-YYYYMMDD-####',
];

module.exports = { A, X, D9, Z, money, SKU, OEM, DATE, docNo, php, qty, label, totalRow, openTable, reportHeader, finish, LEGEND, abbrevLine, MARGIN, jsPDF, OUT_ROOT };

if (require.main === module) require('./open-drafts/reports.cjs').run();

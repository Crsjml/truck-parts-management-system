// frontend/src/utils/pdf/reportPdfKit.js
//
// Shared layout kit for the 6 official report PDFs — the "open" style from
// docs/reports/generate-report-open-drafts.cjs, which follows the Systems
// Design "Output & Data Design" rules:
//  * report header on page 1, page header (title, date, page no.) on every
//    later page; page number always in the same place
//  * short stacked headings justified over their field (numbers right)
//  * open tables: no grid — one rule under the headings, single rule above
//    totals, double rule under grand totals
//  * zero quantities not printed; money totals always print
//
// PRINT PALETTE — ink-efficient: colors are single numbers, which jsPDF writes
// as DeviceGray ("0 g") so printers use black toner only. No background fills.
// Guarded by __tests__/reportPdfInk.test.js and reportPdfStructure.test.js.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_B64 } from './logoBase64';

export { jsPDF, autoTable };

export const INK = 0;          // primary text — pure single-channel black
export const INK_2 = 70;       // secondary text / labels — dark gray
export const RULE = 150;       // structural rules
export const RULE_SOFT = 215;  // row separators
export const MARGIN = 14;

const RUNNING_HEADER_TOP = 30; // continuation pages start below the page header
const FOOTER_H = 24;           // footer band height (rule to page edge)
const MONO = { font: 'courier', fontSize: 8.5 };

// Sanitize user-supplied strings before rendering into any PDF.
// Strips control characters and caps length to prevent abuse.
export function safe(value, maxLen = 200) {
  if (value == null) return '';
  // eslint-disable-next-line no-control-regex -- deliberately stripping control chars
  return String(value).replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen);
}

export function formatMoney(amount) {
  const n = Number(amount);
  const safeN = Number.isFinite(n) ? n : 0;
  return 'PHP ' + safeN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

export function formatDateTime(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Zero suppression — quantities of 0 print blank ("0.0 not printed").
export function qty(n) {
  return typeof n === 'number' && n === 0 ? '' : n;
}

// Letter-spaced section label — a distinct tier above body text.
export function sectionLabel(doc, text, x, y) {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.setCharSpace(0.8);
  doc.text(String(text).toUpperCase(), x, y);
  doc.setCharSpace(0);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
}

// ── Page furniture ──────────────────────────────────────────────────────────
function companyBlock(doc) {
  doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', MARGIN, 7, 18, 18);
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('TARLAC TRUCK PARTS', 36, 14);
  doc.setTextColor(INK_2);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 36, 20);
  doc.text('Contact: 0917-XXX-XXXX   TIN: XXX-XXX-XXX-XXX', 36, 25);
}

// Report header (page 1): logo + company block, right-aligned title/meta,
// closed by one black rule. No background band.
export function masthead(doc, { title, meta = [] }) {
  const w = doc.internal.pageSize.getWidth();
  companyBlock(doc);
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(safe(title, 60), w - MARGIN, 13, { align: 'right' });
  doc.setTextColor(INK_2);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(safe(line, 80), w - MARGIN, 20 + i * 5, { align: 'right' }));
  hrule(doc, MARGIN, w - MARGIN, 34, INK, 0.6);
  doc.setTextColor(INK);
}

// Page header (pages 2+): title left, date + page number right.
function pageHeader(doc, { title, dateLine }, page, total) {
  const w = doc.internal.pageSize.getWidth();
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TARLAC TRUCK PARTS  ·  ${safe(title, 60)}`, MARGIN, 14);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(INK_2);
  doc.text(`${safe(dateLine, 60)}      PAGE ${page} OF ${total}`, w - MARGIN, 14, { align: 'right' });
  hrule(doc, MARGIN, w - MARGIN, 18, INK, 0.4);
}

// Page footer: notes/abbreviations left, page number fixed top-right.
function pageFooter(doc, lines, page, total) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  hrule(doc, MARGIN, w - MARGIN, h - FOOTER_H, RULE, 0.2);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(INK_2);
  lines.forEach((line, i) => doc.text(safe(line, 200), MARGIN, h - FOOTER_H + 5 + i * 3.6, { maxWidth: w - MARGIN * 2 - 28 }));
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`PAGE ${page} OF ${total}`, w - MARGIN, h - FOOTER_H + 5, { align: 'right' });
  doc.setTextColor(INK);
}

// Consistent abbreviations; each report lists only the ones it uses.
const ABBREVIATIONS = {
  QTY: 'QTY = quantity',
  OEM: 'OEM/MPN = manufacturer part no.',
  MOVE: 'MOVE = rank change vs previous period'
};

// Draw page headers/footers on every page. Call LAST, once the page count is
// final. `title`/`dateLine` feed the page header on pages 2+.
export function paginate(doc, { notes, title = '', dateLine = '', abbrev = [] } = {}) {
  const abbrevLine = abbrev.length ? 'ABBREVIATIONS: ' + abbrev.map((k) => ABBREVIATIONS[k]).join('   ·   ') : '';
  const lines = [abbrevLine, notes].filter(Boolean);
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p > 1) pageHeader(doc, { title, dateLine }, p, total);
    pageFooter(doc, lines, p, total);
  }
}

// ── Open table ──────────────────────────────────────────────────────────────
function hrule(doc, x1, x2, y, color, width) {
  doc.setDrawColor(color);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
  doc.setLineWidth(0.2);
}

// Head: rule under every heading. Body: faint separator. A cell given as
// { content, rule: 'single' | 'double' } gets a short rule above it (and a
// double rule below for grand totals).
function drawCellRules(doc, { cell, section }, rowRules) {
  const x1 = cell.x;
  const x2 = cell.x + cell.width;
  const rule = cell.raw?.rule;
  if (section === 'head') hrule(doc, x1, x2, cell.y + cell.height, INK, 0.4);
  if (section === 'body' && rowRules && !rule) hrule(doc, x1, x2, cell.y + cell.height, RULE_SOFT, 0.1);
  if (!rule || cell.text.join('') === '') return;
  hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + 0.4, INK, 0.3);
  if (rule === 'double') {
    hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + cell.height - 0.6, INK, 0.3);
    hrule(doc, x1 + 1.5, x2 - 1.5, cell.y + cell.height + 0.4, INK, 0.3);
  }
}

function columnStyle(col) {
  return {
    halign: col.align || 'left',
    ...(col.mono ? MONO : {}),
    ...(col.width ? { cellWidth: col.width } : {})
  };
}

// `bold: true` on a cell object is shorthand for fontStyle bold.
function withBold(rows) {
  return rows.map((row) => row.map((c) => (
    c && typeof c === 'object' && c.bold ? { ...c, styles: { ...(c.styles || {}), fontStyle: 'bold' } } : c
  )));
}

// columns: [{ head, align: 'left'|'right'|'center', mono, width }]
// Heading alignment always matches its column (numbers right-justified).
export function openTable(doc, { columns, body, foot = [], startY, margin = {}, rowRules = true }) {
  autoTable(doc, {
    startY,
    theme: 'plain',
    head: [columns.map((c) => ({ content: c.head, styles: { halign: c.align || 'left' } }))],
    body: withBold(body),
    foot: withBold(foot),
    showFoot: 'lastPage',
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 } },
    headStyles: { fontStyle: 'bold', fontSize: 8, valign: 'bottom', textColor: INK },
    footStyles: { fontStyle: 'normal', textColor: INK },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, columnStyle(c)])),
    margin: { left: MARGIN, right: MARGIN, top: RUNNING_HEADER_TOP, bottom: FOOTER_H + 4, ...margin },
    didDrawCell: (data) => drawCellRules(doc, data, rowRules)
  });
  return doc.lastAutoTable.finalY;
}

// A monospaced, right-aligned total cell that sits under its money column.
export function totalCell(content, rule, bold = false) {
  return { content, rule, bold, styles: { halign: 'right', ...MONO } };
}

// Label (spanning `span` columns, right-aligned) + amount under the last column.
export function totalRow(span, label, amount, rule, bold = false) {
  return [
    { content: label, colSpan: span, styles: { halign: 'right' }, bold },
    totalCell(amount, rule, bold)
  ];
}

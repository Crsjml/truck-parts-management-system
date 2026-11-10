// frontend/src/utils/pdf/reportPdfKit.js
//
// Shared layout kit for the 6 official report PDFs. Mirrors the masthead /
// footer / print palette in docs/reports/generate-report-layout-pdfs.cjs so the
// live app's exports match the finalized reference layouts. No React/DOM
// imports here — safe to use from plain .js utils and .jsx components alike.
//
// PRINT PALETTE — ink-efficient by design:
//  * Text and rules are single numbers, which jsPDF writes as DeviceGray
//    ("0 g") — printers render that with black toner only, never the
//    cyan+magenta+yellow+black "rich black" an RGB triple turns into.
//  * No solid or dark fills anywhere: white page, hairline rules, and at most
//    a pale pastel tint (≈3–6% coverage) on table headers and totals.
//  * Guarded by src/utils/__tests__/reportPdfInk.test.js, which parses the
//    real PDF content stream of every export.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_B64 } from './logoBase64';

export { jsPDF, autoTable };

export const INK = 0;          // primary text — pure single-channel black
export const INK_2 = 70;       // secondary text / labels — dark gray, still crisp
export const RULE = 150;       // structural rules and table borders
export const RULE_SOFT = 205;  // row separators
export const TINT_HEAD = [238, 241, 246]; // pale slate-blue pastel — table headers
export const TINT_TOT = [244, 246, 249];  // paler pastel — totals rows / boxes

// Aliases kept so older call sites read naturally.
export const BRAND = INK;
export const MUTED = INK_2;
export const DIVIDER = RULE;

const MASTHEAD_RULE_Y = 34;

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

// Monospaced (tabular-figure) column style so digits align down the decimal.
export function numCol(halign = 'right') {
  return { halign, font: 'courier', fontSize: 8.5 };
}

// Table chrome — hairline grid, no cell backgrounds.
export const tableLines = {
  theme: 'grid',
  styles: { lineColor: RULE_SOFT, lineWidth: 0.1, textColor: INK, fillColor: false }
};

// Header row: pale pastel tint + bold black text. The `_color` argument is
// accepted (and ignored) for backward compatibility with headStyle(BRAND).
export function headStyle(_color) {
  return { fillColor: TINT_HEAD, textColor: INK, fontStyle: 'bold', fontSize: 9, lineColor: RULE, lineWidth: 0.2 };
}

export function bodyStyle() {
  return { fontSize: 9, textColor: INK, fillColor: false };
}

export const alternateRowStyles = { fillColor: false };
export const footStyles = { fillColor: TINT_TOT, textColor: INK, fontStyle: 'bold', lineColor: RULE, lineWidth: 0.2 };

// Letter-spaced section label — a distinct tier above body text.
export function sectionLabel(doc, text, x, y) {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(INK);
  doc.setCharSpace(0.8);
  doc.text(String(text).toUpperCase(), x, y);
  doc.setCharSpace(0);
}

// Outlined total box (replaces the old solid NET TOTAL bar): pastel fill,
// black hairline border, bold black label + monospaced value.
export function totalBox(doc, { x, y, w, h = 8, label, value }) {
  doc.setFillColor(...TINT_TOT);
  doc.setDrawColor(INK);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h, 'FD');
  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold');
  doc.text(label, x + 3, y + h - 2.5);
  doc.setFont('Courier', 'bold');
  doc.text(value, x + w - 3, y + h - 2.5, { align: 'right' });
  doc.setLineWidth(0.2);
}

function companyBlock(doc) {
  doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', 14, 7, 18, 18);
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

// Masthead — white page, full-color logo, black company name, right-aligned
// title/meta, closed by one crisp black rule. No background band.
export function masthead(doc, { title, meta = [] }) {
  const w = doc.internal.pageSize.getWidth();
  companyBlock(doc);

  doc.setTextColor(INK);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(safe(title, 60), w - 14, 13, { align: 'right' });
  doc.setTextColor(INK_2);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(safe(line, 80), w - 14, 20 + i * 5, { align: 'right' }));

  doc.setDrawColor(INK);
  doc.setLineWidth(0.6);
  doc.line(14, MASTHEAD_RULE_Y, w - 14, MASTHEAD_RULE_Y);
  doc.setLineWidth(0.2);
  doc.setTextColor(INK);
}

function drawFooter(doc, page, total, notes) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(RULE);
  doc.setLineWidth(0.2);
  doc.line(14, h - 16, w - 14, h - 16);
  doc.setTextColor(INK_2);
  if (notes) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text(safe(notes, 160), 14, h - 9);
  }
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Page ${page} of ${total}`, w - 14, h - 9, { align: 'right' });
  doc.setTextColor(INK);
}

// Apply the shared footer (rule + optional notes + "Page X of X") to every
// page of the document. Call this LAST, after all content is drawn, so the
// page count is final.
export function paginate(doc, { notes } = {}) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, notes);
  }
}

// frontend/src/utils/pdf/reportPdfKit.js
//
// Shared layout kit for the 6 official report PDFs. Ports the masthead/footer/
// color system agreed on in docs/reports/generate-report-layout-pdfs.cjs so the
// live app's exports match the finalized reference mockups. No React/DOM
// imports here — safe to use from plain .js utils and .jsx components alike.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_B64 } from './logoBase64';

export { jsPDF, autoTable };

// Muted, formal palette (no bright colors) — one scheme shared by all reports.
export const BRAND = [30, 41, 59]; // slate-800
export const DIVIDER = [203, 213, 225];
export const INK = [30, 41, 59];
export const MUTED = [100, 116, 139];
export const ZEBRA = [247, 248, 250]; // alternate table-row stripe
export const FOOT = [235, 238, 242]; // footer / totals-row fill

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

// Doc numbering convention: TYPE-YYYYMMDD-####
export function docNo(type, date = new Date(), seq = 1) {
  const d = new Date(date);
  const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  return `${type}-${stamp}-${String(seq).padStart(4, '0')}`;
}

const headStyleFor = (color) => ({ fillColor: color, textColor: 255, fontSize: 9 });

// Monospaced (tabular-figure) column style so digits align down the decimal.
export function numCol(halign = 'right') {
  return { halign, font: 'courier', fontSize: 8.5 };
}

export function headStyle(color = BRAND) {
  return headStyleFor(color);
}

// Letter-spaced slate section label — a distinct tier above body text.
export function sectionLabel(doc, text, x, y, color = BRAND) {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...color);
  doc.setCharSpace(0.8);
  doc.text(String(text).toUpperCase(), x, y);
  doc.setCharSpace(0);
  doc.setTextColor(...INK);
}

export const alternateRowStyles = { fillColor: ZEBRA };
export const footStyles = { fillColor: FOOT, textColor: 30, fontStyle: 'bold' };

// Masthead — logo badge on a white rounded rect, white company text block on
// the dark band, right-aligned title/meta. Mirrors docs/reports' masthead().
export function masthead(doc, { title, meta = [], color = BRAND }) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(0, 0, w, 32, 'F');
  doc.setFillColor(...DIVIDER);
  doc.rect(0, 32, w, 0.8, 'F');

  // Company logo — emblem on a white badge.
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(13, 5, 22, 22, 4, 4, 'F');
  doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', 15, 7, 18, 18);

  doc.setLineWidth(0.2);
  // Company block — white primary, light-slate secondary (readable on the dark band).
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('TARLAC TRUCK PARTS', 40, 14);
  doc.setTextColor(...DIVIDER);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Quality Truck Accessories & Spare Parts  |  Tarlac City, Philippines', 40, 20);
  doc.text('Contact: 0917-XXX-XXXX   TIN: XXX-XXX-XXX-XXX', 40, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(safe(title, 60), w - 14, 13, { align: 'right' });
  doc.setTextColor(...DIVIDER);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  meta.forEach((line, i) => doc.text(safe(line, 80), w - 14, 20 + i * 5, { align: 'right' }));
  doc.setTextColor(...INK);
}

function drawFooter(doc, page, total, notes) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.2);
  doc.line(14, h - 16, w - 14, h - 16);
  if (notes) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(safe(notes, 160), 14, h - 9);
  }
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Page ${page} of ${total}`, w - 14, h - 9, { align: 'right' });
  doc.setTextColor(...INK);
}

// Apply the shared footer (divider + optional notes + "Page X of X") to every
// page of the document. Call this LAST, after all content is drawn, so the
// page count is final.
export function paginate(doc, { notes } = {}) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, notes);
  }
}

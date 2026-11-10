// frontend/src/utils/rfqPdf.js
// Report 03 — Request for Quotation (docs/reports/03-rfq.md). No prices: the
// supplier fills in the blank unit-price/total columns by hand. Extracted from
// PurchasingModule.jsx so it shares the print kit and can be unit-tested.
import {
  jsPDF, autoTable, INK, safe, masthead, paginate, sectionLabel,
  formatDate, numCol, headStyle, bodyStyle, alternateRowStyles, tableLines
} from './pdf/reportPdfKit';

export function buildRfqPdf(po) {
  const doc = new jsPDF();
  const sup = po.supplier;

  masthead(doc, {
    title: 'REQUEST FOR QUOTATION',
    meta: [
      `RFQ No : ${safe(po.poNumber, 20)}`,
      `Date : ${formatDate(new Date())}`
    ]
  });

  sectionLabel(doc, 'To (Supplier)', 14, 45);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text(safe(sup?.name, 40) || 'N/A', 14, 51);
  if (sup?.email) doc.text(`Email: ${safe(sup.email, 30)}`, 14, 56);

  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', 14, 64);
  doc.setFont('Helvetica', 'normal');

  autoTable(doc, {
    startY: 70,
    head: [['#', 'SKU / DESCRIPTION', 'QTY REQ', 'YOUR UNIT PRICE', 'TOTAL']],
    body: (po.items || []).map((i, idx) => [
      idx + 1,
      `[${safe(i.sku, 14) || 'N/A'}] ${safe(i.name, 24)}`,
      i.quantity,
      '',
      ''
    ]),
    ...tableLines,
    headStyles: headStyle(),
    bodyStyles: { ...bodyStyle(), minCellHeight: 10 },
    alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 10, ...numCol('center') },
      2: numCol('center'),
      3: { cellWidth: 45, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  const y = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(9);
  doc.text('Quotation Valid Until : ____________________', 14, y);
  doc.text('Supplier Name / Signature : ____________________', 14, y + 10);

  paginate(doc, { notes: 'Please reply to this RFQ at your earliest convenience. Prices should be in PHP.' });
  doc.save(`RFQ_${safe(po.poNumber, 50)}.pdf`);
}

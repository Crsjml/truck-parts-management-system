// frontend/src/utils/rfqPdf.js
// Report 03 — Request for Quotation (docs/reports/03-rfq.md), open style. No
// prices: the supplier fills in the blank unit-price/amount lines by hand.
import {
  jsPDF, safe, masthead, paginate, sectionLabel, formatDate, openTable, totalRow, qty, MARGIN
} from './pdf/reportPdfKit';

const BLANK = '______________';

export function buildRfqPdf(po) {
  const doc = new jsPDF();
  const sup = po.supplier;
  const dateLine = `Date : ${formatDate(new Date())}`;

  masthead(doc, { title: 'REQUEST FOR QUOTATION', meta: [`RFQ No : ${safe(po.poNumber, 20)}`, dateLine] });

  sectionLabel(doc, 'To (Supplier)', MARGIN, 44);
  doc.text(safe(sup?.name, 40) || 'N/A', MARGIN, 50);
  if (sup?.email) doc.text(`Email : ${safe(sup.email, 30)}`, MARGIN, 55);
  doc.setFont('Helvetica', 'bold');
  doc.text('Please provide your best quotation for the following items (prices in PHP):', MARGIN, 64);
  doc.setFont('Helvetica', 'normal');

  const writeIn = (content) => ({ content, styles: { minCellHeight: 9, valign: 'bottom' } });
  const finalY = openTable(doc, {
    startY: 69,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 },
      { head: 'SKU', mono: true, width: 30 },
      { head: 'DESCRIPTION' },
      { head: 'QTY', align: 'right', mono: true, width: 13 },
      { head: 'YOUR UNIT\nPRICE', align: 'right', width: 34 },
      { head: 'AMOUNT', align: 'right', width: 34 }
    ],
    body: (po.items || []).map((i, idx) => [
      idx + 1, safe(i.sku, 13) || 'N/A', safe(i.name, 32), qty(i.quantity), BLANK, BLANK
    ].map(writeIn)),
    foot: [totalRow(5, 'QUOTED TOTAL', BLANK, undefined, true)]
  });

  doc.text('Quotation Valid Until : ____________________', MARGIN, finalY + 12);
  doc.text('Supplier Name / Signature : ____________________', MARGIN, finalY + 22);

  paginate(doc, {
    title: 'REQUEST FOR QUOTATION', dateLine, abbrev: ['QTY'],
    notes: 'Please reply to this RFQ at your earliest convenience. Prices should be in PHP.'
  });
  doc.save(`RFQ_${safe(po.poNumber, 50)}.pdf`);
}

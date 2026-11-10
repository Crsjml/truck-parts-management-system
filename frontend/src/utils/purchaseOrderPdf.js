// frontend/src/utils/purchaseOrderPdf.js
// Report 02 — Purchase Order (docs/reports/02-purchase-order.md), open style.
import {
  jsPDF, safe, masthead, paginate, sectionLabel, formatMoney, formatDate, openTable, totalRow, qty, MARGIN
} from './pdf/reportPdfKit';

function partyBlocks(doc, po) {
  const sup = po.supplier;
  sectionLabel(doc, 'Supplier (Vendor)', MARGIN, 44);
  sectionLabel(doc, 'Deliver To', 120, 44);
  [
    safe(sup?.name, 40) || 'N/A',
    `Attn : ${safe(sup?.contactPerson, 30)}`,
    safe(sup?.address, 40),
    `Tel : ${safe(sup?.phone, 20)}`,
    `Email : ${safe(sup?.email, 30)}`,
    `Payment Terms : ${safe(sup?.paymentTerms, 14)}`
  ].forEach((line, i) => doc.text(line, MARGIN, 50 + i * 5));
  [
    'Tarlac Truck Parts', 'Tarlac City, Philippines', '', '',
    `Expected Delivery : ${formatDate(po.expectedDeliveryDate)}`,
    `Source RFQ : ${safe(po.sourceRfq, 20)}`
  ].forEach((line, i) => doc.text(line, 120, 50 + i * 5));
}

export function buildPurchaseOrderPdf(po) {
  const doc = new jsPDF();
  const dateLine = `Date : ${formatDate(po.createdAt)}`;

  masthead(doc, {
    title: 'PURCHASE ORDER',
    meta: [`PO No : ${safe(po.poNumber, 20)}`, dateLine, `Status : ${safe(po.status, 14)}`]
  });
  partyBlocks(doc, po);

  const finalY = openTable(doc, {
    startY: 84,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 },
      { head: 'SKU', mono: true, width: 28 },
      { head: 'OEM/MPN', mono: true, width: 23 },
      { head: 'DESCRIPTION' },
      { head: 'QTY', align: 'right', mono: true, width: 12 },
      { head: 'UNIT\nPRICE', align: 'right', mono: true, width: 31 },
      { head: 'AMOUNT', align: 'right', mono: true, width: 38 }
    ],
    body: (po.items || []).map((i, idx) => [
      idx + 1,
      safe(i.sku, 13) || 'N/A',
      safe(i.part?.oem, 14) || 'N/A',
      safe(i.name, 28),
      qty(i.quantity),
      formatMoney(i.unitPrice),
      formatMoney(i.subtotal)
    ]),
    foot: [totalRow(6, 'GRAND TOTAL', formatMoney(po.totalAmount), 'double', true)]
  });

  doc.text(`Notes : ${safe(po.notes, 60)}`, MARGIN, finalY + 10);
  doc.text(`Prepared by : ${safe(po.createdBy, 20)}`, MARGIN, finalY + 22);
  doc.text('Authorized Signature : ____________________', 120, finalY + 22);

  paginate(doc, {
    title: 'PURCHASE ORDER', dateLine, abbrev: ['QTY', 'OEM'],
    notes: 'This purchase order is subject to our standard terms and conditions.'
  });
  doc.save(`${safe(po.poNumber, 50)}.pdf`);
}

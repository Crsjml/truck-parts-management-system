// frontend/src/utils/purchaseOrderPdf.js
// Report 02 — Purchase Order (docs/reports/02-purchase-order.md).
// Extracted from PurchasingModule.jsx so it can be unit-tested like the
// other report exports. Styling comes entirely from the shared print kit.
import {
  jsPDF, autoTable, INK, safe, masthead, paginate, sectionLabel,
  formatMoney, formatDate, numCol, headStyle, bodyStyle, alternateRowStyles, tableLines
} from './pdf/reportPdfKit';

function supplierBlock(doc, sup) {
  doc.text(safe(sup?.name, 40) || 'N/A', 14, 51);
  doc.text(`Attn: ${safe(sup?.contactPerson, 30)}`, 14, 56);
  doc.text(safe(sup?.address, 40), 14, 61);
  doc.text(`Tel: ${safe(sup?.phone, 20)}   Email: ${safe(sup?.email, 30)}`, 14, 66);
  doc.text(`Payment Terms: ${safe(sup?.paymentTerms, 14)}`, 14, 71);
}

function grandTotal(doc, amount, y) {
  doc.setFontSize(11);
  doc.setTextColor(INK);
  const gv = formatMoney(amount);
  doc.setFont('Courier', 'bold');
  const gvw = doc.getTextWidth(gv);
  doc.setFont('Helvetica', 'bold');
  doc.text('GRAND TOTAL:', 196 - gvw - 3, y, { align: 'right' });
  doc.setFont('Courier', 'bold');
  doc.text(gv, 196, y, { align: 'right' });
}

export function buildPurchaseOrderPdf(po) {
  const doc = new jsPDF();

  masthead(doc, {
    title: 'PURCHASE ORDER',
    meta: [
      `PO No : ${safe(po.poNumber, 20)}`,
      `Date : ${formatDate(po.createdAt)}`,
      `Status : ${safe(po.status, 14)}`
    ]
  });

  sectionLabel(doc, 'Supplier (Vendor)', 14, 45);
  sectionLabel(doc, 'Deliver To', 120, 45);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  supplierBlock(doc, po.supplier);

  doc.text('Tarlac Truck Parts', 120, 51);
  doc.text('Tarlac City, Philippines', 120, 56);
  doc.text(`Expected Delivery : ${formatDate(po.expectedDeliveryDate)}`, 120, 66);
  doc.text(`Source RFQ : ${safe(po.sourceRfq, 20)}`, 120, 71);

  autoTable(doc, {
    startY: 78,
    head: [['#', 'SKU', 'OEM / MPN', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: (po.items || []).map((i, idx) => [
      idx + 1,
      safe(i.sku, 14) || 'N/A',
      safe(i.part?.oem, 14) || 'N/A',
      safe(i.name, 28),
      i.quantity,
      formatMoney(i.unitPrice),
      formatMoney(i.subtotal)
    ]),
    ...tableLines,
    headStyles: headStyle(),
    bodyStyles: bodyStyle(),
    alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 10, ...numCol('center') },
      1: numCol('left'),
      2: numCol('left'),
      4: numCol('center'),
      5: numCol('right'),
      6: numCol('right')
    },
    margin: { left: 14, right: 14 }
  });

  const y = doc.lastAutoTable.finalY + 8;
  grandTotal(doc, po.totalAmount, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Notes: ${safe(po.notes, 60)}`, 14, y + 10);
  doc.text(`Prepared by: ${safe(po.createdBy, 20)}`, 14, y + 20);
  doc.text('Authorized Signature: ____________________', 120, y + 20);

  paginate(doc, { notes: 'This purchase order is subject to our standard terms and conditions.' });
  doc.save(`${safe(po.poNumber, 50)}.pdf`);
}

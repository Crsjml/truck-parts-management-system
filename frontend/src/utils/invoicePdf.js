// frontend/src/utils/invoicePdf.js
import { jsPDF, autoTable, BRAND, DIVIDER, INK, MUTED, ZEBRA, safe, masthead, paginate, sectionLabel, docNo, formatDateTime } from './pdf/reportPdfKit';

export function buildInvoicePdf(tx, { formatCurrency, duplicate = false }) {
  const doc = new jsPDF();

  masthead(doc, {
    title: duplicate ? 'SALES INVOICE (DUPLICATE)' : 'SALES INVOICE',
    color: BRAND,
    meta: [
      `Invoice No : ${safe(tx.invoiceNumber || docNo('INV'), 24)}`,
      `Date : ${formatDateTime(tx.transactionDate)}`
    ]
  });

  sectionLabel(doc, 'Bill To / Customer Info', 14, 45, BRAND);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Customer Name : ${safe(tx.customerName, 40)}`, 14, 51);
  doc.text(`Contact Phone : ${safe(tx.customerContact, 20)}`, 14, 56);

  autoTable(doc, {
    startY: 62,
    head: [['#', 'PART DESCRIPTION', 'UNIT PRICE', 'QTY', 'AMOUNT']],
    body: tx.items.map((item, i) => [
      i + 1,
      safe(item.name, 32),
      formatCurrency(item.price),
      item.quantity,
      formatCurrency(item.price * item.quantity)
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9, halign: 'left' },
    bodyStyles: { fontSize: 9, textColor: INK },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', font: 'courier' },
      2: { halign: 'right', font: 'courier' },
      3: { halign: 'center', font: 'courier' },
      4: { halign: 'right', font: 'courier' }
    },
    margin: { left: 14, right: 14 }
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9.5);
  const right = (label, value, yy) => {
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(label, 128, yy);
    doc.setFont('Courier', 'normal');
    doc.setTextColor(...INK);
    doc.text(value, 196, yy, { align: 'right' });
  };
  right('Subtotal (VATable):', formatCurrency(tx.subtotal), y);
  right('Discount Deductions:', `-${formatCurrency(tx.discount)}`, y + 5.5);
  right('VAT (12%):', formatCurrency(tx.taxAmount), y + 11);

  doc.setFillColor(...BRAND);
  doc.rect(118, y + 15, 78, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.text('NET TOTAL:', 121, y + 20);
  doc.setFont('Courier', 'bold');
  doc.text(formatCurrency(tx.total), 193, y + 20, { align: 'right' });
  doc.setTextColor(...INK);

  // Payment details — conditional by method, sits below the totals box so
  // long cash/cheque/gcash lines never cross into the totals column.
  y += 30;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  if (tx.paymentMethod) {
    doc.text(`Payment Method : ${safe(String(tx.paymentMethod).replace('_', ' '), 20)}`, 14, y);
    y += 5;
  }
  if (tx.paymentMethod === 'CASH' && tx.amountTendered != null) {
    doc.text(`Tendered: ${formatCurrency(tx.amountTendered)}   Change: ${formatCurrency(tx.changeGiven || 0)}`, 14, y);
    y += 5;
  }
  if (tx.paymentMethod === 'CHEQUE' && tx.chequeNumber) {
    doc.text(`Cheque No: ${safe(tx.chequeNumber, 20)} — ${safe(tx.chequeBank, 30)}`, 14, y);
    y += 5;
  }
  if (tx.paymentMethod === 'GCASH' && tx.gcashReference) {
    doc.text(`GCash Ref: ${safe(tx.gcashReference, 20)}`, 14, y);
    y += 5;
  }

  doc.setDrawColor(...DIVIDER);

  paginate(doc, { notes: 'Thank you for your business! Exchange is only valid within 7 days with this sales invoice.' });

  doc.save(`Invoice_${safe(tx.invoiceNumber, 50)}.pdf`);
}

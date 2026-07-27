// frontend/src/utils/invoicePdf.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function buildInvoicePdf(tx, { formatCurrency, displayCurrency, duplicate = false }) {
  const doc = new jsPDF();

  doc.setFillColor(27, 54, 93);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 40, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TARLAC TRUCK PARTS', 15, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Quality Truck Accessories & Spare Parts Wholesale & Retail', 15, 27);
  doc.text('Tarlac City, Philippines | Contact: 0917-XXX-XXXX', 15, 33);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(duplicate ? 'SALES INVOICE (DUPLICATE)' : 'SALES INVOICE', duplicate ? 135 : 145, 18);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Invoice No: ${tx.invoiceNumber}`, duplicate ? 135 : 145, 24);
  doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, duplicate ? 135 : 145, 30);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10.5);
  doc.setFont('Helvetica', 'bold');
  doc.text('BILL TO / CUSTOMER INFO:', 15, 56);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Customer Name: ${tx.customerName}`, 15, 62);
  doc.text(`Contact Phone: ${tx.customerContact}`, 15, 68);

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Part Description', 'Unit Price', 'Qty', 'Total']],
    body: tx.items.map((item, i) => [
      i + 1,
      item.name,
      `${displayCurrency} ${item.price}`,
      item.quantity,
      `${displayCurrency} ${item.price * item.quantity}`
    ]),
    headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontSize: 9.5, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { fontSize: 9, textColor: [33, 41, 54] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 100 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 } },
    theme: 'grid',
    margin: { left: 15, right: 15 }
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('Subtotal:', 130, y);
  doc.text(`${displayCurrency} ${tx.subtotal}`, 195, y, { align: 'right' });
  doc.text('Discount Deductions:', 130, y + 5.5);
  doc.text(`-${formatCurrency(tx.discount)}`, 195, y + 5.5, { align: 'right' });
  doc.text('VAT Amount (12%):', 130, y + 11);
  doc.text(`${displayCurrency} ${tx.taxAmount}`, 195, y + 11, { align: 'right' });

  doc.setFillColor(27, 54, 93);
  doc.rect(128, y + 15, 68, 7.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.text('NET TOTAL:', 131, y + 20);
  doc.text(`${displayCurrency} ${tx.total}`, 193, y + 20, { align: 'right' });

  y += 26;
  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  if (tx.paymentMethod) {
    doc.text(`Payment: ${String(tx.paymentMethod).replace('_', ' ')}`, 15, y);
    y += 5;
  }
  if (tx.amountTendered != null) {
    doc.text(`Tendered: ${formatCurrency(tx.amountTendered)}   Change: ${formatCurrency(tx.changeGiven || 0)}`, 15, y);
    y += 5;
  }
  if (tx.chequeNumber) {
    doc.text(`Cheque ${tx.chequeNumber} — ${tx.chequeBank || ''}`, 15, y);
    y += 5;
  }

  doc.setTextColor(100, 116, 139);
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('Thank you for your business!', 105, y + 8, { align: 'center' });
  doc.text('Return Policy: Exchange is only valid within 7 days with this sales invoice.', 105, y + 13, { align: 'center' });

  doc.save(`Invoice_${tx.invoiceNumber}.pdf`);
}

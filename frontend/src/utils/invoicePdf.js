// frontend/src/utils/invoicePdf.js
// Report 01 — Sales Invoice (docs/reports/01-sales-invoice.md), open style.
import {
  jsPDF, safe, masthead, paginate, sectionLabel, formatDateTime, openTable, totalRow, qty, MARGIN
} from './pdf/reportPdfKit';

function paymentLines(tx, formatCurrency) {
  const lines = [];
  if (tx.paymentMethod) lines.push(`Payment Method : ${safe(String(tx.paymentMethod).replace('_', ' '), 20)}`);
  if (tx.paymentMethod === 'CASH' && tx.amountTendered != null) {
    lines.push(`Tendered : ${formatCurrency(tx.amountTendered)}   Change : ${formatCurrency(tx.changeGiven || 0)}`);
  }
  if (tx.paymentMethod === 'CHEQUE' && tx.chequeNumber) {
    lines.push(`Cheque No : ${safe(tx.chequeNumber, 20)} — ${safe(tx.chequeBank, 30)}`);
  }
  if (tx.paymentMethod === 'GCASH' && tx.gcashReference) lines.push(`GCash Ref : ${safe(tx.gcashReference, 20)}`);
  return lines;
}

export function buildInvoicePdf(tx, { formatCurrency, duplicate = false }) {
  const doc = new jsPDF();
  const title = duplicate ? 'SALES INVOICE (DUPLICATE)' : 'SALES INVOICE';
  const dateLine = `Date : ${formatDateTime(tx.transactionDate)}`;

  masthead(doc, {
    title,
    // Never invent a number: the server assigns every invoice number.
    meta: [`Invoice No : ${safe(tx.invoiceNumber, 24) || '—'}`, dateLine]
  });

  sectionLabel(doc, 'Bill To', MARGIN, 44);
  doc.text(`Customer Name : ${safe(tx.customerName, 40)}`, MARGIN, 50);
  doc.text(`Contact Phone : ${safe(tx.customerContact, 20)}`, MARGIN, 55);

  const finalY = openTable(doc, {
    startY: 61,
    columns: [
      { head: '#', align: 'right', mono: true, width: 9 },
      { head: 'SKU', mono: true, width: 32 },
      { head: 'PART DESCRIPTION' },
      { head: 'UNIT\nPRICE', align: 'right', mono: true, width: 30 },
      { head: 'QTY', align: 'right', mono: true, width: 13 },
      { head: 'AMOUNT', align: 'right', mono: true, width: 32 }
    ],
    body: (tx.items || []).map((item, i) => [
      i + 1,
      safe(item.sku, 13) || '—',
      safe(item.name, 32),
      formatCurrency(item.price),
      qty(item.quantity),
      formatCurrency(item.price * item.quantity)
    ]),
    foot: [
      totalRow(5, 'Subtotal (VATable)', formatCurrency(tx.subtotal), 'single'),
      totalRow(5, 'Less: Discount', `-${formatCurrency(tx.discount || 0)}`),
      totalRow(5, 'VAT (12%)', formatCurrency(tx.taxAmount)),
      totalRow(5, 'NET TOTAL', formatCurrency(tx.total), 'double', true)
    ]
  });

  const lines = paymentLines(tx, formatCurrency);
  if (lines.length) {
    sectionLabel(doc, 'Payment', MARGIN, finalY + 10);
    lines.forEach((line, i) => doc.text(line, MARGIN, finalY + 16 + i * 5));
  }

  paginate(doc, {
    title, dateLine, abbrev: ['QTY'],
    notes: 'Thank you for your business! Exchange is only valid within 7 days with this sales invoice.'
  });
  doc.save(`Invoice_${safe(tx.invoiceNumber, 50)}.pdf`);
}

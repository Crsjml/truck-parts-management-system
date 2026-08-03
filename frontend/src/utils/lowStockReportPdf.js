import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Sanitize user-supplied strings before rendering into the PDF.
// Strips control characters and caps length to prevent abuse.
function safe(value, maxLen = 200) {
  if (value == null) return '';
  return String(value).replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen);
}

export function buildLowStockReportPdf(items, { formatCurrency }) {
  const doc = new jsPDF();

  doc.setFillColor(27, 54, 93);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LOW-STOCK WATCHLIST REPORT', 15, 15);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleString('en-US');
  doc.text(`Generated on: ${dateStr}`, 15, 22);

  autoTable(doc, {
    startY: 35,
    head: [['Part', 'SKU', 'Category', 'Stock', 'Min', 'Deficit', 'Severity']],
    body: items.map(item => [
      safe(item.name),
      safe(item.sku),
      safe(item.category || 'N/A'),
      item.stock,
      item.minStock,
      item.deficit,
      safe(item.severity).toUpperCase()
    ]),
    headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontSize: 9.5, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { fontSize: 9, textColor: [33, 41, 54] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 
      0: { cellWidth: 55 }, 
      1: { cellWidth: 35 }, 
      2: { cellWidth: 35 }, 
      3: { cellWidth: 15 }, 
      4: { cellWidth: 15 }, 
      5: { cellWidth: 15 }, 
      6: { cellWidth: 20 } 
    },
    theme: 'grid',
    margin: { left: 10, right: 10 }
  });

  const filenameDate = new Date().toISOString().split('T')[0];
  doc.save(`Low_Stock_Report_${filenameDate}.pdf`);
}

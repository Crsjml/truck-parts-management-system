import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ChartBar, Download, FileText, CurrencyDollar, TrendUp, Stack, CalendarBlank, MagnifyingGlass, ShoppingCart } from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Analytics({ parts, transactions }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [searchInvoice, setSearchInvoice] = useState('');

  // Computations
  const totalSales = transactions.length;
  const totalInvoicedAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);
  const averageInvoiceValue = totalSales > 0 ? totalInvoicedAmount / totalSales : 0;
  const totalItemsSold = transactions.reduce((sum, tx) => 
    sum + tx.items.reduce((s, i) => s + i.quantity, 0), 0
  );

  // Group sales quantities by part ID to find top-selling items
  const partSalesCounts = {};
  transactions.forEach(tx => {
    tx.items.forEach(item => {
      partSalesCounts[item.partId] = (partSalesCounts[item.partId] || 0) + item.quantity;
    });
  });

  // Top selling parts list
  const topSellingParts = Object.entries(partSalesCounts)
    .map(([partId, qty]) => {
      const part = parts.find(p => p.id === partId);
      return {
        id: partId,
        name: part ? part.name : 'Unknown Part',
        sku: part ? part.sku : 'N/A',
        quantity: qty,
        revenue: qty * (part ? part.price : 0)
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Category counts
  const categoryCounts = {};
  parts.forEach(part => {
    categoryCounts[part.category] = (categoryCounts[part.category] || 0) + 1;
  });

  const categoryBreakdown = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat,
    count
  }));

  // Filtered transactions for the log
  const filteredTransactions = transactions.filter(tx => 
    tx.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    tx.customerName.toLowerCase().includes(searchInvoice.toLowerCase())
  ).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  // PDF Re-download
  const handleDownloadPDF = (tx) => {
    if (!tx) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(27, 54, 93);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 40, 210, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TARLAC TRUCK PARTS", 15, 20);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Quality Truck Accessories & Spare Parts Wholesale & Retail", 15, 27);
      doc.text("Tarlac City, Philippines | Contact: 0917-XXX-XXXX", 15, 33);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SALES INVOICE (DUPLICATE)", 135, 18);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${tx.invoiceNumber}`, 135, 24);
      doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, 135, 30);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10.5);
      doc.setFont("Helvetica", "bold");
      doc.text("BILL TO / CUSTOMER INFO:", 15, 56);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Customer Name: ${tx.customerName}`, 15, 62);
      doc.text(`Contact Phone: ${tx.customerContact}`, 15, 68);

      const tableRows = tx.items.map((item, index) => [
        index + 1,
        item.name,
        `${displayCurrency} ${item.price}`,
        item.quantity,
        `${displayCurrency} ${(item.price * item.quantity)}`
      ]);

      doc.autoTable({
        startY: 76,
        head: [['#', 'Part Description', 'Unit Price', 'Qty', 'Total']],
        body: tableRows,
        headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontSize: 9.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [33, 41, 54] },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 100 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 } },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9.5);
      doc.setFont("Helvetica", "normal");
      doc.text("Subtotal:", 130, finalY);
      doc.text(`${displayCurrency} ${tx.subtotal}`, 195, finalY, { align: 'right' });
      doc.text("Discount Deductions:", 130, finalY + 5.5);
      doc.text(`-${formatCurrency(tx.discount)}`, 195, finalY + 5.5, { align: 'right' });
      doc.text("VAT Amount (12%):", 130, finalY + 11);
      doc.text(`${displayCurrency} ${tx.taxAmount}`, 195, finalY + 11, { align: 'right' });

      doc.setFillColor(27, 54, 93);
      doc.rect(128, finalY + 15, 68, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.text("NET TOTAL:", 131, finalY + 20);
      doc.text(`${displayCurrency} ${tx.total}`, 193, finalY + 20, { align: 'right' });

      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text("Thank you for your business!", 105, finalY + 36, { align: 'center' });
      doc.save(`Invoice_${tx.invoiceNumber}.pdf`);
    } catch (e) {
      alert("Error printing PDF: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Net Sales</span>
            <h3 className="text-2xl font-bold text-foreground font-display">
              {formatCurrency(totalInvoicedAmount)}
            </h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <TrendUp weight="duotone" className="w-3 h-3" /> Cumulative earnings
            </p>
          </div>
          <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-xl border border-emerald-800/35">
            <CurrencyDollar weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Processed Invoices</span>
            <h3 className="text-2xl font-bold text-foreground font-display">{totalSales}</h3>
            <p className="text-[10px] text-muted-foreground">Customer payments complete</p>
          </div>
          <div className="p-3 bg-brandBlue-900/40 text-brandBlue-400 rounded-xl border border-brandBlue-700/30">
            <FileText weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Invoice</span>
            <h3 className="text-2xl font-bold text-foreground font-display">
              {formatCurrency(averageInvoiceValue)}
            </h3>
            <p className="text-[10px] text-muted-foreground">Value per customer checkout</p>
          </div>
          <div className="p-3 bg-amber-950/40 text-amber-500 rounded-xl border border-amber-800/35">
            <TrendUp weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Items Dispatched</span>
            <h3 className="text-2xl font-bold text-foreground font-display">{totalItemsSold} units</h3>
            <p className="text-[10px] text-muted-foreground">Truck parts sold out of warehouse</p>
          </div>
          <div className="p-3 bg-violet-950/40 text-violet-400 rounded-xl border border-violet-800/35">
            <ShoppingCart weight="duotone" className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Volume */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <ChartBar weight="duotone" className="w-5 h-5 text-accent" />
            <h3 className="text-base font-bold text-foreground font-display">Top-Selling Components</h3>
          </div>
          
          <div className="space-y-4 py-2">
            {topSellingParts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No products sold yet.</div>
            ) : (
              topSellingParts.map((item, index) => {
                // Find percentage compared to the highest sold item quantity
                const maxQty = topSellingParts[0].quantity;
                const percentage = maxQty > 0 ? (item.quantity / maxQty) * 100 : 0;
                
                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span className="truncate max-w-[75%]">{index + 1}. {item.name}</span>
                      <span>{item.quantity} sold ({formatCurrency(item.revenue)})</span>
                    </div>
                    {/* Glowing bar */}
                    <div className="w-full bg-background rounded-full h-3.5 border border-slate-900 overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-brandBlue-600 to-accent rounded-full transition-all duration-500 relative"
                      >
                        <div className="absolute inset-0 bg-white/10" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Stack weight="duotone" className="w-5 h-5 text-brandBlue-400" />
            <h3 className="text-base font-bold text-foreground font-display">Inventory Catalog Allocation</h3>
          </div>

          <div className="space-y-4 py-2">
            {categoryBreakdown.filter(c => c.name !== 'All').map((cat) => {
              const maxCount = Math.max(...categoryBreakdown.map(c => c.count));
              const percentage = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;

              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>{cat.name}</span>
                    <span>{cat.count} parts listed</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-3 border border-slate-900 overflow-hidden">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-slate-800 to-brandBlue-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice Ledger History */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="space-y-1 w-full sm:w-auto">
            <h3 className="text-base font-bold text-foreground font-display">Sales Invoice Ledger</h3>
            <p className="text-xs text-muted-foreground">View payment history and re-download generated PDF receipts.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search invoice or customer..."
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              className="w-full bg-background border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No matching transactions logged.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-center">Items Count</th>
                  <th className="py-3 px-3 text-right">Invoiced Amount</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary transition-colors">
                    <td className="py-3 px-3 font-semibold text-red-500">{tx.invoiceNumber}</td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(tx.transactionDate).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-3 px-3 font-medium text-foreground">{tx.customerName}</td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {tx.items.reduce((s, i) => s + i.quantity, 0)} items
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      {formatCurrency(tx.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button 
                        onClick={() => handleDownloadPDF(tx)}
                        className="p-1 px-2.5 bg-slate-850 hover:bg-secondary text-muted-foreground hover:text-foreground rounded border border-border transition-colors inline-flex items-center gap-1 font-semibold"
                        title="Download Invoice PDF"
                      >
                        <Download weight="duotone" className="w-3 h-3" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

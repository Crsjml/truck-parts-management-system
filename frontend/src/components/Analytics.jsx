import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ChartBar, Download, FileText, CurrencyDollar, TrendUp, Stack, CalendarBlank, MagnifyingGlass, ShoppingCart, ArrowsOut, X, Package } from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { getCategoryIconAndColor } from '../utils/categoryIcons';
import { motion, AnimatePresence } from 'framer-motion';

export default function Analytics({ parts, transactions }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [searchInvoice, setSearchInvoice] = useState('');
  const [zoomedChart, setZoomedChart] = useState(null); // 'bar' | 'pie' | null
  const [localTransactions, setLocalTransactions] = useState(transactions);

  // Sync with props if transactions change from App.jsx
  React.useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(`/api/transactions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` // Use admin token if available
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setLocalTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status: newStatus } : tx));
      } else {
        console.error('Failed to update status');
        alert('Failed to update status. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    }
  };

  const getHexForTailwindClass = (classStr) => {
    if (!classStr) return '#ef4444';
    if (classStr.includes('red') || classStr.includes('rose')) return '#ef4444';
    if (classStr.includes('orange') || classStr.includes('amber')) return '#f59e0b';
    if (classStr.includes('yellow') || classStr.includes('lime')) return '#eab308';
    if (classStr.includes('emerald') || classStr.includes('teal')) return '#10b981';
    if (classStr.includes('cyan') || classStr.includes('sky')) return '#0ea5e9';
    if (classStr.includes('blue') || classStr.includes('brandBlue')) return '#3b82f6';
    if (classStr.includes('indigo') || classStr.includes('purple') || classStr.includes('violet')) return '#8b5cf6';
    if (classStr.includes('pink')) return '#ec4899';
    return '#94a3b8'; // slate/gray fallback
  };

  // Computations
  const totalSales = localTransactions.length;
  const totalInvoicedAmount = localTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const averageInvoiceValue = totalSales > 0 ? totalInvoicedAmount / totalSales : 0;
  const totalItemsSold = localTransactions.reduce((sum, tx) => 
    sum + tx.items.reduce((s, i) => s + i.quantity, 0), 0
  );

  // Group sales quantities by part name to avoid "Unknown Part" if IDs mismatch
  const partSalesCounts = {};
  localTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const name = item.name || 'Unknown Part';
      partSalesCounts[name] = (partSalesCounts[name] || 0) + item.quantity;
    });
  });

  // Top selling parts list
  const topSellingParts = Object.entries(partSalesCounts)
    .map(([name, qty]) => {
      const partObj = parts.find(p => p.name === name || (name.endsWith('...') && p.name.startsWith(name.slice(0, -3))));
      return {
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        category: partObj ? partObj.category : 'Uncategorized',
        quantity: qty
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const CustomYAxisTick = (props) => {
    const { x, y, payload } = props;
    const item = topSellingParts.find(d => d.name === payload.value);
    const IconProps = getCategoryIconAndColor(item?.category);
    const IconComponent = IconProps?.icon || Package;
    
    // Split long names into two lines
    const name = payload.value || '';
    let line1 = name;
    let line2 = '';
    
    if (name.length > 15 && name.includes(' ')) {
      const splitIndex = name.lastIndexOf(' ', 15);
      if (splitIndex !== -1) {
        line1 = name.substring(0, splitIndex);
        line2 = name.substring(splitIndex + 1);
      }
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x="-200" y={line2 ? "-16" : "-12"} width="195" height="32">
          <div className="flex items-center justify-end gap-1.5 w-full h-full pr-1">
            <IconComponent weight="duotone" className={`w-3.5 h-3.5 shrink-0 ${IconProps?.color}`} />
            <div className="flex flex-col items-end leading-tight text-right w-full overflow-hidden">
              <span className="text-11px text-slate-300 font-medium break-words whitespace-normal w-full" title={item?.fullName || name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {line1}
              </span>
            </div>
          </div>
        </foreignObject>
      </g>
    );
  };

  const CustomPieLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        {payload.map((entry, index) => {
          const IconProps = getCategoryIconAndColor(entry.value);
          const IconComponent = IconProps?.icon || Package;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/30 rounded-lg">
              <IconComponent weight="duotone" className={`w-3.5 h-3.5 shrink-0 ${IconProps?.color || 'text-slate-400'}`} />
              <span className="text-[10px] leading-tight text-slate-400 font-medium max-w-[120px] break-words whitespace-normal">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

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
  const filteredTransactions = localTransactions.filter(tx => 
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

      autoTable(doc, {
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
      doc.setFontSize(7.5);
      doc.text("THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES.", 105, finalY + 42, { align: 'center' });
      doc.text("Official Sales Invoice / BIR Acknowledged Form", 105, finalY + 46, { align: 'center' });
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
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Total Net Sales</span>
            <h3 className="text-2xl font-bold text-foreground font-display">
              {formatCurrency(totalInvoicedAmount)}
            </h3>
            <p className="text-2xs text-emerald-400 flex items-center gap-1">
              <TrendUp weight="duotone" className="w-3 h-3" /> Cumulative earnings
            </p>
          </div>
          <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-xl border border-emerald-800/35">
            <CurrencyDollar weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Processed Invoices</span>
            <h3 className="text-2xl font-bold text-foreground font-display">{totalSales}</h3>
            <p className="text-2xs text-muted-foreground">Customer payments complete</p>
          </div>
          <div className="p-3 bg-brandBlue-900/40 text-brandBlue-400 rounded-xl border border-brandBlue-700/30">
            <FileText weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Average Invoice</span>
            <h3 className="text-2xl font-bold text-foreground font-display">
              {formatCurrency(averageInvoiceValue)}
            </h3>
            <p className="text-2xs text-muted-foreground">Value per customer checkout</p>
          </div>
          <div className="p-3 bg-amber-950/40 text-amber-500 rounded-xl border border-amber-800/35">
            <TrendUp weight="duotone" className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5">
          <div className="space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Total Items Dispatched</span>
            <h3 className="text-2xl font-bold text-foreground font-display">{totalItemsSold} units</h3>
            <p className="text-2xs text-muted-foreground">Truck parts sold out of warehouse</p>
          </div>
          <div className="p-3 bg-violet-950/40 text-violet-400 rounded-xl border border-violet-800/35">
            <ShoppingCart weight="duotone" className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Volume (Recharts Horizontal Bar) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ChartBar weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-foreground font-display">Top-Selling Components</h3>
            </div>
            <button onClick={() => setZoomedChart('bar')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {topSellingParts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No products sold yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSellingParts}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={<CustomYAxisTick />}
                      width={180}
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#94a3b8', fontSize: 10 }}>
                      {topSellingParts.map((entry, index) => {
                        const color = getHexForTailwindClass(getCategoryIconAndColor(entry.category)?.color);
                        return <Cell key={`cell-${index}`} fill={color || '#94a3b8'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* Categories Distribution (Recharts Donut) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Stack weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-base font-bold text-foreground font-display">Inventory Catalog Allocation</h3>
            </div>
            <button onClick={() => setZoomedChart('pie')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full min-h-[320px] h-80">
            {categoryBreakdown.filter(c => c.name !== 'All').length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No categories found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 30, right: 0, bottom: 40, left: 0 }}>
                  <Pie
                    data={categoryBreakdown.filter(c => c.name !== 'All')}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                    stroke="none"
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {categoryBreakdown.filter(c => c.name !== 'All').map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getHexForTailwindClass(getCategoryIconAndColor(entry.name)?.color)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend content={<CustomPieLegend />} />
                </PieChart>
              </ResponsiveContainer>
            )}
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
                  <th className="py-3 px-3 text-center">Status</th>
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
                      <select 
                        value={tx.status || 'Pending'}
                        onChange={(e) => handleStatusUpdate(tx.id, e.target.value)}
                        className={`text-xs font-bold rounded-md px-2 py-1 border outline-none cursor-pointer appearance-none text-center
                          ${(!tx.status || tx.status === 'Pending') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            tx.status === 'In Transit' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                        `}
                      >
                        <option value="Pending" className="bg-background text-foreground">Pending</option>
                        <option value="In Transit" className="bg-background text-foreground">In Transit</option>
                        <option value="Completed" className="bg-background text-foreground">Completed</option>
                      </select>
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
      {/* ZOOM MODAL */}
      <AnimatePresence>
        {zoomedChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl h-[80vh] bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
                <div className="flex items-center gap-2">
                  {zoomedChart === 'bar' ? (
                    <ChartBar weight="duotone" className="w-6 h-6 text-accent" />
                  ) : (
                    <Stack weight="duotone" className="w-6 h-6 text-brandBlue-400" />
                  )}
                  <h3 className="text-xl font-bold text-foreground font-display">
                    {zoomedChart === 'bar' ? 'Top-Selling Components' : 'Inventory Catalog Allocation'}
                  </h3>
                </div>
                <button onClick={() => setZoomedChart(null)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-all">
                  <X weight="bold" className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-background p-8 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {zoomedChart === 'bar' ? (
                    <BarChart
                      data={topSellingParts}
                      layout="vertical"
                      margin={{ top: 20, right: 60, left: 40, bottom: 20 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={<CustomYAxisTick />}
                        width={200}
                      />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={40} label={{ position: 'right', fill: '#f8fafc', fontSize: 14, fontWeight: 'bold' }}>
                        {topSellingParts.map((entry, index) => {
                          const color = getHexForTailwindClass(getCategoryIconAndColor(entry.category)?.color);
                          return <Cell key={`cell-${index}`} fill={color || '#94a3b8'} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                      <Pie
                        data={categoryBreakdown.filter(c => c.name !== 'All')}
                        cx="50%"
                        cy="45%"
                        innerRadius={130}
                        outerRadius={190}
                        paddingAngle={4}
                        dataKey="count"
                        stroke="none"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: '#94a3b8' }}
                      >
                        {categoryBreakdown.filter(c => c.name !== 'All').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getHexForTailwindClass(getCategoryIconAndColor(entry.name)?.color)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend 
                        content={<CustomPieLegend />}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Download, Package, CheckCircle, Clock, Truck, CaretDown, Receipt } from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyOrders({ customerName, customerEmail, transactions }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);

  const customerTx = (transactions || []).filter(
    (tx) => 
      (tx.customerEmail && customerEmail && tx.customerEmail.toLowerCase() === customerEmail.toLowerCase()) ||
      (tx.customerName && customerName && tx.customerName.toLowerCase() === customerName.toLowerCase()) ||
      (tx.customerEmail && customerName && tx.customerEmail.toLowerCase().includes(customerName.toLowerCase().replace(/\s+/g, '.')))
  ).map(tx => ({
    ...tx,
    status: tx.status || 'Pending' 
  })).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  const filteredTx = customerTx.filter(tx => {
    if (activeTab === 'All') return true;
    return tx.status === activeTab;
  });

  const activeOrders = customerTx.filter(tx => tx.status !== 'Completed');
  const historicalOrders = customerTx.filter(tx => tx.status === 'Completed');
  const featuredOrder = activeOrders.length > 0 ? activeOrders[0] : (historicalOrders.length > 0 ? historicalOrders[0] : null);

  const tabs = [
    { id: 'All', label: 'Dashboard', icon: Package },
    { id: 'Pending', label: 'Pending Quotes', icon: Clock },
    { id: 'In Transit', label: 'In Transit', icon: Truck },
    { id: 'Completed', label: 'Completed', icon: CheckCircle },
  ];

  const handleDownloadPDF = (tx, e) => {
    if (e) e.stopPropagation();
    if (!tx) return;
    try {
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
      doc.text('SALES INVOICE (DUPLICATE)', 130, 18);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${tx.invoiceNumber}`, 130, 24);
      doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, 130, 30);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('BILL TO / CUSTOMER INFO:', 15, 56);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Customer Name: ${tx.customerName}`, 15, 62);
      doc.text(`Contact Phone: ${tx.customerContact}`, 15, 68);
      const tableRows = tx.items.map((item, i) => [
        i + 1, item.name,
        `${displayCurrency} ${item.price}`,
        item.quantity,
        `${displayCurrency} ${(item.price * item.quantity)}`,
      ]);
      autoTable(doc, {
        startY: 76,
        head: [['#', 'Part Description', 'Unit Price', 'Qty', 'Total']],
        body: tableRows,
        headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontSize: 9.5, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 9, textColor: [33, 41, 54] },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 100 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 } },
        theme: 'grid', margin: { left: 15, right: 15 },
      });
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('Subtotal:', 130, finalY);
      doc.text(`${displayCurrency} ${tx.subtotal}`, 195, finalY, { align: 'right' });
      doc.text('Discount Deductions:', 130, finalY + 5.5);
      doc.text(`-${formatCurrency(tx.discount)}`, 195, finalY + 5.5, { align: 'right' });
      doc.text('VAT Amount (12%):', 130, finalY + 11);
      doc.text(`${displayCurrency} ${tx.taxAmount}`, 195, finalY + 11, { align: 'right' });
      doc.setFillColor(27, 54, 93);
      doc.rect(128, finalY + 15, 68, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('NET TOTAL:', 131, finalY + 20);
      doc.text(`${displayCurrency} ${tx.total}`, 193, finalY + 20, { align: 'right' });
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('Thank you for your business!', 105, finalY + 36, { align: 'center' });
      doc.text('Return Policy: Exchange is only valid within 7 days with this sales invoice.', 105, finalY + 41, { align: 'center' });
      doc.save(`Invoice_${tx.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'In Transit': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-muted-foreground bg-secondary border-border';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary/80 backdrop-blur-xl border border-border/50 p-8 shadow-sm group transition-all hover:shadow-xl hover:border-accent/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-700 group-hover:bg-accent/10 group-hover:scale-110" />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display mb-2">Order History</p>
        <h1 className="text-3xl font-bold text-foreground font-display">My Purchase Orders</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-2xl leading-relaxed">
          Track in-transit shipments, download past invoices, and review your purchase history. Click on any order to view details.
        </p>
      </div>

      {/* Segmented Controls (Tabs) */}
      <div className="flex overflow-x-auto pb-4 no-scrollbar gap-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === tab.id 
                ? 'bg-foreground text-background border-foreground shadow-xl shadow-black/10 scale-[1.02]' 
                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border/80'
            }`}
            aria-label={`View ${tab.label}`}
          >
            <tab.icon weight={activeTab === tab.id ? "fill" : "duotone"} className="w-5 h-5" />
            {tab.label}
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-background/20 text-background' : 'bg-secondary text-muted-foreground'}`}>
              {tab.id === 'All' ? customerTx.length : customerTx.filter(tx => tx.status === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Dynamic Main View */}
      {filteredTx.length === 0 ? (
        <div className="rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-16 text-center shadow-sm flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 bg-background rounded-full border border-border/50 flex items-center justify-center shadow-xl">
               <Package weight="duotone" className="w-12 h-12 text-muted-foreground" />
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                 className="absolute inset-0 rounded-full border border-dashed border-muted-foreground/30 pointer-events-none" 
               />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-3">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} records found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Submitting a quote request or placing an order will generate a record here.</p>
        </div>
      ) : activeTab === 'All' ? (
        // BENTO ARCHITECTURE GRID (For Dashboard View)
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Order Card: 2fr */}
          <div className="lg:col-span-8 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Active Order Breakdown</h3>
            {featuredOrder ? (
               <div className="rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-8 shadow-sm flex-1 flex flex-col group transition-colors hover:border-accent/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                     <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-background border border-border/50 flex items-center justify-center shadow-sm relative overflow-hidden">
                          <Receipt weight="duotone" className="w-7 h-7 text-foreground relative z-10" />
                          {featuredOrder.status !== 'Completed' && (
                             <motion.div
                               animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                               transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                               className="absolute inset-0 bg-accent/20 pointer-events-none"
                             />
                          )}
                       </div>
                       <div>
                         <h4 className="text-2xl font-bold text-foreground font-mono">{featuredOrder.invoiceNumber}</h4>
                         <p className="text-xs font-medium text-muted-foreground">
                           {new Date(featuredOrder.transactionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                         </p>
                       </div>
                     </div>
                     <div className="text-left sm:text-right">
                        <div className="flex items-center gap-2 sm:justify-end mb-1">
                          {featuredOrder.status !== 'Completed' && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(featuredOrder.status)}`}>
                            {featuredOrder.status}
                          </span>
                        </div>
                        <p className="text-3xl font-black text-foreground font-mono tracking-tight">{formatCurrency(featuredOrder.total)}</p>
                     </div>
                  </div>

                  <div className="flex-1 bg-background/50 rounded-3xl p-6 border border-border/50 flex flex-col">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2 flex items-center justify-between">
                       <span>Line Items ({featuredOrder.items.length})</span>
                       <button 
                         onClick={(e) => handleDownloadPDF(featuredOrder, e)} 
                         aria-label="Download PDF Invoice" 
                         className="text-foreground hover:text-accent flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-2"
                       >
                         <Download weight="bold" /> PDF
                       </button>
                    </h5>
                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                      {featuredOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-secondary transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                              <Package weight="duotone" className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground line-clamp-1">{item.name}</p>
                              <p className="text-[11px] font-medium text-muted-foreground mt-0.5 font-mono">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-foreground shrink-0 font-mono">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            ) : (
               <div className="flex-1 rounded-[2rem] border border-border/50 bg-secondary/80 flex items-center justify-center text-muted-foreground text-sm font-bold p-8 text-center">
                 No active orders to track right now.
               </div>
            )}
          </div>

          {/* Historical Orders List: 1fr */}
          <div className="lg:col-span-4 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Past Orders</h3>
            <div className="flex-1 rounded-[2rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-6 shadow-sm overflow-hidden flex flex-col">
               <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[480px]">
                 {historicalOrders.length > 0 ? historicalOrders.map(tx => (
                   <button 
                     key={tx.id || tx.id} 
                     onClick={(e) => handleDownloadPDF(tx, e)}
                     aria-label={`Download historical order ${tx.invoiceNumber}`}
                     className="w-full text-left p-4 rounded-2xl border border-border bg-background/50 hover:bg-background hover:border-accent/40 transition-all group flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                   >
                     <div className="flex justify-between items-center w-full">
                       <span className="text-sm font-bold font-mono text-foreground group-hover:text-accent transition-colors">{tx.invoiceNumber}</span>
                       <Download weight="bold" className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                     </div>
                     <div className="flex justify-between items-center w-full">
                       <span className="text-[11px] font-medium text-muted-foreground">
                         {new Date(tx.transactionDate).toLocaleDateString()}
                       </span>
                       <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(tx.total)}</span>
                     </div>
                   </button>
                 )) : (
                   <div className="h-full flex items-center justify-center">
                     <p className="text-sm text-muted-foreground text-center font-medium">No past orders yet.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      ) : (
        // Standard List View for specific tabs
        <div className="space-y-4">
          {filteredTx.map((tx) => (
            <div key={tx.id || tx.id} className={`rounded-[2rem] border transition-all duration-500 ease-spring-physics bg-secondary/80 backdrop-blur-xl shadow-sm overflow-hidden ${expandedRow === tx.id ? 'border-accent/50 shadow-2xl scale-[1.01]' : 'border-border/50 hover:border-accent/30 hover:shadow-xl hover:-translate-y-1'}`}>
              
              {/* Order Header (Always visible) */}
              <div 
                onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}
                className="p-6 sm:p-8 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-6 group"
                role="button"
                tabIndex={0}
                aria-expanded={expandedRow === tx.id}
                aria-label={`Toggle details for order ${tx.invoiceNumber}`}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedRow(expandedRow === tx.id ? null : tx.id)}
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform relative overflow-hidden">
                    <Receipt weight="duotone" className="w-7 h-7 text-muted-foreground relative z-10" />
                    {tx.status !== 'Completed' && (
                       <motion.div
                         animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                         transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                         className="absolute inset-0 bg-accent/10 pointer-events-none"
                       />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h4 className="text-lg font-bold text-foreground font-mono">{tx.invoiceNumber}</h4>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${getStatusColor(tx.status)}`}>
                        {tx.status !== 'Completed' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {new Date(tx.transactionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-8 border-t sm:border-t-0 border-border/50 pt-4 sm:pt-0">
                  <div className="text-left sm:text-right flex-1 sm:flex-none">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-xl font-black text-foreground font-mono">{formatCurrency(tx.total)}</p>
                  </div>
                  <button 
                    onClick={(e) => handleDownloadPDF(tx, e)}
                    className="p-3 rounded-xl bg-background border border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all shadow-sm group-hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label="Download Invoice"
                    title="Download Invoice"
                  >
                    <Download weight="bold" className="w-5 h-5" />
                  </button>
                  <CaretDown weight="bold" className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${expandedRow === tx.id ? 'rotate-180 text-foreground' : ''}`} />
                </div>
              </div>

              {/* Order Details (Expandable) */}
              <AnimatePresence>
                {expandedRow === tx.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="border-t border-border/50 bg-background/50 overflow-hidden"
                  >
                    <div className="p-6 sm:p-8">
                      {/* Items List */}
                      <div>
                        <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">Items in this order ({tx.items.length})</h5>
                        <div className="space-y-3">
                          {tx.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                                  <Package weight="duotone" className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground line-clamp-1">{item.name}</p>
                                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 font-mono">Qty: {item.quantity}</p>
                                </div>
                              </div>
                              <p className="text-sm font-black text-foreground shrink-0 font-mono">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

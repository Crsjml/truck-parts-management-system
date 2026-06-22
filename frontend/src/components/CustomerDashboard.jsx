import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { SquaresFour, FileText, PaperPlaneRight, CalendarBlank, Bell, List, X, User, ShieldCheck, CurrencyDollar, TrendUp, Package, Question, Download, Clock, CheckCircle, ArrowRight, ShoppingCart, MagnifyingGlass, Plus, Minus, Trash, CreditCard, LockKey, Gear, CircleNotch, Moon, Sun } from '@phosphor-icons/react';
import { changePassword } from '../authStore';
import Logo from './Logo';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Footer from './Footer';

/* ─────────────────────────────────────────────
   INNER PAGE COMPONENTS
   ───────────────────────────────────────────── */

/* ── 1. Customer Overview / Dashboard ───────── */
function CustomerOverview({ customerName, customerContact, transactions, parts, inquiries, setPage }) {
  const { formatCurrency } = useSettings();
  const customerTx = transactions.filter(
    (tx) => tx.customerName?.toLowerCase() === customerName.toLowerCase()
  );
  const totalOrders   = customerTx.length;
  const totalSpent    = customerTx.reduce((sum, tx) => sum + tx.total, 0);
  const avgOrder      = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const pendingInq    = inquiries.filter((i) => i.status === 'Pending').length;

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-accent">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-display">
            Customer Overview
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
            Welcome back, <span className="text-foreground font-semibold">{customerName}</span>. View your purchase history, download invoices, shop for replacement parts, and submit custom quotes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            onClick={() => setPage('shop')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-300 transform hover:scale-[1.03] shadow-lg shadow-accent/20"
          >
            <ShoppingCart weight="duotone" className="w-5 h-5" />
            Shop / Order Parts
          </button>
          <button
            onClick={() => setPage('orders')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary hover:bg-slate-700 text-foreground border border-border font-semibold transition-all duration-300"
          >
            <FileText weight="duotone" className="w-5 h-5" />
            My Orders
          </button>
          <button
            onClick={() => setPage('quote')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary hover:bg-slate-700 text-foreground border border-border font-semibold transition-all duration-300"
          >
            <PaperPlaneRight weight="duotone" className="w-5 h-5" />
            Request Quote
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-brandBlue-400 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Invoices</span>
            <h3 className="text-3xl font-bold text-foreground font-display">{totalOrders}</h3>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </div>
          <div className="p-3 bg-brandBlue-900/40 text-brandBlue-400 rounded-xl border border-brandBlue-700/30">
            <FileText weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-emerald-500/30 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Spent</span>
            <h3 className="text-3xl font-bold text-foreground font-display">
              {formatCurrency(totalSpent)}
            </h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendUp weight="duotone" className="w-3.5 h-3.5" /> Wholesale pricing
            </p>
          </div>
          <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CurrencyDollar weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-indigo-500/30 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg. Invoice</span>
            <h3 className="text-3xl font-bold text-foreground font-display">
              {formatCurrency(avgOrder)}
            </h3>
            <p className="text-xs text-muted-foreground">Per checkout</p>
          </div>
          <div className="p-3 bg-indigo-950/40 text-indigo-400 rounded-xl border border-indigo-800/30">
            <Package weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-accent/50 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Quotes</span>
            <h3 className="text-3xl font-bold text-foreground font-display">{pendingInq}</h3>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </div>
          <div className="p-3 bg-accent/15 text-accent rounded-xl border border-accent/20">
            <Question weight="duotone" className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Bottom Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground font-display">Recent Orders</h3>
              <p className="text-xs text-muted-foreground">Your latest purchase invoices.</p>
            </div>
            <button onClick={() => setPage('orders')} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-semibold transition-colors">
              View all <ArrowRight weight="duotone" className="w-3.5 h-3.5" />
            </button>
          </div>

          {customerTx.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No purchase records found. Orders placed in shop or at the counter will appear here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-muted-foreground text-xs font-semibold uppercase border-b border-border">
                    <th className="py-3 px-2">Invoice</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerTx.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-secondary transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-foreground font-bold">{tx.invoiceNumber}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {new Date(tx.transactionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-foreground">
                        {formatCurrency(tx.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quote Requests */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Clock weight="duotone" className="w-5 h-5 text-brandBlue-400" />
            <h3 className="text-lg font-bold text-foreground font-display">Quote Requests</h3>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {inquiries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No inquiries submitted yet.</p>
            ) : inquiries.map((inq) => (
              <div key={inq.id} className="flex justify-between items-center p-3 bg-secondary rounded-xl border border-border hover:border-border transition-all">
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-foreground block truncate max-w-[150px]">{inq.partName}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">{new Date(inq.date).toLocaleString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                  inq.status === 'Responded'
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/30'
                    : 'bg-amber-950/30 text-amber-500 border-amber-800/30 animate-pulse'
                }`}>{inq.status}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <div className="p-3 bg-secondary rounded-xl border border-border text-muted-foreground text-xs">
              <span className="font-bold text-muted-foreground">Quick Tip:</span> Use <span className="font-mono text-muted-foreground">Request Quote</span> to get wholesale pricing for bulk parts orders.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2. My Orders Page ───────────────────────── */
function MyOrders({ customerName, transactions }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const customerTx = transactions.filter(
    (tx) => tx.customerName?.toLowerCase() === customerName.toLowerCase()
  );

  const handleDownloadPDF = (tx) => {
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
      doc.autoTable({
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-brandBlue-400">
        <div className="absolute top-0 right-0 w-72 h-72 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <h1 className="text-3xl font-bold text-foreground font-display">My Purchase History</h1>
        <p className="text-muted-foreground text-sm mt-1">All invoices processed under your account. Download duplicates anytime.</p>
      </div>

      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-lg font-bold text-foreground font-display">All Orders</h3>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-secondary text-muted-foreground border border-border">
            {customerTx.length} {customerTx.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        {customerTx.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No purchase records found. Orders placed in the Shop tab or counter will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-muted-foreground text-xs font-semibold uppercase border-b border-border">
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customerTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary transition-colors">
                    <td className="py-3.5 px-3 font-mono text-xs text-foreground font-bold">{tx.invoiceNumber}</td>
                    <td className="py-3.5 px-3 text-xs text-muted-foreground">
                      {new Date(tx.transactionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-muted-foreground max-w-[220px] truncate">
                      {tx.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-foreground">
                      {formatCurrency(tx.total)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleDownloadPDF(tx)}
                        className="p-1.5 hover:bg-emerald-950/40 text-emerald-400 border border-transparent hover:border-emerald-800/30 rounded-lg transition-all"
                        title="Download PDF Invoice"
                      >
                        <Download weight="duotone" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 3. Request Quote Page ───────────────────── */
function RequestQuote({ customerName, parts, inquiries, setInquiries, onAddLog }) {
  const [selectedPartId, setSelectedPartId] = useState('');
  const [inquiryQty, setInquiryQty]         = useState('1');
  const [inquiryMsg, setInquiryMsg]         = useState('');
  const [showSuccess, setShowSuccess]       = useState(false);
  const [submitted, setSubmitted]           = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const part = parts.find((p) => p.id === selectedPartId);
    if (!part) return;
    const qty = parseInt(inquiryQty) || 1;
    const newInq = {
      id: `INQ-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      partName: part.name,
      quantity: qty,
      message: inquiryMsg || 'Requested price quote.',
      status: 'Pending',
    };
    setInquiries((prev) => [newInq, ...prev]);
    if (onAddLog) onAddLog('system', `Quote request ${newInq.id} submitted by '${customerName}' for ${qty}x ${part.name}.`);
    setSubmitted(newInq);
    setShowSuccess(true);
    setSelectedPartId('');
    setInquiryQty('1');
    setInquiryMsg('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-accent">
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <h1 className="text-3xl font-bold text-foreground font-display">Request a Quote</h1>
        <p className="text-muted-foreground text-sm mt-1">Submit a wholesale parts inquiry to our warehouse team for volume pricing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Form */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <PaperPlaneRight weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-lg font-bold text-foreground font-display">New Inquiry Form</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Catalog Part *</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
              >
                <option value="" disabled>-- Select Truck Component --</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Request Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={inquiryQty}
                onChange={(e) => setInquiryQty(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Notes & Special Instructions</label>
              <textarea
                placeholder="Provide details such as transport timeline, packaging preference, or fleet requirements..."
                rows="5"
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              <PaperPlaneRight weight="duotone" className="w-4 h-4" /> PaperPlaneRight Inquiry to Warehouse
            </button>
          </form>
        </div>

        {/* Submitted Inquiries */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Clock weight="duotone" className="w-5 h-5 text-brandBlue-400" />
            <h3 className="text-base font-bold text-foreground font-display">My Inquiries</h3>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {inquiries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No inquiries yet. Submit your first quote request!</p>
            ) : inquiries.map((inq) => (
              <div key={inq.id} className="p-3 bg-secondary rounded-xl border border-border hover:border-border transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs truncate max-w-[160px]">{inq.partName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                    inq.status === 'Responded'
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/30'
                      : 'bg-amber-950/30 text-amber-500 border-amber-800/30 animate-pulse'
                  }`}>{inq.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">"{inq.message}"</p>
                <span className="text-[9px] text-muted-foreground font-mono block">Qty: {inq.quantity} pcs · {new Date(inq.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-secondary border border-border rounded-2xl p-6 space-y-6 text-center shadow-2xl animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle weight="duotone" className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground font-display">Inquiry Received!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Your quote request <strong>{submitted.id}</strong> was submitted. Our warehouse team has been notified.</p>
            </div>
            <div className="bg-background p-4 rounded-xl text-left border border-border text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Part:</span>
                <span className="text-muted-foreground truncate max-w-[150px]">{submitted.partName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="text-muted-foreground font-bold">{submitted.quantity} pcs</span>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-2.5 bg-secondary hover:bg-slate-700 border border-border text-muted-foreground font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 4. Shop / Order Parts Page ──────────────── */
function ShopParts({ customerName, customerContact, parts, onCheckout, onAddLog }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  
  // Checkout customer info
  const [nameInput, setNameInput] = useState(customerName);
  const [contactInput, setContactInput] = useState(customerContact);

  // Success states
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  // Autocomplete, pagination, and sorting states
  const [sortOrder, setSortOrder] = useState('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, sortOrder]);

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const candidates = new Set();
    parts.forEach(part => {
      if (part.name.toLowerCase().includes(term)) candidates.add(part.name);
      if (part.sku.toLowerCase().includes(term)) candidates.add(part.sku);
      if (part.oem.toLowerCase().includes(term)) candidates.add(part.oem);
      if (part.compatibility && part.compatibility.toLowerCase().includes(term)) {
        candidates.add(part.compatibility);
      }
    });
    return Array.from(candidates).slice(0, 6);
  }, [search, parts]);

  // Dynamic Categories from catalog
  const categories = ['All', ...new Set(parts.map((p) => p.category))];

  const filteredParts = parts.filter((part) => {
    const term = search.toLowerCase();
    const matchesSearch =
      part.name.toLowerCase().includes(term) ||
      part.sku.toLowerCase().includes(term) ||
      part.oem.toLowerCase().includes(term) ||
      (part.compatibility || '').toLowerCase().includes(term);
    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedParts = useMemo(() => {
    const result = [...filteredParts];
    if (sortOrder === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortOrder === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortOrder === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === 'stock-desc') result.sort((a, b) => b.stock - a.stock);
    else if (sortOrder === 'stock-asc') result.sort((a, b) => a.stock - b.stock);
    return result;
  }, [filteredParts, sortOrder]);

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedParts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedParts, currentPage]);

  const addToCart = (part) => {
    const existing = cart.find((item) => item.id === part.id);
    if (existing) {
      if (existing.quantity >= part.stock) {
        alert(`Cannot add more. Only ${part.stock} units of ${part.name} are available in stock.`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      if (part.stock <= 0) return;
      setCart([...cart, { ...part, quantity: 1 }]);
    }
  };

  const updateQuantity = (partId, delta) => {
    const item = cart.find((i) => i.id === partId);
    if (!item) return;

    const target = parts.find((p) => p.id === partId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      removeFromCart(partId);
      return;
    }

    if (target && newQty > target.stock) {
      alert(`Cannot exceed available stock (${target.stock} units).`);
      return;
    }

    setCart(cart.map((i) => (i.id === partId ? { ...i, quantity: newQty } : i)));
  };

  const removeFromCart = (partId) => {
    setCart(cart.filter((item) => item.id !== partId));
  };

  // Pricing math
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Auto 5% discount for logged in verified customers
  const discountVal = subtotal * 0.05;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxAmount = taxableAmount * 0.12;
  const grandTotal = taxableAmount + taxAmount;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    const invoiceNum = `TTP-CUST-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const txData = {
      id: `TX-${Date.now()}`,
      invoiceNumber: invoiceNum,
      customerName: nameInput || 'Verified Customer',
      customerContact: contactInput || 'N/A',
      items: cart.map((item) => ({
        partId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      discount: discountVal,
      tax: 12,
      subtotal,
      taxAmount,
      total: grandTotal,
      transactionDate: new Date().toISOString(),
    };

    onCheckout(txData);
    if (onAddLog) {
      onAddLog('sale', `Customer order placed: Invoice ${invoiceNum} submitted by ${nameInput}.`);
    }

    setLastTx(txData);
    setCheckoutSuccess(true);
    setCart([]);
  };

  const handleDownloadPDF = (tx) => {
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
      doc.text('SALES INVOICE (CUSTOMER COPY)', 110, 18);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${tx.invoiceNumber}`, 110, 24);
      doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, 110, 30);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('BILL TO / CUSTOMER INFO:', 15, 56);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Customer Name: ${tx.customerName}`, 15, 62);
      doc.text(`Contact Phone: ${tx.customerContact}`, 15, 68);
      const tableRows = tx.items.map((item, i) => [
        i + 1,
        item.name,
        `${displayCurrency} ${item.price}`,
        item.quantity,
        `${displayCurrency} ${(item.price * item.quantity)}`,
      ]);
      doc.autoTable({
        startY: 76,
        head: [['#', 'Part Description', 'Unit Price', 'Qty', 'Total']],
        body: tableRows,
        headStyles: { fillColor: [27, 54, 93], textColor: [255, 255, 255], fontSize: 9.5, fontStyle: 'bold', halign: 'left' },
        bodyStyles: { fontSize: 9, textColor: [33, 41, 54] },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 100 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 } },
        theme: 'grid',
        margin: { left: 15, right: 15 },
      });
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('Subtotal:', 130, finalY);
      doc.text(`${displayCurrency} ${tx.subtotal}`, 195, finalY, { align: 'right' });
      doc.text('Discount Deductions (5%):', 130, finalY + 5.5);
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
      {/* Left Area: Catalog */}
      <div className="xl:col-span-2 space-y-6">
        <div className="relative overflow-hidden rounded-2xl glass-panel p-6 border-l-4 border-l-brandBlue-400">
          <div className="absolute top-0 right-0 w-72 h-72 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <h1 className="text-3xl font-bold text-foreground font-display">Parts Shop</h1>
          <p className="text-muted-foreground text-sm mt-1">Select from our warehouse stock. Logged-in VIP customer discount applied automatically.</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-4 font-sans">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full lg:max-w-xl">
              <div className="relative w-full">
                <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search catalog by SKU, name, OEM, fitment..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-secondary p-2 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearch(s);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 text-xs font-semibold rounded-xl border border-border bg-background px-3 text-muted-foreground outline-none focus:border-brandBlue-500 transition w-full md:w-auto shrink-0"
              >
                <option value="recommended">Sort By</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
                <option value="stock-desc">Stock: High to Low</option>
                <option value="stock-asc">Stock: Low to High</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full lg:max-w-xs xl:max-w-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-accent/20 text-accent border-accent/40'
                      : 'bg-background text-muted-foreground border-border hover:border-border hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredParts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No items found matching your filters.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
              {paginatedParts.map((part) => {
                const cartItem = cart.find((item) => item.id === part.id);
                const remaining = part.stock - (cartItem ? cartItem.quantity : 0);

                return (
                  <div
                    key={part.id}
                    onClick={() => remaining > 0 && addToCart(part)}
                    className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between space-y-3 relative group ${
                      remaining > 0
                        ? 'bg-secondary border-border hover:border-accent/40 hover:bg-secondary cursor-pointer'
                        : 'bg-background border-slate-900 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-bold text-brandBlue-400 uppercase tracking-wider">{part.category}</span>
                        <span className="text-xs font-bold text-foreground">{formatCurrency(part.price)}</span>
                      </div>
                      <h5 className="font-bold text-foreground text-xs line-clamp-1 group-hover:text-foreground transition-colors">
                        {part.name}
                      </h5>
                      <div className="flex gap-2 text-[9px] text-muted-foreground font-mono">
                        <span>SKU: {part.sku}</span>
                        <span>| OEM: {part.oem}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">{part.description}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-[9px] text-muted-foreground max-w-[60%] truncate">Fits: {part.compatibility}</span>
                      <span className={`text-[10px] font-semibold ${remaining <= 3 ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
                        {remaining > 0 ? `${remaining} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {Math.ceil(filteredParts.length / itemsPerPage) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-200/20 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.ceil(filteredParts.length / itemsPerPage) }, (_, i) => i + 1).map(pageNumber => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-7 h-7 rounded-xl text-[10px] font-bold transition-all ${
                      currentPage === pageNumber
                        ? 'bg-accent text-white font-extrabold shadow-md shadow-accent/20'
                        : 'border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredParts.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filteredParts.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Right Area: Checkout Cart */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 font-sans">
        <form onSubmit={handleCheckoutSubmit} className="flex flex-col h-full justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border font-display">
              <ShoppingCart weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-bold text-foreground">My Cart</h3>
              {cart.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-extrabold border border-accent/20">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
                </span>
              )}
            </div>

            {/* Cart list */}
            {cart.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-3">
                <ShoppingCart weight="duotone" className="w-8 h-8 mx-auto opacity-30 text-muted-foreground" />
                <p className="text-xs leading-normal">Your ordering cart is empty.<br />Click catalog items on the left to add them here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-secondary p-3 rounded-xl border border-border">
                    <div className="space-y-1 max-w-[60%] font-sans">
                      <h6 className="font-semibold text-foreground text-xs truncate">{item.name}</h6>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatCurrency(item.price)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-colors"
                        >
                          <Minus weight="duotone" className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-foreground font-bold w-5 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-colors"
                        >
                          <Plus weight="duotone" className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-950/10 rounded-lg transition-colors"
                      >
                        <Trash weight="duotone" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delivery / Session Info details */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Customer Delivery/Billing Info</span>
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Customer Name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground placeholder-slate-700"
                />
                <input
                  type="text"
                  required
                  placeholder="Contact Number"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground placeholder-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Checkout Math */}
          <div className="space-y-4 pt-4 border-t border-border font-sans">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VIP Discount (5%)</span>
                <span>- {formatCurrency(discountVal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (12%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2.5 font-display">
                <span>Total Due</span>
                <span className="text-accent font-extrabold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-3 px-4 bg-accent hover:bg-accent/90 disabled:bg-slate-850 disabled:text-slate-600 disabled:shadow-none disabled:border-slate-850 text-white font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
            >
              <CreditCard weight="duotone" className="w-4 h-4" /> Place Dashboard Order
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal Overlay */}
      {checkoutSuccess && lastTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-secondary border border-border rounded-2xl p-6 space-y-6 text-center shadow-2xl animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle weight="duotone" className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground font-display">Order Placed Successfully!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your order is being prepared by our logistics team. Download a duplicate copy of your sales invoice below.
              </p>
            </div>

            <div className="bg-background p-4 rounded-xl text-left border border-slate-850 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice No:</span>
                <span className="text-foreground font-semibold">{lastTx.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Total:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(lastTx.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDownloadPDF(lastTx)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold rounded-xl text-xs transition-colors"
              >
                <Download weight="duotone" className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                onClick={() => setCheckoutSuccess(false)}
                className="py-2.5 bg-secondary hover:bg-slate-700 border border-border text-muted-foreground font-bold rounded-xl text-xs transition-colors"
              >
                Close Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 5. Gear / Security Page ─────────────── */
function SettingsPage({ customerEmail }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await changePassword({ email: customerEmail, currentPassword, newPassword });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
    } else {
      setNotice(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-accent">
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <h1 className="text-3xl font-bold text-foreground font-display">Account Security</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your password and security preferences.</p>
      </div>

      <div className="glass-panel p-6 md:p-8 rounded-2xl">
        <div className="flex items-center gap-2 pb-4 border-b border-border mb-6">
          <LockKey weight="duotone" className="w-5 h-5 text-brandBlue-400" />
          <h3 className="text-lg font-bold text-foreground font-display">Change Password</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          {notice && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <CircleNotch weight="duotone" className="w-4 h-4 animate-spin" /> : <ShieldCheck weight="duotone" className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   MAIN CustomerDashboard SHELL
   ───────────────────────────────────────────── */
export default function CustomerDashboard({
  customerName    = 'Batangas Freight Logistics',
  customerContact = '0917-555-0192',
  transactions    = [],
  parts           = [],
  onAddLog        = () => {},
  onCheckout      = () => {},
  onLogout        = () => {},
  isDarkMode,
  setIsDarkMode
}) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [page, setPage]               = useState('dashboard');
  const [isSidebarOpen, setSidebar]   = useState(false);
  const [inquiries, setInquiries]     = useState([
    {
      id: 'INQ-101',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      partName: 'Starter Motor Assembly (24V 4.5KW)',
      quantity: 5,
      message: 'Need custom volume pricing for fleet maintenance.',
      status: 'Responded',
    },
  ]);

  const navItems = [
    { key: 'dashboard', label: 'Dashboard Overview', icon: SquaresFour },
    { key: 'shop',      label: 'Shop / Order Parts', icon: ShoppingCart    },
    { key: 'orders',    label: 'My Orders',          icon: FileText         },
    { key: 'quote',     label: 'Request Quote',      icon: PaperPlaneRight             },
    { key: 'settings',  label: 'Security Gear',  icon: Gear         },
  ];

  const NavButton = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = page === item.key;
    return (
      <button
        onClick={() => { setPage(item.key); if (onClick) onClick(); }}
        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
          active
            ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
        }`}
      >
        <Icon className="w-5 h-5" />
        {item.label}
      </button>
    );
  };

  const initials = customerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="h-full flex overflow-hidden bg-background font-sans w-full">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 glass-panel border-r border-slate-900/60 p-5 justify-between">
        <div className="space-y-8">
          <div className="flex items-center px-2 py-4">
            <Logo className="w-14 h-14" showText={true} />
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => <NavButton key={item.key} item={item} />)}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brandBlue-900/40 border border-brandBlue-700/30 flex items-center justify-center text-brandBlue-300 text-sm font-bold">
              {initials}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-foreground truncate max-w-[130px]">{customerName}</span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Verified Customer</span>
            </div>
          </div>
          <div className="p-1.5 bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 rounded-lg" title="Session secure">
            <ShieldCheck weight="duotone" className="w-4 h-4" />
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
          <aside className="w-72 bg-secondary border-r border-border p-5 flex flex-col justify-between animate-slideRight">
            <div className="space-y-8">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <Logo className="w-12 h-12" showText={true} />
                <button
                  onClick={() => setSidebar(false)}
                  className="p-1.5 bg-secondary hover:bg-slate-700 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  <X weight="duotone" className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => <NavButton key={item.key} item={item} onClick={() => setSidebar(false)} />)}
              </nav>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brandBlue-900/40 border border-brandBlue-700/30 flex items-center justify-center text-brandBlue-300 text-xs font-bold">
                  {initials}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{customerName}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold">Verified Customer</span>
                </div>
              </div>
              <div className="p-1 px-2 bg-emerald-950 text-emerald-400 text-[10px] rounded border border-emerald-800/30">Secure</div>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSidebar(false)} />
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-16 shrink-0 glass-panel border-b border-slate-900/60 px-6 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebar(true)}
              className="lg:hidden p-1.5 bg-secondary border border-border hover:bg-slate-850 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <List weight="duotone" className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-semibold bg-background px-3 py-1.5 rounded-lg border border-slate-900/50">
              <CalendarBlank weight="duotone" className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative p-2 hover:bg-secondary rounded-xl border border-slate-900/60 text-muted-foreground hover:text-foreground transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun weight="duotone" className="w-4 h-4" /> : <Moon weight="duotone" className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setPage('orders')}
              className="relative p-2 hover:bg-secondary rounded-xl border border-slate-900/60 text-muted-foreground hover:text-foreground transition-all"
            >
              <Bell weight="duotone" className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-muted-foreground text-[10px]">TTP-SERVER: ACTIVE</span>
            </div>

            <button
              onClick={onLogout}
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {page === 'dashboard' && (
            <CustomerOverview
              customerName={customerName}
              customerContact={customerContact}
              transactions={transactions}
              parts={parts}
              inquiries={inquiries}
              setPage={setPage}
            />
          )}
          {page === 'shop' && (
            <ShopParts
              customerName={customerName}
              customerContact={customerContact}
              parts={parts}
              onCheckout={onCheckout}
              onAddLog={onAddLog}
            />
          )}
          {page === 'orders' && (
            <MyOrders customerName={customerName} transactions={transactions} />
          )}
          {page === 'quote' && (
            <RequestQuote
              customerName={customerName}
              parts={parts}
              inquiries={inquiries}
              setInquiries={setInquiries}
              onAddLog={onAddLog}
            />
          )}
          {page === 'settings' && (
            <SettingsPage customerEmail={transactions.length > 0 ? transactions[0].customerEmail || 'demo@example.com' : 'demo@example.com'} />
          )}
        </main>
        <Footer className="px-6" />
      </div>
    </div>
  );
}

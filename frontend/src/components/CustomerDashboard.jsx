import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  FileText, 
  Clock, 
  Send, 
  Download, 
  CheckCircle2, 
  Package, 
  TrendingUp, 
  Sparkles, 
  Phone,
  HelpCircle,
  Truck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function CustomerDashboard({ 
  customerName = "Batangas Freight Logistics",
  customerContact = "0917-555-0192",
  transactions = [],
  parts = [],
  onAddLog 
}) {
  // Filter transactions for this customer
  const customerTx = transactions.filter(
    tx => tx.customerName.toLowerCase() === customerName.toLowerCase()
  );

  // Stats calculation
  const totalOrders = customerTx.length;
  const totalSpent = customerTx.reduce((sum, tx) => sum + tx.total, 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Inquiries local state (persists as long as App is open if we want, or local)
  const [inquiries, setInquiries] = useState([
    {
      id: "INQ-101",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      partName: "Starter Motor Assembly (24V 4.5KW)",
      quantity: 5,
      message: "Need custom volume pricing for fleet maintenance.",
      status: "Responded"
    }
  ]);

  // Inquiry form states
  const [selectedPartId, setSelectedPartId] = useState('');
  const [inquiryQty, setInquiryQty] = useState('1');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [showInquirySuccess, setShowInquirySuccess] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    if (!selectedPartId) {
      alert("Please select a part from the list!");
      return;
    }

    const selectedPart = parts.find(p => p.id === selectedPartId);
    if (!selectedPart) return;

    const qty = parseInt(inquiryQty) || 1;
    const newInq = {
      id: `INQ-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      partName: selectedPart.name,
      quantity: qty,
      message: inquiryMsg || "Requested price quote.",
      status: "Pending"
    };

    setInquiries(prev => [newInq, ...prev]);
    
    // Log activity at application level
    if (onAddLog) {
      onAddLog('system', `Quote request ${newInq.id} submitted by '${customerName}' for ${qty}x ${selectedPart.name}.`);
    }

    setSubmittedInquiry(newInq);
    setShowInquirySuccess(true);

    // Reset Form
    setSelectedPartId('');
    setInquiryQty('1');
    setInquiryMsg('');
  };

  // PDF receipt compilation
  const handleDownloadPDF = (tx) => {
    if (!tx) return;

    try {
      const doc = new jsPDF();

      // Top color bands
      doc.setFillColor(27, 54, 93); // Navy Blue Brand Header
      doc.rect(0, 0, 210, 40, 'F');
      
      // Secondary red band
      doc.setFillColor(220, 38, 38); // Crimson Red
      doc.rect(0, 40, 210, 3, 'F');

      // Title & Logo Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TARLAC TRUCK PARTS", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Quality Truck Accessories & Spare Parts Wholesale & Retail", 15, 27);
      doc.text("Tarlac City, Philippines | Contact: 0917-XXX-XXXX", 15, 33);

      // Invoice metadata
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SALES INVOICE (DUPLICATE)", 130, 18);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${tx.invoiceNumber}`, 130, 24);
      doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, 130, 30);

      // Customer Info Panel
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10.5);
      doc.setFont("Helvetica", "bold");
      doc.text("BILL TO / CUSTOMER INFO:", 15, 56);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Customer Name: ${tx.customerName}`, 15, 62);
      doc.text(`Contact Phone: ${tx.customerContact}`, 15, 68);

      // Generate Table rows
      const tableRows = tx.items.map((item, index) => [
        index + 1,
        item.name,
        `PHP ${item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        item.quantity,
        `PHP ${(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
      ]);

      doc.autoTable({
        startY: 76,
        head: [['#', 'Part Description', 'Unit Price', 'Qty', 'Total']],
        body: tableRows,
        headStyles: { 
          fillColor: [27, 54, 93], 
          textColor: [255, 255, 255], 
          fontSize: 9.5, 
          fontStyle: 'bold', 
          halign: 'left' 
        },
        bodyStyles: { 
          fontSize: 9, 
          textColor: [33, 41, 54] 
        },
        alternateRowStyles: { 
          fillColor: [247, 249, 252] 
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 100 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 }
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      // Financial breakdown values
      const finalY = doc.lastAutoTable.finalY + 8;
      
      doc.setFontSize(9.5);
      doc.setFont("Helvetica", "normal");
      doc.text("Subtotal:", 130, finalY);
      doc.text(`PHP ${tx.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 195, finalY, { align: 'right' });

      doc.text("Discount Deductions:", 130, finalY + 5.5);
      doc.text(`- PHP ${tx.discount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 195, finalY + 5.5, { align: 'right' });

      doc.text("VAT Amount (12%):", 130, finalY + 11);
      doc.text(`PHP ${tx.taxAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 195, finalY + 11, { align: 'right' });

      // Highlight Box for Total
      doc.setFillColor(27, 54, 93);
      doc.rect(128, finalY + 15, 68, 7.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.text("NET TOTAL:", 131, finalY + 20);
      doc.text(`PHP ${tx.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 193, finalY + 20, { align: 'right' });

      // Terms of Sales footer
      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text("Thank you for your business!", 105, finalY + 36, { align: 'center' });
      doc.text("Return Policy: Exchange is only valid within 7 days with this sales invoice.", 105, finalY + 41, { align: 'center' });

      doc.save(`Invoice_${tx.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("Error creating pdf invoice: ", error);
      alert("Error printing PDF: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-brandBlue-500">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-outfit">
            Welcome, {customerName}
          </h1>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
            Review your purchase analytics, download duplicate invoice receipts, and request wholesale parts quotes directly from our warehouse team.
          </p>
        </div>

        {/* Profile Card Summary */}
        <div className="flex items-center gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 shadow-md">
          <div className="w-12 h-12 rounded-full bg-brandBlue-900/30 border border-brandBlue-700/30 flex items-center justify-center text-brandBlue-400 font-bold text-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300">Client Details</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Phone: {customerContact}</div>
            <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/30 text-amber-400 text-[9px] font-extrabold">
              <Sparkles className="w-2.5 h-2.5" /> VIP Wholesale Partner
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Orders */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-brandBlue-500 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchased Invoices</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">{totalOrders}</h3>
            <p className="text-[10px] text-slate-500">Completed shipments</p>
          </div>
          <div className="p-3 bg-brandBlue-900/40 text-brandBlue-400 rounded-xl border border-brandBlue-700/30">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-emerald-500/30 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">
              ₱{totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> Direct wholesale pricing
            </p>
          </div>
          <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Average Order Size */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-indigo-500/30 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Invoice</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">
              ₱{avgOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-500">Value per checkout</p>
          </div>
          <div className="p-3 bg-indigo-950/40 text-indigo-400 rounded-xl border border-indigo-800/30">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Active Quote Requests */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-accent/50 transition-all duration-300">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Inquiries</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">{inquiries.length}</h3>
            <p className="text-[10px] text-slate-500">Parts quote requests</p>
          </div>
          <div className="p-3 bg-accent/15 text-accent rounded-xl border border-accent/20">
            <HelpCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Split Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Order Invoices & Inquiry Lists */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order history block */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-outfit">My Purchase History</h3>
                <p className="text-xs text-slate-400">Historical records of all parts orders processed under your company.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {customerTx.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No purchase records found. Check outs placed at the counter will display here.
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-xs font-semibold uppercase border-b border-slate-800/80">
                      <th className="py-3 px-3">Invoice No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Purchased Parts</th>
                      <th className="py-3 px-3 text-right">Total Price</th>
                      <th className="py-3 px-3 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {customerTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-200 font-bold">{tx.invoiceNumber}</td>
                        <td className="py-3.5 px-3 text-xs text-slate-400">
                          {new Date(tx.transactionDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-300 max-w-[200px] truncate">
                          {tx.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                        </td>
                        <td className="py-3.5 px-3 text-right font-semibold text-white">
                          ₱{tx.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => handleDownloadPDF(tx)}
                            className="p-1.5 hover:bg-emerald-950/40 text-emerald-400 border border-transparent hover:border-emerald-800/30 rounded-lg transition-all"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Submitted inquiries tracking */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Clock className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-lg font-bold text-white font-outfit">Parts Quote Requests & Inquiries</h3>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {inquiries.map((inq) => {
                const isResponded = inq.status === "Responded";
                return (
                  <div key={inq.id} className="flex justify-between items-center p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-slate-700/60 transition-all">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{inq.partName}</span>
                        <span className="px-1.5 py-0.2 bg-slate-950 font-mono text-[9px] text-slate-400 rounded">Qty: {inq.quantity}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">"{inq.message}"</p>
                      <span className="text-[9px] text-slate-500 font-mono">Sent: {new Date(inq.date).toLocaleString()}</span>
                    </div>

                    <div className="shrink-0 pl-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isResponded 
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/30' 
                          : 'bg-amber-950/30 text-amber-500 border-amber-800/30 animate-pulse'
                      }`}>
                        {inq.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Parts Inquiry Request Form */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <form onSubmit={handleInquirySubmit} className="flex flex-col h-full justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Send className="w-5 h-5 text-brandBlue-400" />
                <h3 className="text-lg font-bold text-white font-outfit">Quick Quote Request</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Need wholesale supply or custom parts? Select a catalog component below to request a special volume discount quote.
              </p>

              <div className="space-y-3 pt-2">
                {/* Part Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Catalog Part *</label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-slate-200"
                  >
                    <option value="" disabled>-- Select Truck Component --</option>
                    {parts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inquiryQty}
                    onChange={(e) => setInquiryQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-slate-200"
                  />
                </div>

                {/* Inquiry details */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes & Special Instructions</label>
                  <textarea
                    placeholder="Provide details such as transport timeline, packaging preference, or fleet requirements..."
                    rows="4"
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-slate-200 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-brandBlue-900 hover:bg-brandBlue-800 text-brandBlue-100 font-bold rounded-xl text-xs transition-all shadow-md shadow-brandBlue-950/20 border border-brandBlue-700/45 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Inquiry to Warehouse
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Inquiry Success Modal Overlay */}
      {showInquirySuccess && submittedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 text-center animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-outfit">Inquiry Received!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your quote inquiry **{submittedInquiry.id}** was successfully submitted. The warehouse operations crew has been alerted.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl text-left border border-slate-850 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Component:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{submittedInquiry.partName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity:</span>
                <span className="text-slate-300 font-bold">{submittedInquiry.quantity} pcs</span>
              </div>
            </div>

            <button 
              onClick={() => setShowInquirySuccess(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

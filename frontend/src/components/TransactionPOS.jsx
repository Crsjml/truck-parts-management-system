import React, { useState } from 'react';
import { MagnifyingGlass, ShoppingCart, Trash, Plus, Minus, User, Phone, Tag, Download, CheckCircle, X, CreditCard, FileCsv } from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function TransactionPOS({ parts, onCheckout }) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [discount, setDiscount] = useState('');
  
  // Checkout success details
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  // MagnifyingGlass logic for left column
  const filteredParts = parts.filter(part => {
    const term = search.toLowerCase();
    return (
      part.name.toLowerCase().includes(term) ||
      part.sku.toLowerCase().includes(term) ||
      part.oem.toLowerCase().includes(term)
    ) && part.stock > 0; // only show items that are in stock
  });

  const addToCart = (part) => {
    const existing = cart.find(item => item.id === part.id);
    
    if (existing) {
      if (existing.quantity >= part.stock) {
        alert(`Cannot add more. Only ${part.stock} units of ${part.name} are available in stock.`);
        return;
      }
      setCart(cart.map(item => 
        item.id === part.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...part, quantity: 1 }]);
    }
  };

  const updateQuantity = (partId, delta) => {
    const item = cart.find(i => i.id === partId);
    if (!item) return;

    const target = parts.find(p => p.id === partId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      removeFromCart(partId);
      return;
    }

    if (target && newQty > target.stock) {
      alert(`Cannot exceed available stock (${target.stock} units).`);
      return;
    }

    setCart(cart.map(i => i.id === partId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (partId) => {
    setCart(cart.filter(item => item.id !== partId));
  };

  // Financial values
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountVal = parseFloat(discount) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  
  // VAT Calculations (12% inclusive or exclusive? Let's make it 12% VAT amount)
  const taxAmount = taxableAmount * 0.12;
  const total = taxableAmount + taxAmount;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    // Generate invoice sequence
    const invoiceNum = `TTP-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const txData = {
      invoiceNumber: invoiceNum,
      customerName: customerName || 'Walk-in Customer',
      customerContact: customerContact || 'N/A',
      items: cart.map(item => ({
        partId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      discount: discountVal,
      tax: 12,
      subtotal,
      taxAmount,
      total,
      transactionDate: new Date().toISOString()
    };

    // Callback to App state
    onCheckout(txData);
    
    // Set success modal states
    setLastTx(txData);
    setCheckoutSuccess(true);

    // Clear cart
    setCart([]);
    setCustomerName('');
    setCustomerContact('');
    setDiscount('');
  };

  // PDF Download Trigger
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
      doc.text("SALES INVOICE", 145, 18);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${tx.invoiceNumber}`, 145, 24);
      doc.text(`Date: ${new Date(tx.transactionDate).toLocaleString('en-US')}`, 145, 30);

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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
      {/* Left Column: Fast Item Adder */}
      <div className="xl:col-span-2 glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-lg font-bold text-foreground font-display">Select Catalog Items</h3>
            <span className="text-xs text-muted-foreground">Click a part card to add it to the transaction.</span>
          </div>

          <div className="relative">
            <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter list by part name, SKU, or OEM No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground"
            />
          </div>

          {/* Quick list of items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
            {filteredParts.map(part => {
              const cartItem = cart.find(item => item.id === part.id);
              const remaining = part.stock - (cartItem ? cartItem.quantity : 0);

              return (
                <div 
                  key={part.id}
                  onClick={() => remaining > 0 && addToCart(part)}
                  className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center group ${
                    remaining > 0 
                      ? 'bg-secondary border-border hover:border-red-600/40 hover:bg-secondary cursor-pointer' 
                      : 'bg-background border-slate-900 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <span className="text-[9px] font-bold text-brandBlue-400 uppercase tracking-widest">{part.category}</span>
                    <h5 className="font-bold text-foreground text-xs truncate group-hover:text-foreground transition-colors">{part.name}</h5>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">SKU: {part.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-foreground block">₱{part.price.toLocaleString('en-PH')}</span>
                    <span className={`text-[10px] ${remaining <= 3 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                      {remaining > 0 ? `${remaining} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Checkout Cart */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
        <form onSubmit={handleCheckoutSubmit} className="flex flex-col h-full justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <ShoppingCart weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-bold text-foreground font-display">Active Cart</h3>
              {cart.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-950 text-red-400 text-xs font-extrabold border border-red-800/35">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
                </span>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <ShoppingCart weight="duotone" className="w-8 h-8 mx-auto opacity-30 text-muted-foreground" />
                <p className="text-xs">Your transaction cart is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-secondary p-3 rounded-xl border border-border">
                    <div className="space-y-1 max-w-[60%]">
                      <h6 className="font-semibold text-foreground text-xs truncate">{item.name}</h6>
                      <span className="text-[10px] text-muted-foreground font-mono">₱{item.price.toLocaleString('en-PH')} / unit</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Qty selectors */}
                      <div className="flex items-center gap-1.5 bg-background rounded-lg p-1 border border-border">
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

                      {/* Remove button */}
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

            {/* Customer Details Segment */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Customer Info</span>
              <div className="space-y-2.5">
                <div className="relative">
                  <User weight="duotone" className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground placeholder-slate-600"
                  />
                </div>
                <div className="relative">
                  <Phone weight="duotone" className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Contact Number (optional)"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground placeholder-slate-600"
                  />
                </div>
                <div className="relative">
                  <Tag weight="duotone" className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Discount Deductibles (₱)"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground placeholder-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Ledger and Checkout Button */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>- ₱{discountVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT (12%)</span>
                <span>₱{taxAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2.5">
                <span>Grand Total</span>
                <span className="text-red-500 font-extrabold">₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-3 px-4 bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none disabled:border-border text-white font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
            >
              <CreditCard weight="duotone" className="w-4.5 h-4.5" />
              Process Sales Checkout
            </button>
          </div>
        </form>
      </div>

      {/* Checkout Success Modal Overlay */}
      {checkoutSuccess && lastTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background backdrop-blur-sm">
          <div className="w-full max-w-md bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 text-center animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle weight="duotone" className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground font-display">Transaction Processed!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sales details successfully logged in the ledger. Stock inventory counts updated.
              </p>
            </div>

            <div className="bg-background p-4 rounded-xl text-left border border-slate-850 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice No:</span>
                <span className="text-foreground font-semibold">{lastTx.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="text-foreground font-semibold">{lastTx.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grand Total:</span>
                <span className="text-emerald-400 font-bold">₱{lastTx.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleDownloadPDF(lastTx)}
                className="flex items-center justify-center gap-1.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-700/20"
              >
                <Download weight="duotone" className="w-4 h-4" /> Download PDF
              </button>
              <button 
                onClick={() => setCheckoutSuccess(false)}
                className="py-3 px-4 bg-secondary hover:bg-slate-700 border border-border text-muted-foreground font-bold rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

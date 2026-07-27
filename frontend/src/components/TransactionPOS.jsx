import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { CheckCircle, Download } from '@phosphor-icons/react';
import { lookupCustomers, verifyOverridePin } from '../authStore';
import PosCatalogPanel from './pos/PosCatalogPanel';
import PosCart from './pos/PosCart';
import PosCheckoutModal from './pos/PosCheckoutModal';
import PosShortcutLegend from './pos/PosShortcutLegend';
import { buildInvoicePdf } from '../utils/invoicePdf';

const VAT_RATE = 0.12;

export default function TransactionPOS({ parts, onCheckout }) {
  const { formatCurrency, displayCurrency } = useSettings();

  const [cart, setCart] = useState([]);
  const [warning, setWarning] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastTx, setLastTx] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const searchInputRef = useRef(null);

  // Warnings are transient — they must never persist into the next customer.
  useEffect(() => {
    if (!warning) return;
    const timer = setTimeout(() => setWarning(null), 4000);
    return () => clearTimeout(timer);
  }, [warning]);

  const availableFor = useCallback(
    (partId) => {
      const part = parts.find((p) => p.id === partId);
      return part ? part.stock - (part.reservedStock || 0) : 0;
    },
    [parts]
  );

  const addToCart = useCallback(
    (part) => {
      const available = part.stock - (part.reservedStock || 0);
      setCart((prev) => {
        const existing = prev.find((i) => i.id === part.id);
        if (!existing) return [...prev, { ...part, quantity: 1 }];

        if (existing.quantity >= available) {
          setWarning(`Only ${available} of ${part.name} available — all are already in the cart.`);
          return prev;
        }
        return prev.map((i) => (i.id === part.id ? { ...i, quantity: i.quantity + 1 } : i));
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (partId, delta) => {
      setCart((prev) => {
        const item = prev.find((i) => i.id === partId);
        if (!item) return prev;

        const next = item.quantity + delta;
        if (next <= 0) return prev.filter((i) => i.id !== partId);

        const available = availableFor(partId);
        if (next > available) {
          setWarning(`Only ${available} of ${item.name} in stock — selling ${available}.`);
          return prev.map((i) => (i.id === partId ? { ...i, quantity: available } : i));
        }
        return prev.map((i) => (i.id === partId ? { ...i, quantity: next } : i));
      });
    },
    [availableFor]
  );

  const removeFromCart = useCallback((partId) => {
    setCart((prev) => prev.filter((i) => i.id !== partId));
  }, []);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = subtotal * VAT_RATE;
  const total = subtotal + taxAmount;

  const handleLookup = useCallback(async (term) => {
    const result = await lookupCustomers(term);
    return result.ok ? result.results : [];
  }, []);

  const handleVerifyPin = useCallback(async (pin) => {
    const result = await verifyOverridePin(pin);
    return result.valid;
  }, []);

  const handleConfirmSale = async (payment) => {
    if (submitting) return;
    setSubmitting(true);

    const discountVal = Math.min(Number(payment.discount) || 0, subtotal);
    const taxable = Math.max(0, subtotal - discountVal);
    const finalTax = taxable * VAT_RATE;
    const finalTotal = taxable + finalTax;

    const txData = {
      invoiceNumber: `TTP-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: new Date().toISOString(),
      status: 'COMPLETED',
      customerName: payment.customerName,
      customerContact: payment.customerContact,
      customerEmail: payment.customerEmail,
      items: cart.map((i) => ({
        partId: i.id,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        price: i.price
      })),
      subtotal,
      discount: discountVal,
      tax: 12,
      taxAmount: finalTax,
      total: finalTotal,
      paymentMethod: payment.paymentMethod,
      amountTendered: payment.amountTendered,
      changeGiven: payment.changeGiven,
      chequeNumber: payment.chequeNumber,
      chequeBank: payment.chequeBank,
      chequeDate: payment.chequeDate
    };

    const ok = await onCheckout(txData);
    setSubmitting(false);
    if (!ok) {
      setWarning('Sale could not be completed. Nothing was charged — check stock and try again.');
      return;
    }

    setLastTx(txData);
    setCheckoutOpen(false);
    setCart([]);
  };

  // Shortcuts. Bound at document level because focus may sit anywhere in the panel.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0 && !lastTx) setCheckoutOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (lastTx) setLastTx(null);
        else if (checkoutOpen) setCheckoutOpen(false);
        else setCart([]);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cart.length, checkoutOpen, lastTx]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <PosShortcutLegend />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">
        <div className="xl:col-span-3">
          <PosCatalogPanel
            parts={parts}
            cart={cart}
            onAddToCart={addToCart}
            formatCurrency={formatCurrency}
            searchInputRef={searchInputRef}
          />
        </div>

        <div className="xl:col-span-2">
          <PosCart
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onCheckout={() => setCheckoutOpen(true)}
            subtotal={subtotal}
            discount={0}
            taxAmount={taxAmount}
            total={total}
            formatCurrency={formatCurrency}
            warning={warning}
          />
        </div>
      </div>

      {checkoutOpen && (
        <PosCheckoutModal
          subtotal={subtotal}
          total={total}
          formatCurrency={formatCurrency}
          onCancel={() => setCheckoutOpen(false)}
          onConfirm={handleConfirmSale}
          onLookup={handleLookup}
          onVerifyPin={handleVerifyPin}
        />
      )}

      {lastTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="pos-success-heading"
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20">
              <CheckCircle weight="duotone" className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h3 id="pos-success-heading" className="text-xl font-bold text-foreground font-display">Sale complete</h3>
              <p className="text-sm text-muted-foreground">Stock deducted and the invoice is logged.</p>
            </div>

            <dl className="bg-secondary p-4 rounded-xl text-left border border-border text-sm space-y-1.5 font-mono">
              <div className="flex justify-between"><dt className="text-muted-foreground">Invoice</dt><dd className="font-bold text-foreground">{lastTx.invoiceNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Customer</dt><dd className="font-bold text-foreground">{lastTx.customerName}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-bold text-foreground">{formatCurrency(lastTx.total)}</dd></div>
              {lastTx.changeGiven != null && lastTx.changeGiven > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Change</dt><dd className="font-bold text-emerald-500">{formatCurrency(lastTx.changeGiven)}</dd></div>
              )}
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => buildInvoicePdf(lastTx, { formatCurrency, displayCurrency })}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:bg-background transition-colors"
              >
                <Download weight="bold" className="w-4 h-4" /> Invoice PDF
              </button>
              <button
                type="button"
                onClick={() => setLastTx(null)}
                className="py-3 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-bold transition-colors"
              >
                Next customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

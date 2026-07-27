import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { CheckCircle, Download } from '@phosphor-icons/react';
import { lookupCustomers, verifyOverridePin } from '../authStore';
import PosCatalogPanel from './pos/PosCatalogPanel';
import PosCart from './pos/PosCart';
import PosCheckoutPane from './pos/PosCheckoutPane';
import PosShortcutLegend from './pos/PosShortcutLegend';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { toSellingPrice, computePosTotals, VAT_RATE } from '../utils/posMoney';

export default function TransactionPOS({ parts, onCheckout }) {
  const { formatBaseCurrency, formatCurrency, displayCurrency, markupFactor = 1 } = useSettings();

  const [cart, setCart] = useState([]);
  const [warning, setWarning] = useState(null);
  const [mode, setMode] = useState('cart'); // 'cart' | 'checkout'
  const [lastTx, setLastTx] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);

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
        if (!existing) {
          return [...prev, { ...part, price: toSellingPrice(part.price, markupFactor), quantity: 1 }];
        }

        if (existing.quantity >= available) {
          setWarning(`Only ${available} of ${part.name} available — all are already in the cart.`);
          return prev;
        }
        return prev.map((i) => (i.id === part.id ? { ...i, quantity: i.quantity + 1 } : i));
      });
    },
    [markupFactor]
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

  const totals = useMemo(
    () => computePosTotals({ cart, discount, vatRate: VAT_RATE }),
    [cart, discount]
  );

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

    const discountVal = Math.min(Number(discount) || 0, totals.lineSum);
    const finalTotals = computePosTotals({ cart, discount: discountVal, vatRate: VAT_RATE });

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
      subtotal: finalTotals.vatableSale,
      discount: finalTotals.discount,
      tax: 12,
      taxAmount: finalTotals.vatAmount,
      total: finalTotals.total,
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
    setCart([]);
    setDiscount(0);
    setMode('cart');
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
        if (cart.length > 0 && !lastTx) setMode('checkout');
        return;
      }
      if (e.key === 'Escape') {
        if (lastTx) setLastTx(null);
        else if (mode === 'checkout') setMode('cart');
        else setCart([]);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cart.length, mode, lastTx]);

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
          {mode === 'checkout' ? (
            <PosCheckoutPane
              totals={totals}
              formatCurrency={formatBaseCurrency}
              onBack={() => setMode('cart')}
              onConfirm={handleConfirmSale}
              onLookup={handleLookup}
              onVerifyPin={handleVerifyPin}
              onDiscountChange={setDiscount}
              submitting={submitting}
            />
          ) : (
            <PosCart
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              onCheckout={() => setMode('checkout')}
              totals={totals}
              formatCurrency={formatBaseCurrency}
              warning={warning}
            />
          )}
        </div>
      </div>

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
              <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-bold text-foreground">{formatBaseCurrency(lastTx.total)}</dd></div>
              {lastTx.changeGiven != null && lastTx.changeGiven > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Change</dt><dd className="font-bold text-emerald-500">{formatBaseCurrency(lastTx.changeGiven)}</dd></div>
              )}
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => buildInvoicePdf(lastTx, { formatCurrency: formatBaseCurrency, displayCurrency })}
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

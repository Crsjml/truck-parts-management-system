import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { lookupCustomers, verifyOverridePin } from '../authStore';
import PosCatalogPanel from './pos/PosCatalogPanel';
import PosCart from './pos/PosCart';
import PosCheckoutPane from './pos/PosCheckoutPane';
import PosSaleComplete from './pos/PosSaleComplete';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const posContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fullscreen sync handler
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      posContainerRef.current?.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Warnings are persistent until dismissed or the transaction is cleared.
  useEffect(() => {
    if (cart.length === 0) setWarning(null);
  }, [cart.length]);

  const availableFor = useCallback(
    (partId) => {
      const part = parts.find((p) => p.id === partId);
      return part ? part.stock - (part.reservedStock || 0) : 0;
    },
    [parts]
  );

  const addToCart = useCallback(
    (part) => {
      setLastTx(null);
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
      chequeDate: payment.chequeDate,
      gcashReference: payment.gcashReference
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

  const pressable = 'transition-transform duration-150 ease-out active:scale-[0.97]';

  return (
    <div
      ref={posContainerRef}
      className={`space-y-4 animate-fadeIn flex flex-col ${
        isFullscreen ? 'bg-background p-6 h-screen w-screen fixed inset-0 z-50' : ''
      }`}
    >
      {/* Shell Action Bar / Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Register POS</span>
          <span className="px-2 py-0.5 text-2xs font-bold rounded-md bg-secondary border border-border text-foreground">
            Counter Kiosk
          </span>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle Fullscreen Mode"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary text-xs font-bold text-foreground hover:bg-secondary/80 ${pressable}`}
        >
          {isFullscreen ? (
            <>
              <ArrowsIn weight="bold" className="w-4 h-4" /> Exit Fullscreen
            </>
          ) : (
            <>
              <ArrowsOut weight="bold" className="w-4 h-4" /> Fullscreen Mode
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch flex-1 min-h-0">
        <div className="xl:col-span-3 h-full min-h-0">
          <PosCatalogPanel
            parts={parts}
            cart={cart}
            onAddToCart={addToCart}
            formatCurrency={formatCurrency}
            searchInputRef={searchInputRef}
          />
        </div>

        <div className="xl:col-span-2 flex flex-col gap-4 h-full min-h-0">
          {lastTx && (
            <PosSaleComplete
              tx={lastTx}
              formatCurrency={formatBaseCurrency}
              onDismiss={() => setLastTx(null)}
              onDownloadInvoice={() => buildInvoicePdf(lastTx, { formatCurrency: formatBaseCurrency, displayCurrency })}
            />
          )}
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
              onDismissWarning={() => setWarning(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

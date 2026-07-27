import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, User, Phone, EnvelopeSimple, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

const METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { id: 'CARD', label: 'Card' },
  { id: 'CHEQUE', label: 'Cheque' }
];

export default function PosCheckoutModal({
  subtotal,
  total,
  formatCurrency,
  onCancel,
  onConfirm,
  onLookup,
  onVerifyPin
}) {
  const [step, setStep] = useState('customer');

  const [lookupTerm, setLookupTerm] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [matchedCustomer, setMatchedCustomer] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tendered, setTendered] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  const [discount, setDiscount] = useState('');
  const [pin, setPin] = useState('');
  const [discountUnlocked, setDiscountUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  const firstFieldRef = useRef(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, [step]);

  // Debounced repeat-buyer lookup.
  useEffect(() => {
    if (lookupTerm.trim().length < 3) {
      setLookupResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await onLookup(lookupTerm.trim());
      if (!cancelled) setLookupResults(results || []);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [lookupTerm, onLookup]);

  const applyCustomer = (c) => {
    setCustomerName(c.customerName);
    setCustomerContact(c.customerContact);
    setCustomerEmail(c.customerEmail || '');
    setMatchedCustomer(c);
    setLookupResults([]);
    setLookupTerm('');
  };

  const customerComplete =
    customerName.trim() !== '' && customerContact.trim() !== '' && customerEmail.trim() !== '';

  const discountValue = discountUnlocked ? Math.min(Number(discount) || 0, subtotal) : 0;
  const tenderedValue = Number(tendered) || 0;
  const changeGiven = paymentMethod === 'CASH' ? Math.max(0, tenderedValue - total) : null;

  const paymentComplete =
    paymentMethod === 'CASH'
      ? tenderedValue >= total
      : paymentMethod === 'CHEQUE'
        ? chequeNumber.trim() !== '' && chequeBank.trim() !== '' && chequeDate !== ''
        : true;

  const handleUnlockDiscount = async () => {
    setPinError('');
    const ok = await onVerifyPin(pin);
    if (ok) {
      setDiscountUnlocked(true);
      setPin('');
    } else {
      setPinError('Incorrect PIN.');
    }
  };

  const handleConfirm = () => {
    onConfirm({
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      customerEmail: customerEmail.trim(),
      discount: discountValue,
      paymentMethod,
      amountTendered: paymentMethod === 'CASH' ? tenderedValue : null,
      changeGiven,
      chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber.trim() : null,
      chequeBank: paymentMethod === 'CHEQUE' ? chequeBank.trim() : null,
      chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : null
    });
  };

  const inputClass =
    'w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-checkout-heading"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            {step === 'payment' && (
              <button
                type="button"
                onClick={() => setStep('customer')}
                aria-label="Back to customer details"
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft weight="bold" className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 id="pos-checkout-heading" className="text-lg font-bold text-foreground font-display">
                {step === 'customer' ? 'Customer Details' : 'Payment'}
              </h2>
              <p className="text-xs text-muted-foreground">Step {step === 'customer' ? '1' : '2'} of 2</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-right">
              <span className="block text-2xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="block text-xl font-extrabold text-foreground font-mono">{formatCurrency(total)}</span>
            </p>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel checkout"
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step 1 — Customer */}
        {step === 'customer' && (
          <div className="p-6 space-y-5">
            <div>
              <label htmlFor="pos-lookup" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Find returning customer
              </label>
              <div className="relative">
                <MagnifyingGlass weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={firstFieldRef}
                  id="pos-lookup"
                  type="text"
                  aria-label="Find returning customer by phone, name or email"
                  placeholder="Phone, name, or email…"
                  value={lookupTerm}
                  onChange={(e) => setLookupTerm(e.target.value)}
                  className={inputClass}
                />
              </div>

              {lookupResults.length > 0 && (
                <ul className="mt-2 space-y-1.5 border border-border rounded-xl p-2 bg-secondary">
                  {lookupResults.map((c) => (
                    <li key={c.customerContact}>
                      <button
                        type="button"
                        onClick={() => applyCustomer(c)}
                        aria-label={`Use ${c.customerName}`}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-background transition-colors"
                      >
                        <span className="block text-sm font-bold text-foreground">{c.customerName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.customerContact} · {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'} · last {new Date(c.lastOrderDate).toLocaleDateString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {matchedCustomer && (
              <p className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
                Returning customer — {matchedCustomer.orderCount} previous orders, last on{' '}
                {new Date(matchedCustomer.lastOrderDate).toLocaleDateString()}.
              </p>
            )}

            <div className="space-y-3 pt-1 border-t border-border">
              <div className="relative">
                <label htmlFor="pos-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-4">
                  Customer name
                </label>
                <User weight="bold" className="absolute left-4 top-[3.05rem] w-4 h-4 text-muted-foreground pointer-events-none" />
                <input id="pos-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
              </div>

              <div className="relative">
                <label htmlFor="pos-contact" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Contact number
                </label>
                <Phone weight="bold" className="absolute left-4 top-[2.6rem] w-4 h-4 text-muted-foreground pointer-events-none" />
                <input id="pos-contact" type="tel" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className={inputClass} />
              </div>

              <div className="relative">
                <label htmlFor="pos-email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Email
                </label>
                <EnvelopeSimple weight="bold" className="absolute left-4 top-[2.6rem] w-4 h-4 text-muted-foreground pointer-events-none" />
                <input id="pos-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} />
              </div>

              <p className="text-xs text-muted-foreground">
                All three are required so this customer can be recognised on their next visit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep('payment')}
              disabled={!customerComplete}
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground text-white text-base font-bold transition-colors"
            >
              Continue to payment
            </button>
          </div>
        )}

        {/* Step 2 — Payment */}
        {step === 'payment' && (
          <div className="p-6 space-y-5">
            <fieldset>
              <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment method</legend>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === m.id
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-accent/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pos-payment-method"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="accent-current"
                    />
                    <span className="text-sm font-bold">{m.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <label htmlFor="pos-tendered" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Amount tendered
                </label>
                <input
                  id="pos-tendered"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-2xl font-mono font-bold text-foreground focus:outline-none focus:border-accent transition-colors"
                />

                <div className="flex gap-2">
                  {[500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTendered(String(amt))}
                      className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:border-accent/40 transition-colors"
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTendered(String(total))}
                    className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:border-accent/40 transition-colors"
                  >
                    Exact
                  </button>
                </div>

                <div className="flex items-baseline justify-between px-4 py-3 rounded-xl bg-secondary border border-border">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Change due</span>
                  <span
                    data-testid="change-due"
                    className={`text-2xl font-extrabold font-mono ${tenderedValue >= total ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  >
                    {formatCurrency(changeGiven || 0)}
                  </span>
                </div>

                {tenderedValue > 0 && tenderedValue < total && (
                  <p role="status" className="text-xs font-semibold text-amber-500">
                    Short by {formatCurrency(total - tenderedValue)}.
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'CHEQUE' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="pos-cheque-no" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Cheque number
                  </label>
                  <input id="pos-cheque-no" type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label htmlFor="pos-cheque-bank" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Bank
                  </label>
                  <input id="pos-cheque-bank" type="text" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label htmlFor="pos-cheque-date" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Cheque date
                  </label>
                  <input id="pos-cheque-date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:border-accent transition-colors" />
                </div>
              </div>
            )}

            {/* Discount — PIN gated */}
            <div className="pt-4 border-t border-border space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount</span>

              {!discountUnlocked ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      aria-label="Supervisor override PIN"
                      placeholder="Supervisor PIN to apply a discount"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-base text-foreground focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleUnlockDiscount}
                      disabled={pin.length < 4}
                      className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      Unlock
                    </button>
                  </div>
                  {pinError && <p role="alert" className="text-xs font-semibold text-red-500">{pinError}</p>}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.01"
                    aria-label="Discount amount"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-base font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Capped at the subtotal, {formatCurrency(subtotal)}. Applying {formatCurrency(discountValue)}.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!paymentComplete}
              className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground text-white text-base font-bold transition-colors"
            >
              Complete sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

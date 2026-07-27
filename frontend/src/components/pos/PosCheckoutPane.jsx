import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, User, Phone, EnvelopeSimple, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

const METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { id: 'CARD', label: 'Card' },
  { id: 'CHEQUE', label: 'Cheque' }
];

const QUICK_TENDER = [500, 1000];

export default function PosCheckoutPane({
  totals,
  formatCurrency,
  onBack,
  onConfirm,
  onLookup,
  onVerifyPin,
  onDiscountChange,
  submitting
}) {
  const [step, setStep] = useState('customer'); // 'customer' | 'payment'

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

  const [discountInput, setDiscountInput] = useState('');
  const [pin, setPin] = useState('');
  const [discountUnlocked, setDiscountUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  const firstFieldRef = useRef(null);

  // Refocus on every step change so the keyboard never strands the cashier.
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

  const tenderedValue = Number(tendered) || 0;
  const changeGiven = paymentMethod === 'CASH' ? Math.max(0, tenderedValue - totals.total) : null;

  const paymentComplete =
    paymentMethod === 'CASH'
      ? tenderedValue >= totals.total
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

  const handleDiscountInput = (raw) => {
    setDiscountInput(raw);
    onDiscountChange(Number(raw) || 0);
  };

  const handleConfirm = () => {
    onConfirm({
      customerName: customerName.trim(),
      customerContact: customerContact.trim(),
      customerEmail: customerEmail.trim(),
      paymentMethod,
      amountTendered: paymentMethod === 'CASH' ? tenderedValue : null,
      changeGiven,
      chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber.trim() : null,
      chequeBank: paymentMethod === 'CHEQUE' ? chequeBank.trim() : null,
      chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : null
    });
  };

  const inputClass =
    'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5';
  const sectionClass = 'pt-4 border-t border-border space-y-3';
  const pressable = 'transition-transform duration-150 ease-out active:scale-[0.97]';

  return (
    <section aria-labelledby="pos-checkout-heading" className="glass-panel p-5 rounded-2xl flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => (step === 'payment' ? setStep('customer') : onBack())}
            aria-label={step === 'payment' ? 'Back to customer details' : 'Back to cart'}
            className={`p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground ${pressable}`}
          >
            <ArrowLeft weight="bold" className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 id="pos-checkout-heading" className="text-lg font-bold text-foreground font-display truncate">
              {step === 'customer' ? 'Customer' : 'Payment'}
            </h3>
            <p className="text-2xs text-muted-foreground">Step {step === 'customer' ? '1' : '2'} of 2</p>
          </div>
        </div>
        <p className="text-right shrink-0">
          <span className="block text-2xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span data-testid="pos-checkout-total" className="block text-xl font-extrabold text-foreground font-mono">
            {formatCurrency(totals.total)}
          </span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {step === 'customer' && (<>
        <div>
          <label htmlFor="pos-lookup" className={labelClass}>Find returning customer</label>
          <div className="relative">
            <MagnifyingGlass weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={firstFieldRef}
              id="pos-lookup"
              type="text"
              aria-label="Find returning customer by phone, name or email"
              placeholder="Phone, name, or email"
              value={lookupTerm}
              onChange={(e) => setLookupTerm(e.target.value)}
              className={`${inputClass} pl-11`}
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
                      {c.customerContact} · {c.orderCount} {c.orderCount === 1 ? 'order' : 'orders'}
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
            Returning customer, {matchedCustomer.orderCount} previous orders.
          </p>
        )}

        <div className={sectionClass}>
          <div className="relative">
            <label htmlFor="pos-name" className={labelClass}>Customer name</label>
            <User weight="bold" className="absolute left-4 top-[2.4rem] w-4 h-4 text-muted-foreground pointer-events-none" />
            <input id="pos-name" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`${inputClass} pl-11`} />
          </div>
          <div className="relative">
            <label htmlFor="pos-contact" className={labelClass}>Contact number</label>
            <Phone weight="bold" className="absolute left-4 top-[2.4rem] w-4 h-4 text-muted-foreground pointer-events-none" />
            <input id="pos-contact" type="tel" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className={`${inputClass} pl-11`} />
          </div>
          <div className="relative">
            <label htmlFor="pos-email" className={labelClass}>Email</label>
            <EnvelopeSimple weight="bold" className="absolute left-4 top-[2.4rem] w-4 h-4 text-muted-foreground pointer-events-none" />
            <input id="pos-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={`${inputClass} pl-11`} />
          </div>
          <p className="text-xs text-muted-foreground">All three are required so this customer is recognised next visit.</p>
        </div>
        </>)}

        {step === 'payment' && (<>
        <fieldset className={sectionClass}>
          <legend className={labelClass}>Payment method</legend>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
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
          <div className={sectionClass}>
            <label htmlFor="pos-tendered" className={labelClass}>Amount tendered</label>
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
              {QUICK_TENDER.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTendered(String(amt))}
                  className={`flex-1 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:border-accent/40 ${pressable}`}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTendered(String(totals.total))}
                className={`flex-1 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:border-accent/40 ${pressable}`}
              >
                Exact
              </button>
            </div>

            <div className="flex items-baseline justify-between px-4 py-3 rounded-xl bg-secondary border border-border">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Change due</span>
              <span
                data-testid="change-due"
                className={`text-2xl font-extrabold font-mono ${tenderedValue >= totals.total ? 'text-emerald-500' : 'text-muted-foreground'}`}
              >
                {formatCurrency(changeGiven || 0)}
              </span>
            </div>

            {tenderedValue > 0 && tenderedValue < totals.total && (
              <p role="status" className="text-xs font-semibold text-amber-500">
                Short by {formatCurrency(totals.total - tenderedValue)}.
              </p>
            )}
          </div>
        )}

        {paymentMethod === 'CHEQUE' && (
          <div className={sectionClass}>
            <div>
              <label htmlFor="pos-cheque-no" className={labelClass}>Cheque number</label>
              <input id="pos-cheque-no" type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="pos-cheque-bank" className={labelClass}>Bank</label>
              <input id="pos-cheque-bank" type="text" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="pos-cheque-date" className={labelClass}>Cheque date</label>
              <input id="pos-cheque-date" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        <div className={sectionClass}>
          <span className={labelClass}>Discount</span>
          {!discountUnlocked ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  aria-label="Supervisor override PIN"
                  placeholder="Supervisor PIN"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={handleUnlockDiscount}
                  disabled={pin.length < 4}
                  className={`px-5 py-2.5 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed ${pressable}`}
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
                max={totals.lineSum}
                step="0.01"
                aria-label="Discount amount"
                value={discountInput}
                onChange={(e) => handleDiscountInput(e.target.value)}
                className={`${inputClass} font-mono`}
              />
              <p className="text-xs text-muted-foreground">
                Capped at {formatCurrency(totals.lineSum)}. Applying {formatCurrency(totals.discount)}.
              </p>
            </div>
          )}
        </div>
        </>)}
      </div>

      {step === 'customer' ? (
        <button
          type="button"
          onClick={() => setStep('payment')}
          disabled={!customerComplete}
          className={`w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground text-white text-base font-bold ${pressable} disabled:active:scale-100`}
        >
          Continue to payment
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!paymentComplete || submitting}
          className={`w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground text-white text-base font-bold ${pressable} disabled:active:scale-100`}
        >
          {submitting ? 'Completing sale' : 'Complete sale'}
        </button>
      )}
    </section>
  );
}

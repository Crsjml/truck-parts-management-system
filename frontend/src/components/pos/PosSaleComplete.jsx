import React from 'react';
import { CheckCircle, Download, Printer, X } from '@phosphor-icons/react';
import PosReceipt from './PosReceipt';

const pressable = 'transition-transform duration-150 ease-out active:scale-[0.97]';

export default function PosSaleComplete({ tx, formatCurrency, onDismiss, onDownloadInvoice }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="pos-sale-complete"
      role="status"
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3"
    >
      <PosReceipt tx={tx} formatCurrency={formatCurrency} />

      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />
          Sale complete
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss completed sale"
          className={`p-1 rounded-lg text-muted-foreground hover:text-foreground ${pressable}`}
        >
          <X weight="bold" className="w-4 h-4" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm font-mono">
        <dt className="text-muted-foreground">Invoice</dt>
        <dd className="text-right font-bold text-foreground">{tx.invoiceNumber}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="text-right font-bold text-foreground">{formatCurrency(tx.total)}</dd>
        {tx.changeGiven != null && tx.changeGiven > 0 && (
          <>
            <dt className="text-muted-foreground">Change</dt>
            <dd className="text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(tx.changeGiven)}</dd>
          </>
        )}
      </dl>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-background border border-border text-sm font-bold text-foreground hover:bg-secondary ${pressable}`}
        >
          <Printer weight="bold" className="w-4 h-4" /> Print Receipt
        </button>
        <button
          type="button"
          onClick={onDownloadInvoice}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl bg-background border border-border text-sm font-bold text-foreground hover:bg-secondary ${pressable}`}
        >
          <Download weight="bold" className="w-4 h-4" /> Invoice PDF
        </button>
      </div>
    </div>
  );
}

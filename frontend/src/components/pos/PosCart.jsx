import React from 'react';
import { ShoppingCart, Trash, Plus, Minus, Warning, CreditCard, X } from '@phosphor-icons/react';

export default function PosCart({
  cart,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  totals,
  formatCurrency,
  warning,
  onDismissWarning
}) {
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <ShoppingCart weight="duotone" className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-foreground">Active Cart</h3>
        {itemCount > 0 && (
          <span className="ml-auto px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-extrabold border border-accent/20">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {warning && (
        <div role="status" className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <div className="flex items-start gap-2">
            <Warning weight="fill" className="w-4 h-4 shrink-0 mt-px" />
            <p>{warning}</p>
          </div>
          {onDismissWarning && (
            <button
              type="button"
              onClick={onDismissWarning}
              aria-label="Dismiss warning"
              className="p-1 -mr-1 -mt-1 text-amber-600/70 hover:text-amber-600 rounded-md transition-colors"
            >
              <X weight="bold" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShoppingCart weight="duotone" className="w-10 h-10 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Cart is empty. Add a part to begin.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-secondary p-3 rounded-xl border border-border">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                </p>
              </div>

              <div className="flex items-center gap-1 bg-background rounded-lg p-1 border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="p-2 min-w-[2rem] min-h-[2rem] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-transform duration-150 ease-out active:scale-[0.92]"
                >
                  <Minus weight="bold" className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-foreground w-6 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="p-2 min-w-[2rem] min-h-[2rem] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-transform duration-150 ease-out active:scale-[0.92]"
                >
                  <Plus weight="bold" className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name}`}
                className="p-2 text-muted-foreground hover:text-red-500 rounded-lg transition-transform duration-150 ease-out active:scale-[0.92] shrink-0"
              >
                <Trash weight="bold" className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <dl className="space-y-1">
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <dt>Discount</dt>
              <dd data-testid="pos-discount" className="font-mono text-amber-500">
                - {formatCurrency(totals.discount)}
              </dd>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total</dt>
            <dd data-testid="pos-total" className="text-3xl font-bold tracking-tight text-foreground font-mono">
              {formatCurrency(totals.total)}
            </dd>
          </div>
        </dl>

        {/* The shelf price already contains VAT. Showing the split keeps the
            calculation visible without implying anything is being added. */}
        <p data-testid="pos-vat-note" className="text-2xs text-muted-foreground">
          Includes VAT 12%: {formatCurrency(totals.vatableSale)} sale + {formatCurrency(totals.vatAmount)} VAT
        </p>

        <button
          type="button"
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full py-4 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-secondary disabled:text-muted-foreground text-white text-base font-bold transition-transform duration-150 ease-out active:scale-[0.97] flex items-center justify-center gap-2"
        >
          <CreditCard weight="bold" className="w-5 h-5" />
          Checkout
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-black/20 text-2xs font-mono">F4</kbd>
        </button>
      </div>
    </div>
  );
}

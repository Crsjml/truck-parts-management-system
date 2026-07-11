import React from 'react';
import { ShoppingCart, X, Minus, Plus, Trash } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';

export default function CartDrawer({
  isCartOpen,
  setIsCartOpen,
  cart,
  cartTotalItems,
  cartTotalAmount,
  updateCartQuantity,
  removeFromCart,
  handleCheckout,
  isCheckingOut
}) {
  const { formatCurrency, displayCurrency } = useSettings();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none p-4 sm:p-4 lg:p-4">
      {/* Invisible overlay to handle click outside, no dimming */}
      <div className="fixed inset-0 pointer-events-auto" onClick={() => setIsCartOpen(false)} />
      
      <div className="pointer-events-auto relative w-full max-w-md bg-background/80 backdrop-blur-2xl shadow-2xl shadow-black/20 h-full flex flex-col border border-border/50 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="flex items-center justify-between border-b border-border/50 p-6 bg-background/50">
          <h2 className="text-xl font-bold text-foreground inline-flex items-center gap-3">
            <ShoppingCart weight="duotone" className="h-6 w-6 text-brandBlue-500 dark:text-brandBlue-400" />
            Your Cart
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="rounded-full border border-border/50 bg-background/50 p-2 text-muted-foreground transition hover:text-foreground hover:bg-secondary">
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
              <ShoppingCart weight="duotone" className="h-20 w-20 text-muted-foreground" />
              <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="group flex items-center gap-4 rounded-2xl border border-border/50 p-3 bg-background/60 hover:bg-background transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">{item.name}</h4>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5">{displayCurrency} {item.price}</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/50 p-1">
                  <button onClick={() => updateCartQuantity(item.id, -1, item.stock)} className="p-1 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Minus weight="bold" className="w-3 h-3"/></button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, 1, item.stock)} className="p-1 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"><Plus weight="bold" className="w-3 h-3"/></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                  <Trash weight="duotone" className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-border/50 p-6 bg-secondary/80 backdrop-blur-md">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-muted-foreground">Total ({cartTotalItems} items)</span>
              <span className="text-2xl font-black text-foreground">{formatCurrency(cartTotalAmount)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full rounded-2xl bg-foreground px-5 py-4 text-center text-sm font-bold text-background hover:scale-[0.98] disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBlue-500 focus-visible:ring-offset-2 shadow-xl shadow-black/10"
            >
              {isCheckingOut ? 'Processing Request...' : 'Submit Quote / Purchase Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

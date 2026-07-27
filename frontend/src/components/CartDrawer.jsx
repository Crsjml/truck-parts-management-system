import { ShoppingCart, Minus, Plus, Trash } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { Drawer } from './ui/Drawer';

const panelVariants = {
  initial: { opacity: 0, y: -8, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.92 },
  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
};

const headingId = 'cart-drawer-heading';

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
  const { formatCurrency } = useSettings();
  const onClose = () => setIsCartOpen(false);

  return (
    <Drawer
      isOpen={isCartOpen}
      onClose={onClose}
      labelledBy={headingId}
      panelClassName="fixed top-24 right-4 sm:right-6 lg:right-8 w-full max-w-[360px] bg-background/90 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col border border-border/60 rounded-[2rem]"
      panelStyle={{ maxHeight: 'calc(100vh - 120px)', transformOrigin: 'top right' }}
      panelVariants={panelVariants}
    >
      {/* pointer aimed at the header cart icon */}
      <div
        aria-hidden="true"
        className="absolute -top-1.5 right-7 h-3 w-3 rotate-45 rounded-[3px] border-l border-t border-border/60 bg-background/90"
      />
      <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] min-h-0">
      <div className="flex items-center justify-between border-b border-border/50 p-5 bg-background/60">
        <h2 id={headingId} className="text-lg font-bold text-foreground inline-flex items-center gap-2.5">
          <ShoppingCart weight="fill" className="h-5 w-5 text-accent" aria-hidden="true" />
          Your Cart
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground ml-1">
            {cartTotalItems}
          </span>
        </h2>
        <button
          onClick={onClose}
          aria-label="Minimize cart"
          className="rounded-full bg-transparent p-1.5 text-muted-foreground transition-all hover:text-foreground hover:bg-secondary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Minus weight="bold" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[200px]">
        {!isCartOpen ? null : cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60 py-10">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
              <ShoppingCart weight="duotone" className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="group flex items-start gap-3 rounded-2xl border border-border/40 p-3 bg-secondary/30 hover:bg-secondary/60 hover:border-border/80 transition-all">
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-foreground leading-tight line-clamp-2 mb-1">{item.name}</h4>
                <p className="text-xs font-semibold text-muted-foreground font-mono tabular-nums">
                  {item.quantity} × {formatCurrency(item.price)}
                </p>
                <p className="text-[13px] font-black text-foreground font-mono tabular-nums">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/80 p-0.5">
                  <button onClick={() => updateCartQuantity(item.id, -1, item.stock)} aria-label={`Decrease quantity of ${item.name}`} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Minus weight="bold" className="w-3 h-3" aria-hidden="true"/></button>
                  <span aria-live="polite" className="text-xs font-bold w-4 text-center tabular-nums">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, 1, item.stock)} aria-label={`Increase quantity of ${item.name}`} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus weight="bold" className="w-3 h-3" aria-hidden="true"/></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name} from cart`} className="text-muted-foreground hover:text-red-500 transition-colors text-xs flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:opacity-100 rounded">
                  <Trash weight="bold" className="w-3.5 h-3.5" aria-hidden="true" /> Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isCartOpen && cart.length > 0 && (
        <div className="border-t border-border/50 p-5 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtotal</span>
            <span aria-live="polite" className="text-xl font-black text-foreground font-mono tabular-nums">{formatCurrency(cartTotalAmount)}</span>
          </div>
          <button
            onClick={() => {
              handleCheckout();
              if(!isCheckingOut) setIsCartOpen(false); // Optionally close on checkout
            }}
            disabled={isCheckingOut}
            className="w-full rounded-xl bg-foreground px-4 py-3.5 text-center text-sm font-bold text-background hover:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-lg shadow-black/10 flex items-center justify-center gap-2"
          >
            {isCheckingOut ? 'Processing…' : 'Checkout'}
          </button>
        </div>
      )}
      </div>
    </Drawer>
  );
}

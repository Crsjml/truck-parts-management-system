import { useState } from 'react';
import { Popover } from './ui/Popover';
import { Bell, X, CheckCircle, Package } from '@phosphor-icons/react';

export default function LowStockAlertPopover({
  lowStockParts,
  isOpen,
  onClose,
  triggerRef,
  showToast,
  onNavigateToPart,
  onNavigateToCatalog
}) {
  const [seenIds, setSeenIds] = useState(new Set());

  // Task 4: Sort and prepare data
  // ratio = stock / minStock
  // Sort ascending by ratio (lower ratio = more critical)
  // Ties broken by name
  const displayParts = [...lowStockParts]
    .filter(part => !seenIds.has(part.id))
    .sort((a, b) => {
      const aStock = a.stock - (a.reservedStock || 0);
      const bStock = b.stock - (b.reservedStock || 0);
      const ratioA = a.minStock > 0 ? aStock / a.minStock : 0;
      const ratioB = b.minStock > 0 ? bStock / b.minStock : 0;
      if (ratioA !== ratioB) return ratioA - ratioB;
      return a.name.localeCompare(b.name);
    });

  const visibleParts = displayParts.slice(0, 8);
  const hasMore = displayParts.length > 8;

  const handleDismiss = (e, part) => {
    e.stopPropagation();
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(part.id);
      return next;
    });
    
    showToast?.(`${part.name} dismissed`, 'info', {
      label: 'Undo',
      onClick: () => {
        setSeenIds(prev => {
          const next = new Set(prev);
          next.delete(part.id);
          return next;
        });
      }
    });
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      labelledBy="alert-popover-heading"
      className="w-full max-w-[360px] bg-background border border-border rounded-xl flex flex-col shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <Bell weight="duotone" className="w-5 h-5 text-accent" />
          <h2 id="alert-popover-heading" className="text-sm font-bold text-foreground font-display">Low Stock Alerts</h2>
        </div>
        <button onClick={onClose} aria-label="Close notifications" className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md text-muted-foreground transition-colors">
          <X weight="bold" className="w-4 h-4" />
        </button>
      </div>
      
      {displayParts.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-background text-xs text-muted-foreground flex justify-between items-center">
          <span>Showing {visibleParts.length} of {displayParts.length}</span>
          <span>Most critical first</span>
        </div>
      )}

      <ul aria-live="polite" aria-atomic="false" className="list-none flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1 custom-scrollbar">
        {displayParts.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground opacity-70">
            <CheckCircle weight="duotone" className="w-10 h-10 mb-2 text-emerald-500" />
            <p className="text-sm font-semibold">All Stock is Healthy</p>
          </div>
        ) : (
          visibleParts.map(part => {
            const actualStock = part.stock - (part.reservedStock || 0);
            const ratio = part.minStock > 0 ? actualStock / part.minStock : 0;
            const isCritical = ratio <= 0;
            const badgeClass = isCritical ? 'bg-destructive text-white' : 'bg-secondary text-secondary-foreground border border-border';
            const label = isCritical ? 'Critical' : 'Low';

            return (
              <li key={part.id} className="p-2.5 bg-background hover:bg-secondary/50 border border-transparent hover:border-border rounded-lg relative group transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{part.name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${badgeClass}`}>
                        {label}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{part.sku}</div>
                    
                    {/* Inline stats for high data density */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <span className="font-bold text-foreground">{actualStock}</span>
                      <span className="text-muted-foreground font-medium">/</span>
                      <span className="text-muted-foreground font-medium">{part.minStock} min</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={(e) => handleDismiss(e, part)}
                      className="min-w-[44px] min-h-[44px] px-2 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      aria-label={`Dismiss ${part.name}`}
                      title="Dismiss alert"
                    >
                      <X weight="bold" className="w-4 h-4" />
                      <span className="text-[10px] font-semibold leading-none">Dismiss</span>
                    </button>
                    <button
                      onClick={() => onNavigateToPart(part.sku)}
                      className="min-w-[44px] min-h-[44px] px-2 flex flex-col items-center justify-center gap-0.5 bg-foreground hover:bg-foreground/90 text-background rounded-md transition-colors shadow-sm"
                      aria-label={`Restock ${part.name}`}
                      title="Restock part"
                    >
                      <Package weight="bold" className="w-4 h-4" />
                      <span className="text-[10px] font-semibold leading-none">Restock</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
      
      {hasMore && (
        <div className="p-2 border-t border-border bg-secondary/30">
          <button 
            onClick={onNavigateToCatalog}
            className="w-full py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border text-center block"
          >
            View all {displayParts.length} in Catalog
          </button>
        </div>
      )}
    </Popover>
  );
}

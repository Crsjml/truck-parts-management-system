import React from 'react';
import { Download, ArrowClockwise, Star, CheckCircle, ClipboardText, Truck, XCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const getStatusColor = (status) => {
  switch(status) {
    case 'COMPLETED': 
      return { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', label: 'Completed', icon: CheckCircle };
    case 'READY_FOR_PICKUP': 
      return { badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', label: 'Ready for Pickup', icon: Truck };
    case 'ORDER_PLACED': 
      return { badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', label: 'Order Placed', icon: ClipboardText };
    case 'CANCELLED': 
      return { badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', label: 'Cancelled', icon: XCircle };
    default: 
      return { badge: 'bg-secondary text-muted-foreground border-border', label: status || 'Unknown', icon: ClipboardText };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function OrderCard({
  transaction,
  formatCurrency = (amt) => `₱ ${amt}`,
  onDownloadPDF,
  onReview,
  onReorder,
  reviewedPartIds = []
}) {
  if (!transaction) return null;

  const statusInfo = getStatusColor(transaction.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    >
      {/* Header: Invoice number, Date, Status badge */}
      <div className="border-b border-border/30 p-4 flex items-start justify-between bg-card">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-display font-black uppercase tracking-wider text-foreground mb-1">
            Order #{transaction.invoiceNumber || transaction.id}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(transaction.transactionDate)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${statusInfo.badge}`}>
          {statusInfo.icon && <statusInfo.icon weight="bold" className="w-3.5 h-3.5" />}
          {statusInfo.label}
        </span>
      </div>

      {/* Body: Items list */}
      <div className="p-4 border-b border-border/30 space-y-0 flex-1">
        {transaction.items && transaction.items.length > 0 ? (
          (() => {
            const mergedItemsMap = new Map();
            transaction.items.forEach(item => {
              const pId = item.partId || item.id;
              if (mergedItemsMap.has(pId)) {
                const existing = mergedItemsMap.get(pId);
                existing.quantity += item.quantity;
                existing.rowTotal += (item.price * item.quantity);
              } else {
                mergedItemsMap.set(pId, { ...item, rowTotal: item.price * item.quantity });
              }
            });
            const mergedItems = Array.from(mergedItemsMap.values());

            return (
              <div className="space-y-0 flex-1">
                {mergedItems.map((item, idx) => {
                  const pId = item.partId || item.id;

                  return (
                    <div key={item.id || idx} className="flex items-center py-2.5 border-b border-border/50 last:border-0 group">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(item.rowTotal)}</p>
                        
                        <div className="w-[84px] flex justify-end">
                          {transaction.status === 'COMPLETED' && (
                            reviewedPartIds.includes(pId) ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                                <CheckCircle weight="fill" className="w-3.5 h-3.5" /> Reviewed
                              </span>
                            ) : (
                              <button
                                onClick={() => onReview && onReview(pId, item.name, item.part?.image)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 hover:bg-accent hover:text-white px-2.5 py-1 rounded-full border border-accent/20 transition-colors"
                                aria-label={`Review ${item.name}`}
                              >
                                <Star weight="bold" className="w-3.5 h-3.5" /> Review
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-muted-foreground italic">No item details available</p>
        )}
      </div>

      {/* Footer: Bold total, Action buttons */}
      <div className="p-4 bg-secondary/30 space-y-4">
        <div className="flex items-center justify-between border-t border-border/30 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-foreground font-mono">
            {formatCurrency(transaction.total)}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onDownloadPDF && onDownloadPDF(transaction)}
            className="flex-1 py-2 px-3 rounded-xl border border-border/60 bg-background hover:bg-secondary text-xs sm:text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Download PDF invoice"
          >
            <Download weight="bold" className="w-4 h-4 shrink-0" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => onReorder && onReorder(transaction.items)}
            className="flex-1 py-2 px-3 rounded-xl border border-border/60 bg-background hover:bg-secondary text-xs sm:text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Reorder items"
          >
            <ArrowClockwise weight="bold" className="w-4 h-4 shrink-0" />
            <span>Reorder</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

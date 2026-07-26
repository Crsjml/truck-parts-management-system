import React from 'react';
import { Download, ArrowClockwise, Star } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const getStatusColor = (status) => {
  switch(status) {
    case 'COMPLETED': 
      return { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Completed' };
    case 'READY_FOR_PICKUP': 
      return { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Ready for Pickup' };
    case 'ORDER_PLACED': 
      return { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Order Placed' };
    case 'CANCELLED': 
      return { badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: 'Cancelled' };
    default: 
      return { badge: 'bg-secondary text-muted-foreground border-border', label: status || 'Unknown' };
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
  displayCurrency = '₱',
  formatCurrency = (amt) => `${displayCurrency} ${amt}`,
  onDownloadPDF,
  onReview,
  onReorder
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
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Order #{transaction.invoiceNumber || transaction.id}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(transaction.transactionDate)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${statusInfo.badge}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Body: Items list */}
      <div className="p-4 border-b border-border/30 space-y-3 flex-1">
        {transaction.items && transaction.items.length > 0 ? (
          transaction.items.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {displayCurrency} {item.price} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-mono font-medium text-foreground whitespace-nowrap">
                {displayCurrency} {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No item details available</p>
        )}
      </div>

      {/* Footer: Bold total, Action buttons */}
      <div className="p-4 bg-secondary/30 space-y-4">
        <div className="flex items-center justify-between border-t border-border/30 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-xl font-black text-foreground font-mono">
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
          <button
            onClick={() => onReview && onReview(transaction.items?.[0]?.partId || transaction.items?.[0]?.id, transaction.items?.[0]?.name)}
            className="flex-1 py-2 px-3 rounded-xl border border-border/60 bg-background hover:bg-secondary text-xs sm:text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Leave review"
          >
            <Star weight="bold" className="w-4 h-4 shrink-0" />
            <span>Review</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

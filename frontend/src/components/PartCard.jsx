import React, { memo } from 'react';
import { Warning, Star, Truck, PaperPlaneRight, ShoppingCart, Sliders, Wrench, XCircle } from '@phosphor-icons/react';
import { getCategoryPlaceholder } from '../utils/categoryIcons';

const PartCard = memo(({
  part,
  isReadOnly,
  formatCurrency,
  openDetailsModal,
  setInquiryPart,
  setInquiryQty,
  setInquiryMsg,
  setIsInquiryModalOpen,
  setPage,
  openAdjustStockModal,
  openEditModal,
  onDeletePart,
  viewMode
}) => {
  const isLowStock = part.stock <= part.minStock;

  return (
    <div 
      className={`glass-panel p-5 rounded-2xl flex flex-col justify-between glass-panel-hover border-t-2 relative ${
        isLowStock ? 'border-t-accent/50' : 'border-t-transparent'
      }`}
    >
      {/* Low Stock Warning Badge */}
      {isLowStock && (
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-2xs font-extrabold text-red-500 animate-pulse z-10">
          <Warning weight="duotone" className="w-3 h-3" />
          LOW STOCK
        </div>
      )}

      {/* Part Image */}
      <div className="h-40 rounded-xl overflow-hidden bg-slate-900/60 border border-border/10 mb-4 flex items-center justify-center relative select-none">
        {part.image ? (
          <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <img src={getCategoryPlaceholder(part.category)} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80" />
        )}
      </div>

      {/* Card Top */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-2xs font-bold uppercase tracking-widest text-brandBlue-400">
              {part.category}
            </span>
            {part.reviewStats?.totalReviews > 0 && (
              <div className="flex items-center gap-1 text-2xs font-bold text-amber-400">
                <Star weight="fill" />
                <span>{part.reviewStats.averageRating} ({part.reviewStats.totalReviews})</span>
              </div>
            )}
          </div>
          <h4 
            onClick={() => openDetailsModal(part)}
            className="font-bold text-foreground hover:text-red-400 cursor-pointer transition-colors leading-snug font-display"
          >
            {part.name}
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs border-y border-slate-900 py-2">
          <div>
            <span className="text-muted-foreground block">SKU</span>
            <span className="font-mono text-muted-foreground font-semibold">{part.sku}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">OEM Part No.</span>
            <span className="font-mono text-muted-foreground font-semibold truncate block">{part.oem}</span>
          </div>
        </div>

        {part.compatibility && (
          <div className="text-xs space-y-0.5">
            <span className="text-muted-foreground flex items-center gap-1 font-semibold">
              <Truck weight="duotone" className="w-3 h-3 text-red-500" /> Fits
            </span>
            <p className="text-muted-foreground">{part.compatibility}</p>
          </div>
        )}
      </div>

      {/* Card Bottom / Controls */}
      <div className="space-y-3 pt-4 mt-4 border-t border-slate-900">
        <div className="flex items-end justify-between bg-secondary/20 p-3 rounded-xl border border-border/50">
          <div>
            <span className="text-2xs text-muted-foreground uppercase tracking-wider block">Unit Price</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatCurrency(part.price)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xs text-muted-foreground uppercase tracking-wider block">{isReadOnly ? 'Stock Status' : 'Quantity'}</span>
            <span className={`text-lg font-extrabold font-mono ${isLowStock && !isReadOnly ? 'text-red-500' : 'text-foreground'}`}>
              {isReadOnly ? (part.stock > 0 ? `${part.stock} avail` : '0') : `${part.stock} / ${part.minStock}`}
            </span>
          </div>
        </div>

        {isReadOnly ? (
          <button 
            onClick={() => {
              setInquiryPart(part);
              setInquiryQty('1');
              setInquiryMsg('');
              setIsInquiryModalOpen(true);
            }}
            className="w-full py-2 bg-brandBlue-500/10 dark:bg-brandBlue-900 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 text-brandBlue-600 dark:text-brandBlue-300 text-xs font-semibold rounded-lg border border-brandBlue-500/30 dark:border-brandBlue-700/30 transition-all flex items-center justify-center gap-1.5"
          >
            <PaperPlaneRight weight="duotone" className="w-3.5 h-3.5" /> Request Quote
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('purchasingIntent', { detail: part }));
                if (setPage) setPage('purchasing');
              }}
              className="w-full py-2 px-3 bg-accent/10 hover:bg-accent/20 text-accent dark:text-red-400 text-xs font-bold rounded-lg border border-accent/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ShoppingCart weight="bold" className="w-4 h-4" /> Create PO
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => openAdjustStockModal(part)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors border border-border"
                title="Adjust Stock Count"
              >
                <Sliders weight="duotone" className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => openEditModal(part)}
                className="py-1.5 px-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary text-xs font-semibold rounded-lg transition-colors border border-border flex items-center justify-center gap-1"
              >
                <Wrench weight="duotone" className="w-3.5 h-3.5" /> Edit
              </button>
              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                    onDeletePart(part.id);
                  }
                }}
                className="py-1.5 px-2 text-muted-foreground hover:text-red-500 bg-secondary/50 hover:bg-red-950/20 text-xs font-semibold rounded-lg transition-colors border border-border hover:border-red-500/30 flex items-center justify-center gap-1"
              >
                <XCircle weight="duotone" className="w-3.5 h-3.5" /> Archive
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PartCard.displayName = 'PartCard';

export default PartCard;

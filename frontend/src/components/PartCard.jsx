import React, { memo } from 'react';
import { Warning, Star, Truck, PaperPlaneRight, ShoppingCart, Sliders, Wrench, XCircle } from '@phosphor-icons/react';
import { getCategoryPlaceholder, getCategoryIconAndColor } from '../utils/categoryIcons';

const PartCard = memo(({
  part,
  isReadOnly,
  isAdmin,
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
  const isCompact = viewMode === 'grid3';

  return (
    <div 
      className={`glass-panel p-4 rounded-xl flex flex-col gap-3 border relative ${
        isLowStock ? 'border-destructive/30' : 'border-border/60'
      }`}
    >
      {/* Low Stock Warning Badge */}
      {isLowStock && (
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/30 text-2xs font-extrabold text-destructive z-10">
          <Warning weight="duotone" className="w-3 h-3" />
          LOW STOCK
        </div>
      )}

      {/* Part Image */}
      <div className="h-32 rounded-lg overflow-hidden bg-secondary/60 border border-border/40 flex items-center justify-center relative select-none">
        {part.image ? (
          <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          (() => {
            const { Icon } = getCategoryIconAndColor(part.category, null, null);
            return <Icon weight="duotone" className="w-16 h-16 text-muted-foreground/30" />;
          })()
        )}
      </div>

      {/* Card Top */}
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brandBlue-400 break-words flex-1">
              {part.category}
            </span>
            {!isAdmin && part.reviewStats?.totalReviews > 0 && (
              <div className="flex items-center gap-1 text-2xs font-bold text-amber-400 shrink-0">
                <Star weight="fill" />
                <span>{part.reviewStats.averageRating} ({part.reviewStats.totalReviews})</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => openDetailsModal(part)}
            className="block w-full text-left text-[1.02rem] font-bold text-foreground hover:text-red-400 transition-colors leading-snug font-display line-clamp-2 focus-visible:rounded-md"
          >
            {part.name}
          </button>
          {isCompact && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-mono font-semibold">{part.sku}</span>
              <span className="text-border">/</span>
              <span className="font-mono">{part.oem}</span>
            </div>
          )}
        </div>

        {!isCompact && (
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-xs">
            <div>
              <span className="text-muted-foreground block">SKU</span>
              <span className="font-mono text-muted-foreground font-semibold break-all">{part.sku}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">OEM Part No.</span>
              <span className="font-mono text-muted-foreground font-semibold break-all block">{part.oem}</span>
            </div>
            
            {(part.series || part.years) && (
              <>
                {part.series && (
                  <div className="col-span-1">
                    <span className="text-muted-foreground block">Series</span>
                    <span className="font-semibold text-foreground">{part.series}</span>
                  </div>
                )}
                {part.years && (
                  <div className="col-span-1">
                    <span className="text-muted-foreground block">Years</span>
                    <span className="font-semibold text-foreground">{part.years}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isCompact && part.compatibility && (
          <div className="text-xs space-y-0.5">
            <span className="text-muted-foreground flex items-center gap-1 font-semibold">
              <Truck weight="duotone" className="w-3 h-3 text-red-500" /> Fits
            </span>
            <p className="text-muted-foreground">{part.compatibility}</p>
          </div>
        )}
      </div>

      {/* Card Bottom / Controls */}
      <div className={`space-y-3 pt-1 ${!isCompact ? 'pt-2' : ''}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 bg-card p-3">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground block">Unit Price</span>
            <span className="mt-1 block whitespace-nowrap text-[1.18rem] font-semibold leading-none text-foreground tabular-nums" title={formatCurrency(part.price)}>
              {formatCurrency(part.price)}
            </span>
          </div>
          <div className="shrink-0 text-right" aria-label={isReadOnly ? 'Stock status' : `Quantity ${part.stock} / ${part.minStock}`}>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isReadOnly ? 'Stock' : 'On Hand / Min'}</span>
            <span className={`mt-1 block whitespace-nowrap text-[1.18rem] font-semibold leading-none tabular-nums ${isLowStock && !isReadOnly ? 'text-red-500' : 'text-foreground'}`}>
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
            {isCompact ? (
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('purchasingIntent', { detail: part }));
                    if (setPage) setPage('purchasing');
                  }}
                  className="col-span-3 inline-flex h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/40 bg-background px-3 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                  title="Create PO"
                >
                  <ShoppingCart weight="bold" className="w-4 h-4 shrink-0" /> <span>Create PO</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openAdjustStockModal(part); }}
                  aria-label={`Adjust stock count for ${part.name}`}
                  className="h-10 w-full bg-background hover:bg-brandBlue-500/10 text-muted-foreground hover:text-brandBlue-600 dark:hover:text-brandBlue-400 rounded-lg border border-border/60 hover:border-brandBlue-500/30 transition-all flex items-center justify-center"
                  title="Adjust Stock Count"
                >
                  <Sliders weight="duotone" className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => openEditModal(part)}
                  aria-label={`Edit ${part.name}`}
                  className="h-10 w-full text-muted-foreground hover:text-foreground bg-background hover:bg-secondary rounded-lg transition-colors border border-border/60 flex items-center justify-center"
                  title="Edit"
                >
                  <Wrench weight="duotone" className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                      onDeletePart(part.id);
                    }
                  }}
                  aria-label={`Archive ${part.name}`}
                  className="h-10 w-full text-muted-foreground hover:text-destructive bg-background hover:bg-destructive/10 rounded-lg transition-colors border border-border/60 hover:border-destructive/30 flex items-center justify-center"
                  title="Archive"
                >
                  <XCircle weight="duotone" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('purchasingIntent', { detail: part }));
                    if (setPage) setPage('purchasing');
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/40 bg-background px-3 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <ShoppingCart weight="bold" className="w-4 h-4 shrink-0" /> Create PO
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); openAdjustStockModal(part); }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 bg-background px-3 text-xs font-semibold text-muted-foreground transition-all hover:border-brandBlue-500/30 hover:bg-brandBlue-500/10 hover:text-brandBlue-600 dark:hover:text-brandBlue-400"
                  title="Adjust Stock Count"
                >
                  <Sliders weight="duotone" className="w-3.5 h-3.5 shrink-0" /> Adjust
                </button>
                <button 
                  onClick={() => openEditModal(part)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Wrench weight="duotone" className="w-3.5 h-3.5 shrink-0" /> Edit
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                      onDeletePart(part.id);
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border/60 bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle weight="duotone" className="w-3.5 h-3.5 shrink-0" /> Archive
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PartCard.displayName = 'PartCard';

export default PartCard;

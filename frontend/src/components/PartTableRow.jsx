import React, { memo } from 'react';
import { ShoppingCart, Sliders, Wrench, XCircle } from '@phosphor-icons/react';
import { getCategoryPlaceholder, getCategoryIconAndColor } from '../utils/categoryIcons';

const PartTableRow = memo(({ 
  part, 
  openDetailsModal, 
  formatCurrency,
  openAdjustStockModal,
  openEditModal,
  onDeletePart,
  setPage
}) => {
  const isLowStock = part.stock <= part.minStock;
  return (
    <tr 
      className="group hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={() => openDetailsModal(part)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary border border-border/20 shrink-0 flex items-center justify-center">
            {part.image ? (
              <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              (() => {
                const { Icon } = getCategoryIconAndColor(part.category, null, null);
                return <Icon weight="duotone" className="w-6 h-6 text-muted-foreground/40" />;
              })()
            )}
          </div>
          <span className="font-bold text-foreground hover:text-red-400 transition-colors">{part.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
        {part.sku}<br/>
        <span className="text-brandBlue-600 dark:text-brandBlue-400/80">{part.oem}</span>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 bg-secondary rounded-md text-xs font-semibold border border-border/50">{part.category}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Unit Price</span>
          <span className="mt-1 text-base font-semibold text-foreground tabular-nums">
            {formatCurrency(part.price)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quantity</span>
          <span className={`mt-1 text-base font-semibold tabular-nums ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
            {part.stock} / {part.minStock}
          </span>
          {isLowStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-2xs font-extrabold text-destructive">
              LOW STOCK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brandBlue-500/10 border border-brandBlue-500/25 text-2xs font-extrabold text-brandBlue-600 dark:text-brandBlue-400">
              IN STOCK
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('purchasingIntent', { detail: part }));
              if (setPage) setPage('purchasing');
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/35 bg-background px-2.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Create PO"
            aria-label={`Create PO for ${part.name}`}
          >
            <ShoppingCart weight="bold" className="w-3.5 h-3.5 shrink-0" />
            Create PO
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); openAdjustStockModal(part); }}
            className="inline-flex h-8 w-8 items-center justify-center bg-background hover:bg-brandBlue-500/10 text-muted-foreground hover:text-brandBlue-600 dark:hover:text-brandBlue-400 rounded-lg border border-border/60 hover:border-brandBlue-500/30 transition-all"
            title="Adjust Stock Count"
            aria-label="Adjust stock count"
          >
            <Sliders weight="duotone" className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); openEditModal(part); }}
            className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground bg-background hover:bg-secondary rounded-lg transition-colors border border-border/60"
            title="Edit"
            aria-label="Edit part"
          >
            <Wrench weight="duotone" className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                onDeletePart(part.id);
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-destructive bg-background hover:bg-destructive/10 rounded-lg transition-colors border border-border/60 hover:border-destructive/30"
            title="Archive"
            aria-label="Archive part"
          >
            <XCircle weight="duotone" className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

PartTableRow.displayName = 'PartTableRow';

export default PartTableRow;

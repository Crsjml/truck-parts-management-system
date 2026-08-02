import React, { memo } from 'react';
import { Sliders, Wrench, XCircle } from '@phosphor-icons/react';
import { getCategoryPlaceholder, getCategoryIconAndColor } from '../utils/categoryIcons';

const PartTableRow = memo(({ 
  part, 
  openDetailsModal, 
  formatCurrency,
  formatBaseCurrency,
  openAdjustStockModal,
  openEditModal,
  onDeletePart
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
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(part.price)}</span>
          <span className="text-xs text-muted-foreground/70 font-medium" title="Wholesale / Base Cost">
            {formatBaseCurrency(part.price)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span className={`font-mono font-bold ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
            {part.stock} / {part.minStock}
          </span>
          {isLowStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-2xs font-extrabold text-destructive">
              LOW STOCK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/40 text-2xs font-extrabold text-emerald-500">
              IN STOCK
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); openAdjustStockModal(part); }}
            className="p-1.5 bg-background hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 rounded border border-border/50 hover:border-emerald-500/30 transition-all"
            title="Adjust Stock Count"
          >
            <Sliders weight="duotone" className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); openEditModal(part); }}
            className="p-1.5 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors border border-border"
            title="Edit"
          >
            <Wrench weight="duotone" className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                onDeletePart(part.id);
              }
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary/50 hover:bg-destructive/10 rounded-lg transition-colors border border-border hover:border-destructive/30"
            title="Archive"
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

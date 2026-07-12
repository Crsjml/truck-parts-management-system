import React, { memo } from 'react';
import { getCategoryPlaceholder } from '../utils/categoryIcons';

const PartTableRow = memo(({ 
  part, 
  openDetailsModal, 
  formatCurrency 
}) => {
  const isLowStock = part.stock <= part.minStock;
  return (
    <tr 
      className="hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={() => openDetailsModal(part)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-900 border border-border/20 shrink-0">
            {part.image ? (
              <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <img src={getCategoryPlaceholder(part.category)} alt={part.name} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80" />
            )}
          </div>
          <span className="font-bold text-foreground hover:text-red-400 transition-colors">{part.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
        {part.sku}<br/>
        <span className="text-brandBlue-400/80">{part.oem}</span>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 bg-secondary rounded-md text-xs font-semibold border border-border/50">{part.category}</span>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
        {formatCurrency(part.price)}
      </td>
      <td className="px-4 py-3 text-right font-mono font-bold">
        {part.stock}
      </td>
      <td className="px-4 py-3 text-center">
        {isLowStock ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-950/70 border border-red-800/40 text-2xs font-extrabold text-red-500">
            LOW STOCK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/40 text-2xs font-extrabold text-emerald-500">
            IN STOCK
          </span>
        )}
      </td>
    </tr>
  );
});

PartTableRow.displayName = 'PartTableRow';

export default PartTableRow;

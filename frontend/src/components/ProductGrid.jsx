import React, { useState } from 'react';
import Select from 'react-select';
import { Truck, ShoppingCart, ArrowRight, Star, Tag, SquaresFour, ListDashes, ClipboardText, Plus, ShieldCheck, GridFour } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';

export default function ProductGrid({
  filteredParts,
  paginatedParts,
  getCategoryStyles,
  getCategoryPlaceholder,
  addToCart,
  setSelectedPart,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  sortOrder,
  setSortOrder
}) {
  const { formatCurrency } = useSettings();
  const [viewMode, setViewMode] = useState('grid-3x'); // 'grid-3x' | 'grid-5x' | 'table'

  const sortOptions = [
    { value: 'recommended', label: 'Sort by: Recommended' },
    { value: 'price-asc', label: 'Sort by: Price (Low to High)' },
    { value: 'price-desc', label: 'Sort by: Price (High to Low)' },
    { value: 'name-asc', label: 'Sort by: Name (A to Z)' },
    { value: 'name-desc', label: 'Sort by: Name (Z to A)' },
    { value: 'stock-desc', label: 'Sort by: Stock (High to Low)' },
    { value: 'stock-asc', label: 'Sort by: Stock (Low to High)' }
  ];

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))',
      borderRadius: '9999px',
      padding: '0px 8px',
      minHeight: '36px',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--accent) / 0.2)' : 'none',
      cursor: 'pointer',
      '&:hover': {
        borderColor: 'hsl(var(--border))'
      },
      transition: 'all 0.15s ease'
    }),
    singleValue: (base) => ({
      ...base,
      fontSize: '0.75rem',
      fontWeight: '700',
      color: 'hsl(var(--muted-foreground))',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '0 4px',
      color: 'hsl(var(--muted-foreground))'
    }),
    menu: (base) => ({
      ...base,
      background: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '1rem',
      overflow: 'hidden',
      zIndex: 50,
      width: 'max-content',
      minWidth: '100%',
      right: 0,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--accent) / 0.1)' 
        : state.isFocused 
          ? 'hsl(var(--secondary))' 
          : 'transparent',
      color: state.isSelected ? 'hsl(var(--accent))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '600',
      padding: '10px 16px',
      '&:active': {
        backgroundColor: 'hsl(var(--accent) / 0.2)'
      }
    })
  };

  return (
    <section className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display">Shop catalog</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground font-display">Popular parts for customer browsing</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <div className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
              {filteredParts.length} results
            </div>
            
            <div className="relative flex items-center min-w-[200px] z-30">
              <Select
                value={sortOptions.find(o => o.value === (sortOrder || 'recommended'))}
                onChange={(selected) => setSortOrder?.(selected.value)}
                options={sortOptions}
                styles={selectStyles}
                isSearchable={false}
                menuPortalTarget={document.body}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid-3x')}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors ${viewMode === 'grid-3x' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Standard Grid View"
                title="Standard Grid (3x)"
              >
                <SquaresFour weight={viewMode === 'grid-3x' ? "fill" : "duotone"} className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">3x</span>
              </button>
              <button
                onClick={() => setViewMode('grid-5x')}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors ${viewMode === 'grid-5x' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Compact Grid View"
                title="Compact Grid (5x)"
              >
                <GridFour weight={viewMode === 'grid-5x' ? "fill" : "duotone"} className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">5x</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-colors ${viewMode === 'table' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Table View"
                title="List View"
              >
                <ListDashes weight={viewMode === 'table' ? "fill" : "duotone"} className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">List</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode.startsWith('grid') ? (
          <div className={`grid gap-6 ${viewMode === 'grid-5x' ? 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
            {paginatedParts.map((part) => {
              const { icon: CatIcon, color, bg } = getCategoryStyles(part.category);
              const isCompact = viewMode === 'grid-5x';
              return (
                <article
                  key={part.id}
                  className="group relative rounded-[2rem] border border-border/50 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 flex flex-col h-full shadow-sm hover:shadow-xl hover:shadow-black/5"
                >
                  {/* Image Section */}
                  <div className={`relative w-full overflow-hidden rounded-[2rem] bg-slate-900 flex items-center justify-center p-1 ${isCompact ? 'h-40' : 'h-56'}`}>
                    {part.image ? (
                      <img src={part.image} alt={part.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    ) : (
                      <img src={getCategoryPlaceholder(part.category)} alt={part.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    
                    {/* Top Left: Category Tag */}
                    <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full backdrop-blur-md bg-black/40 text-white border border-white/20 ${isCompact ? 'px-2 py-1 text-[8px]' : 'px-3 py-1.5 text-[10px]'} font-bold uppercase tracking-[0.2em] shadow-lg`}>
                      {CatIcon && <CatIcon weight="duotone" className={isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
                      <span className={isCompact ? 'hidden sm:block' : ''}>{part.category}</span>
                    </div>

                    {/* Floating Tags over Image: Price & OEM */}
                    <div className={`absolute left-3 flex gap-2 ${isCompact ? 'bottom-3' : 'bottom-4'}`}>
                      <div className={`rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md text-white shadow-xl flex flex-col justify-center ${isCompact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'}`}>
                        <p className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} font-bold opacity-70 uppercase tracking-[0.2em] mb-0.5`}>Unit Price</p>
                        <p className={`${isCompact ? 'text-sm' : 'text-base'} font-black leading-none`}>{formatCurrency(part.price)}</p>
                      </div>
                      {!isCompact && (
                        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-3.5 py-2 text-white shadow-xl flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck weight="fill" className="w-3.5 h-3.5" /> OEM
                          </p>
                          <p className="text-[9px] font-medium opacity-70 mt-0.5 uppercase tracking-widest">Verified</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FAB Button */}
                  <button
                    type="button"
                    onClick={() => addToCart(part)}
                    disabled={part.stock === 0}
                    className={`absolute flex items-center justify-center rounded-full bg-foreground text-background shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 z-10 border-[6px] border-background ${isCompact ? 'right-3 top-[8rem] h-12 w-12' : 'right-5 top-[12rem] h-14 w-14'}`}
                  >
                    <Plus weight="bold" className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} />
                  </button>

                  {/* Content Section */}
                  <div className={`flex flex-col flex-1 ${isCompact ? 'p-4 pt-3 gap-2' : 'p-6 pt-5 gap-3'}`}>
                    <div>
                      <p className={`mb-1 uppercase tracking-[0.24em] font-bold text-accent/80 dark:text-red-400/80 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>SKU {part.sku}</p>
                      <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-bold text-foreground leading-tight line-clamp-2`}>{part.name}</h3>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star weight="fill" className="text-amber-400 w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold text-muted-foreground">{part.reviewStats?.averageRating || 0} ({part.reviewStats?.totalReviews || 0})</span>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between mt-auto border-t border-border/50 ${isCompact ? 'pt-3' : 'pt-4'}`}>
                      <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-bold flex items-center gap-1.5 ${part.stock > 0 ? (part.stock <= part.minStock ? 'text-amber-500' : 'text-emerald-500') : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${part.stock > 0 ? (part.stock <= part.minStock ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-red-500'}`} />
                        {part.stock > 0 ? `${part.stock} in stock` : 'Out of Stock'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPart(part)}
                        className={`font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 ${isCompact ? 'text-[9px]' : 'text-[11px]'}`}
                      >
                        Details <ArrowRight weight="bold" className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto bg-background rounded-3xl border border-border shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider border-b border-border bg-secondary/30">
                  <th className="py-4 px-6">SKU</th>
                  <th className="py-4 px-4">Part Details</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Compatibility</th>
                  <th className="py-4 px-4 text-right">Price</th>
                  <th className="py-4 px-4 text-center">Stock</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedParts.map((part) => {
                  const { icon: CatIcon, color, bg } = getCategoryStyles(part.category);
                  return (
                    <tr key={part.id} className="even:bg-secondary/30 hover:bg-secondary/80 transition-colors group">
                      <td className="py-2.5 px-6 font-mono font-bold text-accent dark:text-red-300 text-xs tracking-tight">
                        {part.sku}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => setSelectedPart(part)} className="font-bold text-foreground hover:text-accent transition-colors text-left text-sm line-clamp-1">
                            {part.name}
                          </button>
                          <div className="flex items-center gap-1">
                            <Star weight="fill" className="text-amber-400 w-3 h-3" />
                            <span className="text-[9px] font-bold text-muted-foreground">{part.reviewStats?.averageRating || 0} ({part.reviewStats?.totalReviews || 0} reviews)</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                         <div className={`inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${bg} ${color}`}>
                           {CatIcon && <CatIcon weight="duotone" className="w-3 h-3" />}
                           {part.category}
                         </div>
                      </td>
                      <td className="py-2.5 px-4 max-w-[150px]">
                        <p className="text-xs text-muted-foreground truncate" title={part.compatibility}>
                          {part.compatibility}
                        </p>
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-foreground text-sm">
                        {formatCurrency(part.price)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                         <div className="flex items-center justify-center gap-2" title={`${part.stock} available`}>
                           <div className={`w-2 h-2 rounded-full ${part.stock > 0 ? (part.stock <= part.minStock ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]') : 'bg-red-500'}`} />
                           <span className="text-xs font-bold text-muted-foreground w-6 text-left">{part.stock}</span>
                         </div>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPart(part)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border text-foreground hover:bg-foreground hover:border-foreground hover:text-background transition-all shadow-sm"
                            aria-label="View Details"
                          >
                            <ArrowRight weight="bold" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(part)}
                            disabled={part.stock === 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border text-foreground hover:bg-accent hover:border-accent hover:text-white transition-all disabled:opacity-50 shadow-sm"
                            aria-label="Add to Quote"
                          >
                            <Plus weight="bold" className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {Math.ceil(filteredParts.length / itemsPerPage) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Previous
            </button>
            {Array.from({ length: Math.ceil(filteredParts.length / itemsPerPage) }, (_, i) => i + 1).map(pageNumber => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  currentPage === pageNumber
                    ? 'bg-accent text-white font-extrabold shadow-md shadow-accent/20 border border-transparent'
                    : 'border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredParts.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredParts.length / itemsPerPage)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

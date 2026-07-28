import React, { useState } from 'react';
import Select from 'react-select';
import { ArrowRight, Star, SquaresFour, ListDashes, Plus, GridFour, Truck, Package, MagnifyingGlass, Wrench } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';

const getAvailableStock = (part) => part.stock - (part.reservedStock || 0);

const getStockLabel = (part) => {
  const availableStock = getAvailableStock(part);
  if (availableStock <= 0) return 'Out of stock';
  if (availableStock <= part.minStock) return `${availableStock} left`;
  return `${availableStock} in stock`;
};

const getStockTone = (part) => {
  const availableStock = getAvailableStock(part);
  if (availableStock <= 0) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (availableStock <= part.minStock) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
  return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
};

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('start-ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('end-ellipsis');
  pages.push(totalPages);

  return pages;
};

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
  setSortOrder,
  selectedTruckSummary = 'All compatible trucks',
  vehicleFilter,
  search = '',
  priceRangeError = '',
  onClearFilters,
  onChangeTruck
}) {
  const { formatCurrency } = useSettings();
  const [viewMode, setViewMode] = useState('grid-3x');

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

  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const hasTruckFilter = Boolean(vehicleFilter?.brand);

  return (
    <section className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <div className="mb-6 flex flex-col gap-4 text-left lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Product catalog</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground">Parts ready to check and order</h2>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              {hasTruckFilter ? `Showing parts compatible with ${selectedTruckSummary}.` : 'Select a truck above when fitment matters.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <div className="relative z-30 flex min-w-[200px] items-center">
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
                type="button"
                onClick={() => setViewMode('grid-3x')}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors ${viewMode === 'grid-3x' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Comfortable grid view"
                title="Comfortable grid"
              >
                <SquaresFour weight={viewMode === 'grid-3x' ? 'fill' : 'duotone'} className="h-4 w-4" />
                <span className="hidden text-[10px] font-bold uppercase tracking-wider sm:block">Comfortable</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid-5x')}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors ${viewMode === 'grid-5x' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Compact grid view"
                title="Compact grid"
              >
                <GridFour weight={viewMode === 'grid-5x' ? 'fill' : 'duotone'} className="h-4 w-4" />
                <span className="hidden text-[10px] font-bold uppercase tracking-wider sm:block">Compact</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors ${viewMode === 'table' ? 'bg-accent/10 text-accent dark:text-red-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="List view"
                title="List view"
              >
                <ListDashes weight={viewMode === 'table' ? 'fill' : 'duotone'} className="h-4 w-4" />
                <span className="hidden text-[10px] font-bold uppercase tracking-wider sm:block">List</span>
              </button>
            </div>
          </div>
        </div>

        {filteredParts.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-background/80 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              {priceRangeError ? <Wrench weight="duotone" className="h-7 w-7" /> : <MagnifyingGlass weight="duotone" className="h-7 w-7" />}
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-foreground">No parts match these filters</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-muted-foreground">
              {priceRangeError ? 'Fix the price range to continue.' : `We could not find parts for ${selectedTruckSummary}${search ? ` matching "${search}"` : ''}. Try to broaden the search, clear filters, or ask the shop for fitment help.`}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-[44px] rounded-xl bg-foreground px-5 text-xs font-black uppercase tracking-[0.18em] text-background transition hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={onChangeTruck}
                className="min-h-[44px] rounded-xl border border-border bg-secondary/40 px-5 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Check another truck
              </button>
            </div>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">Need help? Contact the shop with your truck model and the part name.</p>
          </div>
        ) : viewMode.startsWith('grid') ? (
          <div className={`grid gap-6 ${viewMode === 'grid-5x' ? 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
            {paginatedParts.map((part) => {
              const { icon: CatIcon, color } = getCategoryStyles(part.category);
              const isCompact = viewMode === 'grid-5x';
              const availableStock = getAvailableStock(part);
              const isOutOfStock = availableStock <= 0;
              return (
                <article
                  key={part.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-background/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-xl hover:shadow-black/5"
                >
                  <div className={`relative flex w-full items-center justify-center overflow-hidden bg-secondary ${isCompact ? 'h-36' : 'h-48'}`}>
                    <img
                      src={part.image || getCategoryPlaceholder(part.category)}
                      alt={part.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getCategoryPlaceholder(part.category);
                      }}
                      className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                    <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md ${isCompact ? 'px-2 py-1 text-[8px]' : 'px-3 py-1.5 text-[10px]'} font-bold uppercase tracking-[0.18em]`}>
                      {CatIcon && <CatIcon weight="duotone" className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
                      <span className={isCompact ? 'hidden sm:block' : ''}>{part.category}</span>
                    </div>

                    <div className={`absolute bottom-3 left-3 rounded-2xl border border-white/10 bg-black/45 text-white shadow-xl backdrop-blur-md ${isCompact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'}`}>
                      <p className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} mb-0.5 font-bold uppercase tracking-[0.2em] opacity-70`}>Unit Price</p>
                      <p className={`${isCompact ? 'text-sm' : 'text-base'} font-black leading-none`}>{formatCurrency(part.price)}</p>
                    </div>
                  </div>

                  <div className={`flex flex-1 flex-col ${isCompact ? 'gap-2 p-4' : 'gap-3 p-5'}`}>
                    <div>
                      <p className={`mb-1 font-bold uppercase tracking-[0.24em] text-accent/80 dark:text-red-400/80 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>SKU {part.sku}</p>
                      <h3 className={`${isCompact ? 'text-sm' : 'text-base'} line-clamp-2 font-bold leading-tight text-foreground`}>{part.name}</h3>
                      <div className="mt-1.5 flex items-center gap-1">
                        <Star weight="fill" className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[10px] font-bold text-muted-foreground">{part.reviewStats?.averageRating || 0} ({part.reviewStats?.totalReviews || 0})</span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs font-semibold text-muted-foreground">
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 ${getStockTone(part)}`}>
                        <Package weight="fill" className="h-3.5 w-3.5" />
                        {getStockLabel(part)}
                      </span>
                      <span className="inline-flex items-start gap-1.5 leading-snug">
                        <Truck weight="duotone" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent dark:text-red-300" />
                        <span className="line-clamp-2">{part.compatibility || 'Compatibility listed in details'}</span>
                      </span>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedPart(part)}
                        className="min-h-[42px] rounded-xl border border-border bg-secondary/40 px-3 text-xs font-black uppercase tracking-[0.14em] text-foreground transition hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => addToCart(part)}
                        disabled={isOutOfStock}
                        aria-label={isOutOfStock ? 'Out of stock' : undefined}
                        className="min-h-[42px] rounded-xl bg-accent px-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none"
                      >
                        {isOutOfStock ? 'Unavailable' : 'Add'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-background shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-4 py-4">Part Details</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Compatibility</th>
                  <th className="px-4 py-4 text-right">Price</th>
                  <th className="px-4 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedParts.map((part) => {
                  const { icon: CatIcon, color, bg } = getCategoryStyles(part.category);
                  const availableStock = getAvailableStock(part);
                  const isOutOfStock = availableStock <= 0;
                  return (
                    <tr key={part.id} className="group transition-colors even:bg-secondary/30 hover:bg-secondary/80">
                      <td className="px-6 py-2.5 font-mono text-xs font-bold tracking-tight text-accent dark:text-red-300">
                        {part.sku}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => setSelectedPart(part)} className="line-clamp-1 text-left text-sm font-bold text-foreground transition-colors hover:text-accent">
                            {part.name}
                          </button>
                          <div className="flex items-center gap-1">
                            <Star weight="fill" className="h-3 w-3 text-amber-400" />
                            <span className="text-[9px] font-bold text-muted-foreground">{part.reviewStats?.averageRating || 0} ({part.reviewStats?.totalReviews || 0} reviews)</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${bg} ${color}`}>
                          {CatIcon && <CatIcon weight="duotone" className="h-3 w-3" />}
                          {part.category}
                        </div>
                      </td>
                      <td className="max-w-[150px] px-4 py-2.5">
                        <p className="truncate text-xs text-muted-foreground" title={part.compatibility}>
                          {part.compatibility || 'Compatibility listed in details'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-black text-foreground">
                        {formatCurrency(part.price)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2" title={`${availableStock} available`}>
                          <div className={`h-2 w-2 rounded-full ${availableStock > 0 ? (availableStock <= part.minStock ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]') : 'bg-red-500'}`} />
                          <span className="w-16 text-left text-xs font-bold text-muted-foreground">{getStockLabel(part)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPart(part)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all hover:border-foreground hover:bg-foreground hover:text-background"
                            aria-label="View Details"
                          >
                            <ArrowRight weight="bold" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(part)}
                            disabled={isOutOfStock}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all hover:border-accent hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={isOutOfStock ? 'Out of stock' : 'Add to Cart'}
                          >
                            <Plus weight="bold" className="h-4 w-4" />
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

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-border/50 pt-4">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Previous
            </button>
            {visiblePages.map((page) => (
              typeof page === 'number' ? (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`h-9 w-9 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    currentPage === page
                      ? 'border border-transparent bg-accent text-white shadow-md shadow-accent/20'
                      : 'border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={page} className="px-1 text-xs font-bold text-muted-foreground">...</span>
              )
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

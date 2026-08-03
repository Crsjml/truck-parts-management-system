import React, { useMemo, useState } from 'react';
import { CaretDown, CaretLeft, CaretRight, Funnel, MagnifyingGlass, Package, Plus, SquaresFour } from '@phosphor-icons/react';
import { getCategoryIconAndColor } from '../../utils/categoryIcons';

const ITEMS_PER_PAGE = 8;

export default function PosCatalogPanel({ parts, cart, onAddToCart, formatCurrency, searchInputRef }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Extract unique categories from active catalog parts
  const categories = useMemo(() => {
    const set = new Set();
    for (const p of parts) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [parts]);

  // Brand and series options dynamically extracted from parts
  const { brands, seriesForBrand } = useMemo(() => {
    const brandSet = new Set();
    const seriesSet = new Set();
    for (const part of parts) {
      for (const c of part.compatibleWith || []) {
        if (c.brand && c.brand !== 'Universal') brandSet.add(c.brand);
        if (brand && c.brand === brand && c.series) seriesSet.add(c.series);
      }
    }
    return {
      brands: Array.from(brandSet).sort(),
      seriesForBrand: Array.from(seriesSet).sort()
    };
  }, [parts, brand]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return parts.filter((part) => {
      // Category filter
      if (selectedCategory !== 'ALL' && part.category !== selectedCategory) {
        return false;
      }

      // Search term filter
      const matchesText =
        !term ||
        part.name.toLowerCase().includes(term) ||
        (part.sku || '').toLowerCase().includes(term) ||
        (part.oem || '').toLowerCase().includes(term);

      if (!matchesText) return false;
      if (!brand) return true;

      // Vehicle compatibility filter
      const comp = part.compatibleWith || [];
      const hasBrand = comp.some((c) => c.brand === brand || c.brand === 'Universal');
      if (!hasBrand) return false;
      if (!series) return true;

      return comp.some(
        (c) => (c.brand === brand || c.brand === 'Universal') && (c.series === series || !c.series)
      );
    });
  }, [parts, selectedCategory, search, brand, series]);

  // Total pages calculation & current page slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const currentItems = filtered.slice(startIndex, endIndex);

  // Filter change handlers that reset page to 1
  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleBrandChange = (val) => {
    setBrand(val);
    setSeries('');
    setPage(1);
  };

  const handleSeriesChange = (val) => {
    setSeries(val);
    setPage(1);
  };

  const pressable = 'transition-transform duration-150 ease-out active:scale-[0.97]';

  return (
    <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 h-full">
      {/* Left Category Rail */}
      <aside className="w-full min-w-[120px] md:w-48 lg:w-56 md:max-w-[40%] md:resize-x shrink-0 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto max-h-[140px] md:max-h-full hide-scrollbar">
        <button
          type="button"
          onClick={() => handleCategorySelect('ALL')}
          aria-pressed={selectedCategory === 'ALL'}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left shrink-0 ${
            selectedCategory === 'ALL'
              ? 'bg-accent text-white'
              : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
          }`}
        >
          <SquaresFour weight="bold" className="w-4 h-4 shrink-0" />
          <span className="break-words whitespace-normal leading-tight">All</span>
        </button>

        {categories.map((cat) => {
          const { Icon } = getCategoryIconAndColor(cat);
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySelect(cat)}
              aria-pressed={active}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left shrink-0 ${
                active
                  ? 'bg-accent text-white'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border'
              }`}
            >
              <Icon weight="bold" className="w-4 h-4 shrink-0" />
              <span className="break-words whitespace-normal leading-tight">{cat}</span>
            </button>
          );
        })}
      </aside>

      {/* Center Main Area: Search, Filters & Product Grid */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Header & Results count */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Find a Part</h3>
          <span className="text-xs font-mono text-muted-foreground">
            {filtered.length === 0
              ? '0 results'
              : `${startIndex + 1}–${endIndex} of ${filtered.length} results`}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlass weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            id="pos-search"
            type="text"
            aria-label="Search parts by name, SKU or OEM"
            placeholder="Part name, SKU, or OEM number…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('part-btn-0')?.focus();
              }
            }}
            className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-background border border-border text-2xs font-mono font-bold text-muted-foreground pointer-events-none">
            F2
          </kbd>
        </div>

        {/* Collapsible Vehicle Compatibility Filter */}
        <div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="pos-vehicle-filters"
            className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <Funnel weight="bold" className="w-3.5 h-3.5" />
            Vehicle filter
            {(brand || series) && <span className="text-accent">on</span>}
            <CaretDown weight="bold" className={`w-3 h-3 transition-transform duration-150 ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {filtersOpen && (
            <div id="pos-vehicle-filters" className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label htmlFor="pos-brand" className="block text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Brand
                </label>
                <select
                  id="pos-brand"
                  value={brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">Any brand</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="pos-series" className="block text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Series
                </label>
                <select
                  id="pos-series"
                  value={series}
                  disabled={!brand}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                >
                  <option value="">Any model</option>
                  {seriesForBrand.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 2x4 Product Grid */}
        <div className="flex-1 min-h-[320px]">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Package weight="duotone" className="w-10 h-10 text-muted-foreground opacity-40" />
              <p className="text-sm font-bold text-foreground">No parts match this search</p>
              <p className="text-xs text-muted-foreground">Try selecting a different category or clearing filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentItems.map((part, index) => {
                const inCart = cart.find((i) => i.id === part.id);
                const available = part.stock - (part.reservedStock || 0);
                const remaining = available - (inCart ? inCart.quantity : 0);
                const canAdd = remaining > 0;

                return (
                  <button
                    key={part.id}
                    id={`part-btn-${index}`}
                    type="button"
                    onClick={() => canAdd && onAddToCart(part)}
                    onKeyDown={(e) => {
                      const isTwoCol = window.innerWidth >= 640; // sm breakpoint
                      let nextIndex = index;
                      if (e.key === 'ArrowRight') nextIndex = index + 1;
                      else if (e.key === 'ArrowLeft') nextIndex = index - 1;
                      else if (e.key === 'ArrowDown') nextIndex = index + (isTwoCol ? 2 : 1);
                      else if (e.key === 'ArrowUp') nextIndex = index - (isTwoCol ? 2 : 1);
                      else return;

                      if (nextIndex >= 0 && nextIndex < currentItems.length) {
                        e.preventDefault();
                        document.getElementById(`part-btn-${nextIndex}`)?.focus();
                      } else if (nextIndex < 0) {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
                    aria-label={`Add ${part.name}`}
                    aria-disabled={!canAdd}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-left transition-colors ${
                      canAdd
                        ? `bg-secondary ${remaining > 0 && remaining <= 3 ? 'border-amber-500/40' : 'border-border'} hover:border-accent/50 cursor-pointer`
                        : 'bg-background border-border/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-bold line-clamp-2 ${canAdd ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {part.name}
                      </p>
                      {canAdd && <Plus weight="bold" className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <span className="text-2xs font-mono text-muted-foreground truncate">
                        {available === 0
                          ? 'out of stock'
                          : remaining <= 0
                            ? 'all in cart'
                            : `${remaining} left`}
                      </span>
                      <span className="text-xs font-bold font-mono text-foreground">
                        {formatCurrency(part.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous Page"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed ${pressable}`}
          >
            <CaretLeft weight="bold" className="w-3.5 h-3.5" /> Prev
          </button>

          <span className="text-xs font-mono text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next Page"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-bold text-foreground disabled:opacity-40 disabled:cursor-not-allowed ${pressable}`}
          >
            Next <CaretRight weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

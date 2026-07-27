// frontend/src/components/pos/PosCatalogPanel.jsx
import React, { useMemo, useState } from 'react';
import { CaretDown, Funnel, MagnifyingGlass, Package, Plus } from '@phosphor-icons/react';

export default function PosCatalogPanel({ parts, cart, onAddToCart, formatCurrency, searchInputRef }) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Brand and series options come from the catalog itself, so they can never
  // drift out of sync with the data.
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
      const matchesText =
        !term ||
        part.name.toLowerCase().includes(term) ||
        (part.sku || '').toLowerCase().includes(term) ||
        (part.oem || '').toLowerCase().includes(term);

      if (!matchesText) return false;
      if (!brand) return true;

      const comp = part.compatibleWith || [];
      const hasBrand = comp.some((c) => c.brand === brand || c.brand === 'Universal');
      if (!hasBrand) return false;
      if (!series) return true;

      return comp.some(
        (c) => (c.brand === brand || c.brand === 'Universal') && (c.series === series || !c.series)
      );
    });
  }, [parts, search, brand, series]);

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 h-full">
      <div className="flex items-baseline justify-between pb-3 border-b border-border">
        <h3 className="text-lg font-bold text-foreground font-display">Find a Part</h3>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          ref={searchInputRef}
          id="pos-search"
          type="text"
          aria-label="Search parts by name, SKU or OEM"
          placeholder="Part name, SKU, or OEM number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary border border-border rounded-xl pl-12 pr-12 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-background border border-border text-2xs font-mono font-bold text-muted-foreground pointer-events-none">
          F2
        </kbd>
      </div>

      {/* Vehicle compatibility */}
      <div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="pos-vehicle-filters"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <Funnel weight="bold" className="w-4 h-4" />
          Vehicle filter
          {(brand || series) && <span className="text-accent">on</span>}
          <CaretDown weight="bold" className={`w-3 h-3 transition-transform duration-150 ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        {filtersOpen && (
          <div id="pos-vehicle-filters" className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label htmlFor="pos-brand" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Vehicle Brand
              </label>
              <select
                id="pos-brand"
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setSeries(''); }}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">Any brand</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pos-series" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Model / Series
              </label>
              <select
                id="pos-series"
                value={series}
                disabled={!brand}
                onChange={(e) => setSeries(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
              >
                <option value="">Any model</option>
                {seriesForBrand.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[280px]">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Package weight="duotone" className="w-10 h-10 text-muted-foreground opacity-40" />
            <p className="text-sm font-bold text-foreground">No parts match this search</p>
            <p className="text-xs text-muted-foreground">Try a shorter term, or clear the vehicle filter.</p>
          </div>
        ) : (
          filtered.map((part) => {
            const inCart = cart.find((i) => i.id === part.id);
            const available = part.stock - (part.reservedStock || 0);
            const remaining = available - (inCart ? inCart.quantity : 0);
            const canAdd = remaining > 0;

            return (
              <button
                key={part.id}
                type="button"
                onClick={() => canAdd && onAddToCart(part)}
                aria-label={`Add ${part.name}`}
                aria-disabled={!canAdd}
                className={`w-full min-h-[56px] px-4 py-3 rounded-xl border flex items-center justify-between gap-4 text-left transition-transform duration-150 ease-out ${
                  canAdd
                    ? `bg-secondary ${remaining > 0 && remaining <= 3 ? 'border-amber-500/40' : 'border-border'} hover:border-accent/50 active:scale-[0.99] cursor-pointer`
                    : 'bg-background border-border/60 cursor-not-allowed'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold truncate ${canAdd ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {part.name}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {part.sku}
                    {available === 0
                      ? ' · out of stock'
                      : remaining <= 0
                        ? ` · all ${available} in cart`
                        : ` · ${remaining} left`}
                  </p>
                </div>

                <p className={`shrink-0 text-sm font-bold font-mono ${canAdd ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {formatCurrency(part.price)}
                </p>

                {canAdd && <Plus weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}


// frontend/src/components/pos/PosCatalogPanel.jsx
import React, { useMemo, useState } from 'react';
import { MagnifyingGlass, Package, Plus } from '@phosphor-icons/react';

const PAGE_SIZE = 10;

export default function PosCatalogPanel({ parts, cart, onAddToCart, formatCurrency, searchInputRef }) {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [series, setSeries] = useState('');
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

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
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          className="w-full bg-secondary border border-border rounded-xl pl-12 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Vehicle compatibility */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pos-brand" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Vehicle Brand
          </label>
          <select
            id="pos-brand"
            value={brand}
            onChange={(e) => { setBrand(e.target.value); setSeries(''); resetPage(); }}
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
            onChange={(e) => { setSeries(e.target.value); resetPage(); }}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          >
            <option value="">Any model</option>
            {seriesForBrand.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[280px]">
        {pageItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Package weight="duotone" className="w-10 h-10 text-muted-foreground opacity-40" />
            <p className="text-sm font-bold text-foreground">No parts match this search</p>
            <p className="text-xs text-muted-foreground">Try a shorter term, or clear the vehicle filter.</p>
          </div>
        ) : (
          pageItems.map((part) => {
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
                className={`w-full min-h-[56px] px-4 py-3 rounded-xl border flex items-center justify-between gap-4 text-left transition-colors ${
                  canAdd
                    ? 'bg-secondary border-border hover:border-accent/50 cursor-pointer'
                    : 'bg-background border-border/60 cursor-not-allowed'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-2xs font-bold uppercase tracking-widest text-brandBlue-400">{part.category}</p>
                  <p className={`text-sm font-bold truncate ${canAdd ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {part.name}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    SKU {part.sku}{part.oem ? ` · OEM ${part.oem}` : ''}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${canAdd ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {formatCurrency(part.price)}
                  </p>
                  {available === 0 ? (
                    <p className="text-xs font-bold text-red-500">Out of stock</p>
                  ) : remaining <= 0 ? (
                    <p className="text-xs font-bold text-amber-500">All {available} in cart</p>
                  ) : (
                    <p className={`text-xs font-semibold ${remaining <= 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {remaining} available
                    </p>
                  )}
                </div>

                {canAdd && <Plus weight="bold" className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-4 py-1.5 bg-secondary text-sm font-semibold text-foreground rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-4 py-1.5 bg-secondary text-sm font-semibold text-foreground rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

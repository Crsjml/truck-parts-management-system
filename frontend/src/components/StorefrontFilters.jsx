import React, { useState } from 'react';
import { MagnifyingGlass, Faders, X, CurrencyDollar, Package, Star, Trash, Truck, CheckCircle, CaretDown } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import Select, { components } from 'react-select';
import CompatibilityFilter from './CompatibilityFilter';

const IconOption = (props) => {
  const Icon = props.data.icon;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {Icon && <Icon weight="duotone" className="h-4 w-4 opacity-70" />}
        <span>{props.data.label}</span>
      </div>
    </components.Option>
  );
};

export default function StorefrontFilters({
  search, setSearch,
  showSuggestions, setShowSuggestions,
  suggestions,
  showFilters, setShowFilters,
  nestedCategories,
  getCategoryStyles,
  selectedCategory, setSelectedCategory,
  vehicleFilter, setVehicleFilter,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  stockStatus, setStockStatus,
  minRating, setMinRating,
  summaryLabel = 'All compatible trucks',
  resultCount = 0,
  priceRangeError = '',
  onClearFilters
}) {
  const [isFitmentExpanded, setIsFitmentExpanded] = useState(false);

  const activeFiltersCount = [
    search.trim() !== '',
    minPrice !== '',
    maxPrice !== '',
    stockStatus !== 'All',
    vehicleFilter?.brand != null,
    selectedCategory !== 'All',
    minRating > 0
  ].filter(Boolean).length;

  const topLevelCategories = nestedCategories?.filter(c => !c.parentCategory) || [];

  let activeMainCatObj = null;
  if (selectedCategory !== 'All') {
    activeMainCatObj = topLevelCategories.find(c => c.name === selectedCategory);
    if (!activeMainCatObj) {
      const subCatObj = nestedCategories?.find(c => c.name === selectedCategory && c.parentCategory);
      if (subCatObj) {
        activeMainCatObj = topLevelCategories.find(c => c.name === subCatObj.parentCategory.name);
      }
    }
  }

  const activeSubcategories = activeMainCatObj
    ? nestedCategories?.filter(c => c.parentCategory?.name === activeMainCatObj.name) || []
    : [];

  const handleClearAll = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }

    setSearch('');
    setSelectedCategory('All');
    setVehicleFilter({ brand: null, series: null });
    setMinPrice('');
    setMaxPrice('');
    setStockStatus('All');
    setMinRating(0);
  };

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--accent) / 0.5)' : 'hsl(var(--border))',
      borderRadius: '0.75rem',
      padding: '0px',
      minHeight: '36px',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--accent) / 0.2)' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--border))'
      },
      transition: 'all 0.15s ease'
    }),
    menu: (base) => ({
      ...base,
      background: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 50,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'hsl(var(--accent) / 0.1)'
        : state.isFocused
          ? 'hsl(var(--secondary))'
          : 'transparent',
      color: state.isSelected ? 'hsl(var(--accent))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      fontSize: '0.875rem',
      padding: '8px 12px',
      ':active': {
        backgroundColor: 'hsl(var(--accent) / 0.2)'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem'
    }),
    indicatorSeparator: () => ({ display: 'none' })
  };

  const stockOptions = [
    { value: 'All', label: 'All Items', icon: Package },
    { value: 'In Stock', label: 'In Stock Only', icon: Package },
    { value: 'Low Stock', label: 'Low Stock Alert', icon: Package },
    { value: 'Out of Stock', label: 'Out of Stock', icon: Package }
  ];

  const ratingOptions = [
    { value: 0, label: 'All Ratings', icon: Star },
    { value: 4, label: '4 Stars & Up', icon: Star },
    { value: 3, label: '3 Stars & Up', icon: Star },
    { value: 2, label: '2 Stars & Up', icon: Star }
  ];

  return (
    <section className="rounded-[1.75rem] border border-border bg-secondary/75 p-4 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-5">
        <div id="catalog-fitment-panel" className="relative overflow-visible rounded-[1.5rem] border border-border/70 bg-background p-4 text-center shadow-sm sm:p-5">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:text-red-300">
                <Truck weight="duotone" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent dark:text-red-300">Fitment confidence</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">{summaryLabel}</h2>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1">
                  <CheckCircle weight="fill" className="h-3.5 w-3.5 text-emerald-500" />
                  {resultCount} compatible results
                </span>
                <span>{vehicleFilter?.brand ? 'Truck fitment is applied.' : 'Choose a truck to narrow parts by fitment.'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFitmentExpanded((expanded) => !expanded)}
              aria-expanded={isFitmentExpanded}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 text-xs font-black uppercase tracking-[0.18em] text-foreground transition hover:border-accent/40 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {isFitmentExpanded ? 'Hide truck selector' : vehicleFilter?.brand ? 'Edit truck' : 'Choose truck'}
              <CaretDown weight="bold" className={`h-3.5 w-3.5 transition-transform ${isFitmentExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isFitmentExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.19, 1, 0.22, 1] }}
                className="mt-4 overflow-visible"
              >
                <CompatibilityFilter onFilterChange={setVehicleFilter} summaryLabel={summaryLabel} vehicleFilter={vehicleFilter} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-30">
          <MagnifyingGlass weight="duotone" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search part name, SKU, OEM..."
            className="min-h-[48px] w-full rounded-[1rem] border border-border bg-background py-3.5 pl-11 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X weight="bold" />
            </button>
          )}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-60 overflow-y-auto rounded-2xl border border-border bg-secondary p-2 shadow-2xl backdrop-blur-xl"
              >
                {suggestions.map((s, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="scroll-fade-edges hide-scrollbar flex flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition shadow-sm ${selectedCategory === 'All' ? 'border-accent/40 bg-accent/10 text-accent dark:text-red-300' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
            >
              All categories
            </button>
            {topLevelCategories.map((category) => {
              const { icon: CatIcon, color } = getCategoryStyles(category.name);
              const isMainActive = activeMainCatObj?.name === category.name;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory === category.name ? 'All' : category.name)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm ${isMainActive ? 'border-accent/40 bg-accent/10 text-accent dark:text-red-300' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
                >
                  {CatIcon && <CatIcon weight="duotone" className={`h-3.5 w-3.5 ${isMainActive ? 'text-accent dark:text-red-300' : color}`} />}
                  {category.name}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm ${showFilters ? 'border-accent bg-accent text-white' : 'border-foreground/10 bg-foreground text-background hover:bg-accent hover:text-white'}`}
            >
              <Faders weight="duotone" className="h-4 w-4" />
              Advanced filters
              {activeFiltersCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm ring-2 ring-secondary">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Trash weight="duotone" className="h-3.5 w-3.5" />
                Reset filters
              </button>
            )}
          </div>

          <AnimatePresence>
            {activeSubcategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
                  <span className="self-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Subcategories</span>
                  {activeSubcategories.map((subCat) => {
                    const { icon: SubIcon, color } = getCategoryStyles(subCat.name);
                    const isSubActive = selectedCategory === subCat.name;
                    return (
                      <button
                        type="button"
                        key={subCat.id}
                        onClick={() => setSelectedCategory(isSubActive ? subCat.parentCategory?.name || 'All' : subCat.name)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm ${isSubActive ? 'border-foreground bg-foreground text-background' : 'border-border/50 bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        {SubIcon && <SubIcon weight="duotone" className={`h-3 w-3 ${isSubActive ? 'text-background' : color}`} />}
                        {subCat.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-visible"
            >
              <div className="border-t border-border/60 pt-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <CurrencyDollar weight="duotone" className="h-3.5 w-3.5" />
                      Price Range
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₱</span>
                        <input
                          aria-label="Minimum price"
                          type="number"
                          min="0"
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          className={`h-[36px] w-full rounded-xl border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-inner-spin-button]:appearance-none ${priceRangeError ? 'border-red-400' : 'border-border'}`}
                        />
                      </div>
                      <span className="font-bold text-muted-foreground">-</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₱</span>
                        <input
                          aria-label="Maximum price"
                          type="number"
                          min="0"
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className={`h-[36px] w-full rounded-xl border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-inner-spin-button]:appearance-none ${priceRangeError ? 'border-red-400' : 'border-border'}`}
                        />
                      </div>
                    </div>
                    {priceRangeError && (
                      <p className="text-xs font-semibold text-red-500">{priceRangeError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Package weight="duotone" className="h-3.5 w-3.5" />
                      Stock Availability
                    </label>
                    <Select
                      value={stockOptions.find(o => o.value === stockStatus)}
                      onChange={(selected) => setStockStatus(selected.value)}
                      options={stockOptions}
                      styles={selectStyles}
                      components={{ Option: IconOption }}
                      isSearchable={false}
                      menuPortalTarget={document.body}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Star weight="duotone" className="h-3.5 w-3.5" />
                      Minimum Rating
                    </label>
                    <Select
                      value={ratingOptions.find(o => o.value === minRating) || ratingOptions[0]}
                      onChange={(selected) => setMinRating(selected.value)}
                      options={ratingOptions}
                      styles={selectStyles}
                      components={{ Option: IconOption }}
                      isSearchable={false}
                      menuPortalTarget={document.body}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

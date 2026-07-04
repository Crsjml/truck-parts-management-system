import React, { useState } from 'react';
import { MagnifyingGlass, Faders, X, CurrencyDollar, Package, SortAscending, CarProfile, Globe, Wrench, PaperPlaneRight, Star, Trash } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import Select, { components } from 'react-select';
import CompatibilityFilter from './CompatibilityFilter';

// Custom Option to render icon inside react-select
const IconOption = (props) => {
  const Icon = props.data.icon;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {Icon && <Icon weight="duotone" className="w-4 h-4 opacity-70" />}
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
  categories,
  getCategoryStyles,
  selectedCategory, setSelectedCategory,
  vehicleFilter, setVehicleFilter,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  stockStatus, setStockStatus,
  sortOrder, setSortOrder,
  minRating, setMinRating
}) {
  const [activeFilterTab, setActiveFilterTab] = useState('vehicle'); // 'vehicle', 'pricing', 'b2b', 'sort'

  const activeFiltersCount = [
    minPrice !== '',
    maxPrice !== '',
    stockStatus !== 'All',
    vehicleFilter?.brand != null,
    selectedCategory !== 'All',
    minRating > 0
  ].filter(Boolean).length;

  const activeTabCounts = {
    vehicle: vehicleFilter?.brand ? 1 : 0,
    pricing: (minPrice || maxPrice ? 1 : 0) + (stockStatus !== 'All' ? 1 : 0) + (minRating > 0 ? 1 : 0)
  };

  const handleClearAll = () => {
    setSearch('');
    setSelectedCategory('All');
    setVehicleFilter({ brand: null, series: null });
    setMinPrice('');
    setMaxPrice('');
    setStockStatus('All');
    setMinRating(0);
  };

  // React-Select dark mode styles matching token system
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
    { value: 'Low Stock', label: 'Low Stock Alert', icon: Package }
  ];

  const sortOptions = [
    { value: 'recommended', label: 'Recommended', icon: SortAscending },
    { value: 'price-asc', label: 'Price: Low to High', icon: SortAscending },
    { value: 'price-desc', label: 'Price: High to Low', icon: SortAscending },
    { value: 'name-asc', label: 'Name: A to Z', icon: SortAscending },
    { value: 'name-desc', label: 'Name: Z to A', icon: SortAscending },
    { value: 'stock-desc', label: 'Stock: High to Low', icon: SortAscending },
    { value: 'stock-asc', label: 'Stock: Low to High', icon: SortAscending }
  ];



  const ratingOptions = [
    { value: 0, label: 'All Ratings', icon: Star },
    { value: 4, label: '4 Stars & Up', icon: Star },
    { value: 3, label: '3 Stars & Up', icon: Star },
    { value: 2, label: '2 Stars & Up', icon: Star }
  ];

  return (
    <section className="rounded-[1.75rem] border border-border bg-secondary/80 p-4 backdrop-blur sm:p-5 flex flex-col gap-6">
      <div className="flex flex-col gap-4 relative z-20">
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          <div className="relative w-full">
            <MagnifyingGlass weight="duotone" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search part name, SKU, OEM..."
              className="w-full rounded-2xl border border-border bg-background py-3.5 pl-11 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/20 shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-border bg-secondary p-2 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto"
                >
                  {suggestions.map((s, idx) => (
                    <li key={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch(s);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex gap-3 w-full lg:w-auto shrink-0">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 lg:flex-none relative flex items-center justify-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm ${showFilters ? 'bg-accent/10 border-accent/30 text-accent dark:text-red-300' : 'bg-background border-border text-foreground hover:bg-background/80'}`}
            >
              <Faders weight="duotone" className="w-4 h-4" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm ring-2 ring-secondary">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button 
                onClick={handleClearAll}
                className="hidden lg:flex items-center justify-center gap-1.5 px-4 text-xs font-bold text-muted-foreground hover:text-accent transition-colors"
              >
                <Trash weight="duotone" className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => {
              const { icon: CatIcon, color } = getCategoryStyles(category);
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm ${selectedCategory === category ? 'border-accent/40 bg-accent/10 dark:bg-accent/20 text-accent dark:text-red-300' : 'border-border bg-background text-muted-foreground hover:border-border hover:text-foreground'}`}
                >
                  {CatIcon && <CatIcon weight="duotone" className={`w-3.5 h-3.5 ${selectedCategory === category ? 'text-accent dark:text-red-300' : color}`} />}
                  {category}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-visible"
          >
            <div className="pt-4 border-t border-border/60">
              
              <div className="flex justify-between items-center mb-4 lg:hidden">
                 <span className="text-xs font-bold text-foreground">Advanced</span>
                 <button onClick={handleClearAll} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"><Trash weight="duotone" className="w-3.5 h-3.5" /> Clear All</button>
              </div>

              {/* Horizontal Pill Nav */}
              <div className="flex justify-center gap-3 overflow-x-auto pb-4 no-scrollbar">
                {[
                  { id: 'vehicle', label: 'Vehicle', icon: CarProfile },
                  { id: 'pricing', label: 'Pricing & Rating', icon: CurrencyDollar }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilterTab(tab.id)}
                    className={`relative flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold transition border ${activeFilterTab === tab.id ? 'bg-background border-border text-foreground shadow-sm' : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                  >
                    <tab.icon weight={activeFilterTab === tab.id ? 'fill' : 'duotone'} className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeTabCounts[tab.id] > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center bg-accent text-white text-[9px] rounded-full w-4 h-4 shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]">
                        {activeTabCounts[tab.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="mt-2 min-h-[120px]">
                {activeFilterTab === 'vehicle' && (
                  <div className="max-w-sm mx-auto">
                    <CompatibilityFilter onFilterChange={setVehicleFilter} />
                  </div>
                )}
                
                {activeFilterTab === 'pricing' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <CurrencyDollar weight="duotone" className="w-3.5 h-3.5" />
                        Price Range
                      </label>
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">₱</span>
                          <input 
                            type="number" 
                            min="0"
                            placeholder="Min" 
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background h-[36px] pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <span className="text-muted-foreground font-bold">-</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">₱</span>
                          <input 
                            type="number" 
                            min="0"
                            placeholder="Max" 
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background h-[36px] pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Package weight="duotone" className="w-3.5 h-3.5" />
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
                        <Star weight="duotone" className="w-3.5 h-3.5" />
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
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

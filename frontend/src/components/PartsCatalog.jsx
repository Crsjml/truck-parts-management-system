import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Funnel, Warning, Plus, Pencil, Trash, Truck, Wrench, Package, X, XCircle, ShoppingCart, FileCode, PaperPlaneRight, CheckCircle, SquaresFour, GridFour, ListDashes, Gear, ShieldCheck, Pulse, Lightning, CarProfile, Tag, Image, WarningCircle, Star, SortAscending } from '@phosphor-icons/react';
import { fetchCategoriesList } from '../authStore';
import CompatibilityFilter from './CompatibilityFilter';
import { useSettings } from '../context/SettingsContext';
import { getCategoryIconAndColor, getCategoryPlaceholder } from '../utils/categoryIcons';
import { z } from 'zod';

const partSchema = z.object({
  name: z.string().min(3, "Part name must be at least 3 characters."),
  sku: z.string().min(1, "SKU is required."),
  oem: z.string().min(1, "OEM number is required."),
  category: z.string().min(1, "Category selection is required."),
  price: z.number().min(0, "Price must be a valid positive number."),
  stock: z.number().min(0, "Stock must be a non-negative number."),
  minStock: z.number().min(0, "Safety min stock must be non-negative.")
});

export default function PartsCatalog({ 
  parts, 
  categories, 
  selectedCategory, 
  setSelectedCategory, 
  onAddPart, 
  onEditPart, 
  onDeletePart,
  onRestockPart,
  isReadOnly = false,
  onAddLog,
  setPage
}) {
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [viewMode, setViewMode] = useState('grid4'); // 'grid3', 'grid4', 'table'
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState({ brand: null, series: null });
  const itemsPerPage = 12;

  const [categoriesList, setCategoriesList] = useState([]);
  const [formImage, setFormImage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const loadCats = async () => {
      const list = await fetchCategoriesList();
      setCategoriesList(list);
    };
    loadCats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, showLowStockOnly, sortOrder]);

  useEffect(() => {
    const handleFilter = (e) => {
      if (e.detail === 'low-stock') {
        setShowLowStockOnly(true);
      }
    };
    window.addEventListener('catalogFilter', handleFilter);
    return () => window.removeEventListener('catalogFilter', handleFilter);
  }, []);

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const candidates = new Set();
    parts.forEach(part => {
      if (part.name.toLowerCase().includes(term)) candidates.add(part.name);
      if (part.sku.toLowerCase().includes(term)) candidates.add(part.sku);
      if (part.oem.toLowerCase().includes(term)) candidates.add(part.oem);
      if (part.compatibility && part.compatibility.toLowerCase().includes(term)) {
        candidates.add(part.compatibility);
      }
    });
    return Array.from(candidates).slice(0, 6);
  }, [search, parts]);

  const getCategoryStyles = (cat) => {
    const category = categoriesList.find(c => c.name === cat);
    const { Icon, color } = getCategoryIconAndColor(cat, category?.iconName, category?.colorTheme);
    return { icon: Icon, color };
  };
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add', 'edit', 'details'
  const [selectedPart, setSelectedPart] = useState(null);
  
  // Restock state inline
  const [restockAmount, setRestockAmount] = useState({});

  // Quote request state for customer mode
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryPart, setInquiryPart] = useState(null);
  const [inquiryQty, setInquiryQty] = useState('1');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const handleRequestQuoteSubmit = (e) => {
    e.preventDefault();
    if (onAddLog && inquiryPart) {
      onAddLog('system', `Quote request submitted by Customer for ${inquiryQty}x ${inquiryPart.name}.`);
    }
    setInquirySuccess(true);
    setIsInquiryModalOpen(false);
  };
  
  // Form state for add/edit
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formOem, setFormOem] = useState('');
  const [formCategory, setFormCategory] = useState('Engine');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('');
  const [formCompatibility, setFormCompatibility] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Funnel logic
  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.sku.toLowerCase().includes(search.toLowerCase()) ||
      part.oem.toLowerCase().includes(search.toLowerCase()) ||
      (part.compatibility && part.compatibility.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || part.stock <= part.minStock;
    
    // TTP-68 compatibility filter
    const matchesVehicle = (() => {
      if (!vehicleFilter.brand) return true;
      const comp = part.compatibleWith || [];
      const hasBrand = comp.some(c => c.brand === vehicleFilter.brand || c.brand === 'Universal');
      if (!hasBrand) return false;
      if (!vehicleFilter.series) return true;
      return comp.some(c => (c.brand === vehicleFilter.brand || c.brand === 'Universal') && (c.series === vehicleFilter.series || !c.series));
    })();
    
    return matchesSearch && matchesCategory && matchesLowStock && matchesVehicle;
  });

  const sortedParts = useMemo(() => {
    const result = [...filteredParts];
    if (sortOrder === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortOrder === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortOrder === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === 'stock-desc') result.sort((a, b) => b.stock - a.stock);
    else if (sortOrder === 'stock-asc') result.sort((a, b) => a.stock - b.stock);
    return result;
  }, [filteredParts, sortOrder]);

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedParts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedParts, currentPage]);

  const openAddModal = () => {
    setModalType('add');
    setFormName('');
    setFormSku('');
    setFormOem('');
    setFormCategory('');
    setFormPrice('');
    setFormStock('');
    setFormMinStock('');
    setFormCompatibility('');
    setFormDescription('');
    setFormImage('');
    setFormErrors({});
    setServerError('');
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const openEditModal = (part) => {
    setModalType('edit');
    setSelectedPart(part);
    setFormName(part.name);
    setFormSku(part.sku);
    setFormOem(part.oem);
    setFormCategory(part.category_id || '');
    setFormPrice(part.price.toString());
    setFormStock(part.stock.toString());
    setFormMinStock(part.minStock.toString());
    setFormCompatibility(part.compatibility || '');
    setFormDescription(part.description || '');
    setFormImage(part.image || '');
    setFormErrors({});
    setServerError('');
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = (part) => {
    setModalType('details');
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    // Zod Validation
    try {
      partSchema.parse({
        name: formName.trim(),
        sku: formSku.trim(),
        oem: formOem.trim(),
        category: formCategory,
        price: Number(formPrice),
        stock: Number(formStock),
        minStock: Number(formMinStock)
      });
      setFormErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = {};
        err.errors.forEach(e => { errors[e.path[0]] = e.message; });
        setFormErrors(errors);
        return;
      }
    }

    const partData = {
      name: formName.trim(),
      sku: formSku.trim(),
      oem: formOem.trim(),
      category_id: formCategory,
      price: parseFloat(formPrice),
      stock: parseInt(formStock),
      minStock: parseInt(formMinStock),
      compatibility: formCompatibility.trim(),
      description: formDescription.trim(),
      image: formImage
    };

    setIsSubmitting(true);
    try {
      let result;
      if (modalType === 'add') {
        result = await onAddPart(partData);
      } else if (modalType === 'edit') {
        result = await onEditPart(selectedPart.id, partData);
      }

      // If the parent returned a result object, check it
      if (result && !result.ok) {
        setServerError(result.error || 'An error occurred. Please try again.');
      } else {
        // Success — close modal
        setIsModalOpen(false);
      }
    } catch (err) {
      setServerError('Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = (partId) => {
    const amount = parseInt(restockAmount[partId]) || 0;
    if (amount > 0) {
      onRestockPart(partId, amount);
      setRestockAmount({ ...restockAmount, [partId]: '' });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Unified Horizontal Toolbar */}
      <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-2xl border border-border overflow-x-auto hide-scrollbar w-full">
        
        {/* Search */}
        <div className="relative w-64 shrink-0">
          <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by part name, SKU, OEM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-foreground placeholder-slate-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-secondary p-2 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
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
            </ul>
          )}
        </div>

        {/* TTP-68: Compatibility Filter */}
        <div className="shrink-0">
          <CompatibilityFilter onFilterChange={setVehicleFilter} />
        </div>

        {/* Spacer to push right actions */}
        <div className="flex-1 min-w-[1rem]"></div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Primary Action Button */}
          {!isReadOnly && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 h-10 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all shrink-0 whitespace-nowrap ml-2"
            >
              <Plus weight="bold" className="w-4 h-4" />
              Add New Part
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-y-2 border-b border-slate-900 pb-2">
        {categories.map((cat) => {
          const { icon: CatIcon, color } = getCategoryStyles(cat);
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'border-accent text-accent glow-text-red' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {CatIcon && <CatIcon weight="duotone" className={`w-4 h-4 ${selectedCategory === cat ? '' : color}`} />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* View Controls Bar */}
      <div className="flex items-center justify-between bg-background/50 border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
          <button 
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${viewMode === 'table' ? 'bg-background text-foreground shadow border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <ListDashes weight={viewMode === 'table' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button 
            onClick={() => setViewMode('grid3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${viewMode === 'grid3' ? 'bg-background text-foreground shadow border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <SquaresFour weight={viewMode === 'grid3' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">Compact</span>
          </button>
          <button 
            onClick={() => setViewMode('grid4')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-semibold ${viewMode === 'grid4' ? 'bg-background text-foreground shadow border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
          >
            <GridFour weight={viewMode === 'grid4' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">Detailed</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative group">
            <SortAscending weight="duotone" className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors pointer-events-none" />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-9 text-xs font-semibold rounded-lg border border-transparent hover:border-border bg-transparent hover:bg-secondary/50 pl-9 pr-3 text-muted-foreground hover:text-foreground cursor-pointer outline-none focus:border-red-600 focus:text-foreground transition-all appearance-none"
            >
              <option value="recommended">Recommended Sort</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
            </select>
          </div>

          {/* Low Stock Toggle */}
          {!isReadOnly && (
            <label className={`flex items-center gap-2 px-3 py-1.5 h-9 rounded-lg border cursor-pointer select-none transition-all duration-200 ${showLowStockOnly ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-transparent border-transparent text-muted-foreground hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400'}`}>
              <input 
                type="checkbox" 
                checked={showLowStockOnly} 
                onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                className="hidden"
              />
              <Warning weight={showLowStockOnly ? "fill" : "duotone"} className={`w-4 h-4 ${showLowStockOnly ? 'text-red-500' : 'text-muted-foreground group-hover:text-red-400'}`} />
              <span className="text-xs font-semibold hidden sm:inline">Low Stock Only</span>
            </label>
          )}
        </div>
      </div>

      {/* Parts Grid / Table */}
      {filteredParts.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <Package weight="duotone" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">No Parts Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            We couldn't find any truck parts matching your search or filters. Try adjusting your query.
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <div className="w-full overflow-x-auto glass-panel rounded-2xl border border-border/50">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/50 border-b border-border/50 text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Part Name</th>
                    <th className="px-4 py-3">SKU / OEM</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedParts.map(part => {
                    const isLowStock = part.stock <= part.minStock;
                    return (
                      <tr 
                        key={part.id} 
                        className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => openDetailsModal(part)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-900 border border-border/20 shrink-0">
                              {part.image ? (
                                <img src={part.image} alt={part.name} className="w-full h-full object-cover" />
                              ) : (
                                <img src={getCategoryPlaceholder(part.category)} alt={part.name} className="w-full h-full object-cover opacity-80" />
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
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`grid gap-5 ${viewMode === 'grid3' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {paginatedParts.map((part) => {
              const isLowStock = part.stock <= part.minStock;
              return (
                <div 
                  key={part.id} 
                  className={`glass-panel p-5 rounded-2xl flex flex-col justify-between glass-panel-hover border-t-2 relative ${
                    isLowStock ? 'border-t-accent/50' : 'border-t-transparent'
                  }`}
                >
                  {/* Low Stock Warning Badge */}
                  {isLowStock && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-2xs font-extrabold text-red-500 animate-pulse z-10">
                      <Warning weight="duotone" className="w-3 h-3" />
                      LOW STOCK
                    </div>
                  )}
  
                  {/* Part Image */}
                  <div className="h-40 rounded-xl overflow-hidden bg-slate-900/60 border border-border/10 mb-4 flex items-center justify-center relative select-none">
                    {part.image ? (
                      <img src={part.image} alt={part.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getCategoryPlaceholder(part.category)} alt={part.name} className="w-full h-full object-cover opacity-80" />
                    )}
                  </div>

                {/* Card Top */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-2xs font-bold uppercase tracking-widest text-brandBlue-400">
                        {part.category}
                      </span>
                      {part.reviewStats?.totalReviews > 0 && (
                        <div className="flex items-center gap-1 text-2xs font-bold text-amber-400">
                          <Star weight="fill" />
                          <span>{part.reviewStats.averageRating} ({part.reviewStats.totalReviews})</span>
                        </div>
                      )}
                    </div>
                    <h4 
                      onClick={() => openDetailsModal(part)}
                      className="font-bold text-foreground hover:text-red-400 cursor-pointer transition-colors leading-snug font-display"
                    >
                      {part.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs border-y border-slate-900 py-2">
                    <div>
                      <span className="text-muted-foreground block">SKU</span>
                      <span className="font-mono text-muted-foreground font-semibold">{part.sku}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">OEM Part No.</span>
                      <span className="font-mono text-muted-foreground font-semibold truncate block">{part.oem}</span>
                    </div>
                  </div>

                  {part.compatibility && (
                    <div className="text-xs space-y-0.5">
                      <span className="text-muted-foreground flex items-center gap-1 font-semibold">
                        <Truck weight="duotone" className="w-3 h-3 text-red-500" /> Fits
                      </span>
                      <p className="text-muted-foreground">{part.compatibility}</p>
                    </div>
                  )}
                </div>

                {/* Card Bottom / Controls */}
                <div className="space-y-3 pt-4 mt-4 border-t border-slate-900">
                  <div className="flex items-end justify-between bg-secondary/20 p-3 rounded-xl border border-border/50">
                    <div>
                      <span className="text-2xs text-muted-foreground uppercase tracking-wider block">Unit Price</span>
                      <span className="text-lg font-bold text-emerald-400">
                        {formatCurrency(part.price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xs text-muted-foreground uppercase tracking-wider block">{isReadOnly ? 'Stock Status' : 'Quantity'}</span>
                      <span className={`text-lg font-extrabold font-mono ${isLowStock && !isReadOnly ? 'text-red-500' : 'text-foreground'}`}>
                        {isReadOnly ? (part.stock > 0 ? `${part.stock} avail` : '0') : `${part.stock} / ${part.minStock}`}
                      </span>
                    </div>
                  </div>

                  {isReadOnly ? (
                    <button 
                      onClick={() => {
                        setInquiryPart(part);
                        setInquiryQty('1');
                        setInquiryMsg('');
                        setIsInquiryModalOpen(true);
                      }}
                      className="w-full py-2 bg-brandBlue-500/10 dark:bg-brandBlue-900 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 text-brandBlue-600 dark:text-brandBlue-300 text-xs font-semibold rounded-lg border border-brandBlue-500/30 dark:border-brandBlue-700/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <PaperPlaneRight weight="duotone" className="w-3.5 h-3.5" /> Request Quote
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('purchasingIntent', { detail: part }));
                          if (setPage) setPage('purchasing');
                        }}
                        className="w-full py-2 px-3 bg-accent/10 hover:bg-accent/20 text-accent dark:text-red-400 text-xs font-bold rounded-lg border border-accent/20 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShoppingCart weight="bold" className="w-4 h-4" /> Create PO
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => openEditModal(part)}
                          className="py-1.5 px-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary text-xs font-semibold rounded-lg transition-colors border border-border flex items-center justify-center gap-1"
                        >
                          <Wrench weight="duotone" className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                              onDeletePart(part.id);
                            }
                          }}
                          className="py-1.5 px-2 text-muted-foreground hover:text-red-500 bg-secondary/50 hover:bg-red-950/20 text-xs font-semibold rounded-lg transition-colors border border-border hover:border-red-500/30 flex items-center justify-center gap-1"
                        >
                          <XCircle weight="duotone" className="w-3.5 h-3.5" /> Archive
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Pagination Controls */}
        {Math.ceil(filteredParts.length / itemsPerPage) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-slate-200/20 dark:border-slate-800/40">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.ceil(filteredParts.length / itemsPerPage) }, (_, i) => i + 1).map(pageNumber => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  currentPage === pageNumber
                    ? 'bg-accent text-white font-extrabold shadow-md shadow-accent/20'
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
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </>
    )}

      {/* Main Dialog Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full ${modalType === 'details' ? 'max-w-xl' : 'max-w-4xl'} bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp`}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground font-display">
                {modalType === 'add' && 'Add New Truck Part'}
                {modalType === 'edit' && 'Edit Part Details'}
                {modalType === 'details' && 'Part Details Overview'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X weight="duotone" className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {modalType === 'details' ? (
              <div className="p-6 space-y-5">
                <div className="space-y-1 bg-background p-4 rounded-xl border border-border flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-border/10">
                    {selectedPart?.image ? (
                      <img src={selectedPart.image} alt={selectedPart.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getCategoryPlaceholder(selectedPart?.category)} alt={selectedPart?.name} className="w-full h-full object-cover opacity-80" />
                    )}
                  </div>
                  <div>
                    <span className="text-2xs font-bold text-brandBlue-400 uppercase tracking-widest">{selectedPart?.category}</span>
                    <h2 className="text-lg font-bold text-foreground font-display leading-tight">{selectedPart?.name}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-background p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">SKU / Warehouse Stock Code</span>
                    <p className="font-mono font-bold text-muted-foreground mt-0.5">{selectedPart?.sku}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">OEM Part Identification</span>
                    <p className="font-mono font-bold text-muted-foreground mt-0.5">{selectedPart?.oem}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground uppercase">Unit Retail Price</span>
                    <p className="font-semibold text-lg text-foreground mt-0.5">{formatCurrency(selectedPart?.price || 0)}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground uppercase">Inventory Quantity</span>
                    <p className={`font-extrabold text-lg mt-0.5 ${selectedPart?.stock <= selectedPart?.minStock ? 'text-red-500' : 'text-emerald-400'}`}>
                      {selectedPart?.stock} units (min: {selectedPart?.minStock})
                    </p>
                  </div>
                </div>

                {selectedPart?.compatibility && (
                  <div className="space-y-1 bg-background p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Truck weight="duotone" className="w-4 h-4 text-red-500" /> Compatible Models
                    </span>
                    <p className="text-muted-foreground text-sm leading-relaxed">{selectedPart.compatibility}</p>
                  </div>
                )}

                {selectedPart?.description && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Technical Description</span>
                    <p className="text-muted-foreground text-sm leading-relaxed">{selectedPart.description}</p>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  {isReadOnly ? (
                    <button 
                      onClick={() => {
                        setIsModalOpen(false);
                        setInquiryPart(selectedPart);
                        setInquiryQty('1');
                        setInquiryMsg('');
                        setIsInquiryModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brandBlue-500/10 dark:bg-brandBlue-900 text-brandBlue-600 dark:text-brandBlue-300 border border-brandBlue-500/30 dark:border-brandBlue-700/30 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <PaperPlaneRight weight="duotone" className="w-3.5 h-3.5" /> Request Quote
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsModalOpen(false);
                        openEditModal(selectedPart);
                      }}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brandBlue-500/10 dark:bg-brandBlue-900 text-brandBlue-600 dark:text-brandBlue-300 border border-brandBlue-500/30 dark:border-brandBlue-700/30 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <Pencil weight="duotone" className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Add / Pencil Form (Bento Box Layout)
              <form onSubmit={handleFormSubmit} className="flex flex-col max-h-[85vh]">
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-left overflow-y-auto custom-scrollbar">
                  {modalType === 'add' && (
                    <div className="md:col-span-2 space-y-1.5 bg-secondary/30 p-3 rounded-xl border border-border">
                      <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <SquaresFour weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Clone Existing Part Template
                      </label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground"
                        onChange={(e) => {
                          const p = parts.find(x => x.id === parseInt(e.target.value));
                          if (p) {
                            setFormName(p.name + ' (Copy)');
                            setFormOem(p.oem);
                            setFormCategory(p.category);
                            setFormPrice(p.price);
                            setFormCompatibility(p.compatibility || '');
                            setFormDescription(p.description || '');
                            // Leave SKU, Stock, and Min Stock empty for the new part
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>-- Select a part to clone its details --</option>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Left Column: Core Identity */}
                  <div className="space-y-4">
                    <div className="space-y-1.5 group">
                      <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formName ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <Package weight="duotone" className={`w-4 h-4 ${formName ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Part Name / Component Title *
                        {formName && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Starter Motor Assembly (24V)"
                        value={formName}
                        onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({...prev, name: ''})); }}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formName ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                      />
                      {formErrors.name && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 group">
                        <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formSku ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <ListDashes weight="duotone" className={`w-4 h-4 ${formSku ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> SKU / Code *
                          {formSku && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. ELC-STR"
                          value={formSku}
                          onChange={(e) => { setFormSku(e.target.value); setFormErrors(prev => ({...prev, sku: ''})); }}
                          className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.sku ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formSku ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.sku && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.sku}</p>}
                      </div>
                      <div className="space-y-1.5 group">
                        <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formOem ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <Tag weight="duotone" className={`w-4 h-4 ${formOem ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> OEM Part No. *
                          {formOem && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. 1-81100-341-1"
                          value={formOem}
                          onChange={(e) => { setFormOem(e.target.value); setFormErrors(prev => ({...prev, oem: ''})); }}
                          className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.oem ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formOem ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.oem && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.oem}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Funnel weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Category / Subcategory *
                      </label>
                      <select 
                        value={formCategory}
                        onChange={(e) => { setFormCategory(e.target.value); setFormErrors(prev => ({...prev, category: ''})); }}
                        required
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.category ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : 'border-border focus:border-red-600'}`}
                      >
                        {categoriesList.length === 0 ? (
                          <option value="" disabled>Loading categories…</option>
                        ) : (
                          <>
                            <option value="" disabled>-- Select Category / Subcategory --</option>
                            {categoriesList.filter(c => !c.parentCategory).map(parent => {
                              const subs = categoriesList.filter(c => c.parentCategory && c.parentCategory.id?.toString() === parent.id?.toString());
                              return (
                                <optgroup key={parent.id} label={parent.name}>
                                  <option value={parent.id}>{parent.name} (Main)</option>
                                  {subs.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </>
                        )}
                      </select>
                      {formErrors.category && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.category}</p>}
                      {categoriesList.length === 0 && <p className="text-2xs text-amber-500 font-semibold">⚠ Categories not loaded. Check if the backend is running.</p>}
                    </div>
                    
                    <div className="space-y-1.5 group">
                      <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formCompatibility ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <Truck weight="duotone" className={`w-4 h-4 ${formCompatibility ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Vehicle Compatibility Models
                        {formCompatibility && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Isuzu ELF NPR, Forward, Hino 300"
                        value={formCompatibility}
                        onChange={(e) => setFormCompatibility(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formCompatibility ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                      />
                    </div>
                  </div>

                  {/* Right Column: Pricing, Stock, and Media */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5 group">
                        <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formPrice ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <CurrencyDollar weight="duotone" className={`w-4 h-4 ${formPrice ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Price (₱) *
                          {formPrice && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </label>
                        <input 
                          type="number" 
                          required
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formPrice}
                          onChange={(e) => { setFormPrice(e.target.value); setFormErrors(prev => ({...prev, price: ''})); }}
                          className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.price ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formPrice ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.price && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.price}</p>}
                      </div>
                      <div className="space-y-1.5 group">
                        <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formStock !== '' ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <Package weight="duotone" className={`w-4 h-4 ${formStock !== '' ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> {modalType === 'edit' ? 'Current Stock *' : 'Initial Stock *'}
                          {formStock !== '' && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          placeholder="0"
                          value={formStock}
                          disabled={modalType === 'edit'}
                          onChange={(e) => { setFormStock(e.target.value); setFormErrors(prev => ({...prev, stock: ''})); }}
                          className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed ${formErrors.stock ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formStock !== '' ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.stock && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.stock}</p>}
                      </div>
                      <div className="space-y-1.5 group">
                        <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formMinStock !== '' ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <WarningCircle weight="duotone" className={`w-4 h-4 ${formMinStock !== '' ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Min Stock *
                          {formMinStock !== '' && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          placeholder="5"
                          value={formMinStock}
                          onChange={(e) => { setFormMinStock(e.target.value); setFormErrors(prev => ({...prev, minStock: ''})); }}
                          className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground ${formErrors.minStock ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20 animate-shake' : formMinStock !== '' ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.minStock && <p className="text-2xs text-red-400 font-semibold flex items-center gap-1"><WarningCircle weight="fill" /> {formErrors.minStock}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5 group">
                      <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formDescription ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <ListDashes weight="duotone" className={`w-4 h-4 ${formDescription ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Item Description
                        {formDescription && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </label>
                      <textarea 
                        rows="2"
                        placeholder="e.g. High torque motor built for heavy-duty commercial applications..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all text-foreground resize-y min-h-[80px] custom-scrollbar ${formDescription ? 'border-foreground/30 focus:border-foreground/60' : 'border-border focus:border-foreground/40'}`}
                      />
                    </div>

                    {/* Upload Image Section */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-brandBlue-400" weight="duotone" /> Part Product Image
                      </label>
                      <div className="flex items-center gap-4 bg-background border border-border rounded-xl p-3.5">
                        <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-border/10">
                          {formImage ? (
                            <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-6 h-6 text-muted-foreground/30" weight="duotone" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  alert("Image size must be smaller than 2MB.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setFormImage(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-2xs file:font-bold file:bg-secondary file:text-foreground file:hover:bg-slate-700 transition file:cursor-pointer"
                          />
                          <p className="text-3xs text-muted-foreground">Supported formats: PNG, JPG, WEBP. Max size: 2MB.</p>
                        </div>
                        {formImage && (
                          <button 
                            type="button"
                            onClick={() => setFormImage('')}
                            className="text-2xs font-bold text-red-500 hover:text-red-400 px-2 py-1 bg-red-950/20 rounded border border-red-900/30"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Server-side error banner */}
                {serverError && (
                  <div className="mx-5 mb-1 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-sm font-semibold animate-fadeIn">
                    <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-secondary hover:bg-slate-700 text-muted-foreground text-sm font-semibold rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/60 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      modalType === 'add' ? 'Save Component' : 'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Inquiry Form Modal for Customer Mode */}
      {isInquiryModalOpen && inquiryPart && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground font-display">Parts Quote Request</h3>
              <button 
                onClick={() => setIsInquiryModalOpen(false)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X weight="duotone" className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleRequestQuoteSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-background p-3.5 rounded-xl border border-slate-850 text-xs space-y-1 text-left">
                  <span className="text-2xs font-bold text-brandBlue-400 uppercase tracking-widest">{inquiryPart.category}</span>
                  <h4 className="font-bold text-foreground text-sm">{inquiryPart.name}</h4>
                  <p className="text-2xs font-mono text-muted-foreground">SKU: {inquiryPart.sku} | OEM: {inquiryPart.oem}</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">Requested Quantity *</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={inquiryQty}
                    onChange={(e) => setInquiryQty(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">Additional Request Details</label>
                  <textarea 
                    placeholder="E.g., transport lead time, packaging requirements, custom specifications..."
                    rows="3"
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    className="w-full bg-background border border-slate-850 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary">
                <button 
                  type="button" 
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-slate-700 text-muted-foreground text-xs font-semibold rounded-xl border border-border transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-brandBlue-500/10 dark:bg-brandBlue-900 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 text-brandBlue-600 dark:text-brandBlue-100 text-xs font-bold rounded-xl shadow-lg border border-brandBlue-500/30 dark:border-brandBlue-700/40 transition-all"
                >
                  Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Inquiry Success Modal */}
      {inquirySuccess && inquiryPart && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 text-center animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle weight="duotone" className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground font-display">Inquiry Received!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quote request submitted successfully. The warehouse team will email or call you regarding **{inquiryPart.name}**.
              </p>
            </div>

            <button 
              onClick={() => setInquirySuccess(false)}
              className="w-full py-2.5 bg-secondary hover:bg-slate-700 border border-border text-muted-foreground font-bold rounded-xl text-xs transition-colors"
            >
              Okay
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

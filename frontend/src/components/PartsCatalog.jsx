import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, Funnel, Warning, Plus, Pencil, Trash, Wrench, Package, X, XCircle, ShoppingCart, FileCode, PaperPlaneRight, CheckCircle, SquaresFour, GridFour, ListDashes, Gear, ShieldCheck, Pulse, Lightning, CarProfile, Tag, Image, WarningCircle, Star, SortAscending, Sliders, CurrencyDollar, Info } from '@phosphor-icons/react';
import { fetchCategoriesList } from '../authStore';
import CompatibilityFilter from './CompatibilityFilter';
import { useSettings } from '../context/SettingsContext';
import { getCategoryIconAndColor, getCategoryPlaceholder } from '../utils/categoryIcons';
import PartCard from './PartCard';
import PartTableRow from './PartTableRow';
import AddPartDrawer from './AddPartDrawer';
import CompatibilityEditor from './inventory/CompatibilityEditor';
import { normalizeCompatibilityRows, compatibilityRowsToPayload, compatibilityRowsToSummary } from '../utils/compatibilityModels';
import Select from 'react-select';
import { customSelectStyles } from './ui/PurchasingAtoms';
import ToggleChip from './ui/ToggleChip';
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

export default function PartsCatalog({ parts, categories, structuredCategories = [], selectedCategory, setSelectedCategory, onAddPart, onEditPart, onDeletePart, onRestockPart, onAddLog, adminSession, isReadOnly = false, setPage, onFetchPartAdjustments, onFetchGlobalAuditLogs }) {
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [viewMode, setViewMode] = useState('table'); // keep inventory dense by default
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Sub-category state
  const [selectedSubCategory, setSelectedSubCategory] = useState(['All']);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState({ brand: null, series: null });
  const itemsPerPage = 10;

  const [categoriesList, setCategoriesList] = useState([]);
  const [formImage, setFormImage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Stock adjustment states
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNewStock, setAdjustNewStock] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustmentsLog, setAdjustmentsLog] = useState([]);
  const [globalAuditLogs, setGlobalAuditLogs] = useState([]);
  const [isLoadingGlobalLogs, setIsLoadingGlobalLogs] = useState(false);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(false);
  const [originalStock, setOriginalStock] = useState(0);
  const [formCompatibleWith, setFormCompatibleWith] = useState(normalizeCompatibilityRows(''));

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
    if (viewMode === 'auditLog' && !isReadOnly && onFetchGlobalAuditLogs) {
      const fetchLogs = async () => {
        setIsLoadingGlobalLogs(true);
        const { ok, adjustments } = await onFetchGlobalAuditLogs();
        if (ok) {
          setGlobalAuditLogs(adjustments);
        } else {
          setGlobalAuditLogs([]);
        }
        setIsLoadingGlobalLogs(false);
      };
      fetchLogs();
    }
  }, [viewMode, isReadOnly, onFetchGlobalAuditLogs]);

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
    const { Icon, color, bg } = getCategoryIconAndColor(cat, category?.iconName, category?.colorTheme);
    return { icon: Icon, color, bg };
  };
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [modalType, setModalType] = useState('edit'); // 'edit', 'details', 'adjustStock'
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
      onAddLog('system', `Inquiry submitted by Customer for ${inquiryQty}x ${inquiryPart.name}.`);
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
  const [formDescription, setFormDescription] = useState('');

  // Funnel logic
  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name.toLowerCase().includes(search.toLowerCase()) ||
      part.sku.toLowerCase().includes(search.toLowerCase()) ||
      part.oem.toLowerCase().includes(search.toLowerCase()) ||
      (part.compatibility && part.compatibility.toLowerCase().includes(search.toLowerCase()));
    
    // Determine category matching logic (Main vs Sub)
    const activeCats = structuredCategories && structuredCategories.length > 0 ? structuredCategories : (categoriesList || []);
    const parentCatObj = activeCats.find(c => c.name === selectedCategory);
    const validSubCats = parentCatObj ? activeCats.filter(c => c.parentCategory?.id === parentCatObj.id || c.parentCategory === parentCatObj.id).map(c => c.name) : [];
    
    const matchesMainCategory = selectedCategory === 'All' || part.category === selectedCategory || validSubCats.includes(part.category);
    const matchesSubCategory = selectedSubCategory.includes('All') || selectedSubCategory.includes(part.category);
    
    // If a subcategory is selected, use it. Otherwise, use the main category filter.
    const matchesCategory = !selectedSubCategory.includes('All') ? matchesSubCategory : matchesMainCategory;
    
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
    setIsAddDrawerOpen(true);
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
    setOriginalStock(part.stock);
    setFormMinStock(part.minStock.toString());
    setFormCompatibleWith(normalizeCompatibilityRows(part.compatibleWith?.length ? part.compatibleWith : part.compatibility || ''));
    setFormDescription(part.description || '');
    setFormImage(part.image || '');
    setFormErrors({});
    setServerError('');
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const openDetailsModal = async (part) => {
    setModalType('details');
    setSelectedPart(part);
    setIsModalOpen(true);
    setAdjustmentsLog([]);
    setIsLoadingAdjustments(true);
    if (onFetchPartAdjustments) {
      const res = await onFetchPartAdjustments(part.id);
      if (res && res.ok) {
        setAdjustmentsLog(res.adjustments);
      }
    }
    setIsLoadingAdjustments(false);
  };

  const openAdjustStockModal = (part, prefilledAdjustment = 0) => {
    setModalType('adjustStock');
    setSelectedPart(part);
    setAdjustReason('');
    if (prefilledAdjustment !== 0) {
      setAdjustNewStock((part.stock + prefilledAdjustment).toString());
    } else {
      setAdjustNewStock(part.stock.toString());
    }
    setAdjustError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    // Zod Validation
    const result = partSchema.safeParse({
      name: formName.trim(),
      sku: formSku.trim(),
      oem: formOem.trim(),
      category: formCategory,
      price: isNaN(parseFloat(formPrice)) ? -1 : parseFloat(formPrice),
      stock: isNaN(parseInt(formStock)) ? -1 : parseInt(formStock),
      minStock: isNaN(parseInt(formMinStock)) ? -1 : parseInt(formMinStock)
    });
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach(e => { errors[e.path[0]] = e.message; });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const partData = {
      name: formName.trim(),
      sku: formSku.trim(),
      oem: formOem.trim(),
      category_id: formCategory,
      price: parseFloat(formPrice),
      stock: parseInt(formStock),
      minStock: parseInt(formMinStock),
      compatibility: compatibilityRowsToSummary(formCompatibleWith),
      compatibleWith: compatibilityRowsToPayload(formCompatibleWith),
      description: formDescription.trim(),
      image: formImage
    };

    setIsSubmitting(true);
    try {
      let result;
      if (modalType === 'edit') {
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

  const handleAdjustStockFormSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');
    
    const newStockVal = parseInt(adjustNewStock);
    if (isNaN(newStockVal) || newStockVal < 0) {
      setAdjustError('Stock must be a non-negative number.');
      return;
    }
    
    if (!adjustReason.trim()) {
      setAdjustError('A reason for stock adjustment is required.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await onEditPart(selectedPart.id, {
        stock: newStockVal,
        adjustmentReason: adjustReason.trim()
      });
      
      if (result && !result.ok) {
        setAdjustError(result.error || 'Failed to adjust stock. Please try again.');
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      setAdjustError('Unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = (partId) => {
    const amount = parseInt(restockAmount[partId]) || 0;
    if (amount > 0) {
      const part = parts.find(p => p.id === partId);
      if (part) {
        openAdjustStockModal(part, amount);
        setRestockAmount({ ...restockAmount, [partId]: '' });
      }
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
          <CompatibilityFilter onFilterChange={setVehicleFilter} vehicleFilter={vehicleFilter} />
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

      {/* Two-Tier Category Pills */}
      <div className="flex flex-col gap-2 pb-2">
        {/* Main Categories Row */}
        <div className="flex overflow-x-auto custom-scrollbar pb-1 items-center gap-2">
          {(() => {
            const activeCategories = structuredCategories && structuredCategories.length > 0 
              ? structuredCategories 
              : (categoriesList || []);
              
            const mainCats = activeCategories.length > 0 
              ? activeCategories.filter(c => !c.parentCategory).map(c => c.name)
              : categories;
            
            // Ensure 'All' is at the front
            const displayMainCats = ['All', ...mainCats.filter(c => c !== 'All')];

            return displayMainCats.map((cat) => {
              const { icon: CatIcon, color } = getCategoryStyles(cat);
              const isSelected = selectedCategory === cat;
              return (
                <ToggleChip
                  key={cat}
                  active={isSelected}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubCategory(['All']); // Reset subcategory
                  }}
                  className="flex items-center gap-1.5 rounded-full whitespace-nowrap"
                >
                  {CatIcon && <CatIcon weight={isSelected ? "fill" : "duotone"} className={`w-3.5 h-3.5 ${isSelected ? '' : color}`} />}
                  {cat}
                </ToggleChip>
              );
            });
          })()}
        </div>

        {/* Sub-Categories Row (Only show if parent is selected and has children) */}
        {selectedCategory !== 'All' && (
          (() => {
            const activeCategories = structuredCategories && structuredCategories.length > 0 
              ? structuredCategories 
              : (categoriesList || []);
              
            if (activeCategories.length === 0) return null;

            const parentCatObj = activeCategories.find(c => c.name === selectedCategory);
            if (!parentCatObj) return null;
            // Handle both populated object or string ID
            const subCats = activeCategories.filter(c => c.parentCategory?.id === parentCatObj.id || c.parentCategory === parentCatObj.id);
            if (subCats.length === 0) return null;

            return (
              <div className="flex overflow-x-auto custom-scrollbar pb-1 items-center gap-2 pl-4 border-l-2 border-border/50">
                <ToggleChip
                  active={selectedSubCategory.includes('All')}
                  onClick={() => setSelectedSubCategory(['All'])}
                  className="flex items-center gap-1.5 rounded-full text-2xs whitespace-nowrap py-1"
                >
                  <SquaresFour weight="duotone" className="w-3 h-3" />
                  All {selectedCategory}
                </ToggleChip>
                {subCats.map((sub) => {
                  const isSelected = selectedSubCategory.includes(sub.name);
                  const { icon: SubIcon, color } = getCategoryStyles(sub.name);
                  return (
                    <ToggleChip
                      key={sub.id}
                      active={isSelected}
                      onClick={() => {
                        setSelectedSubCategory(prev => {
                          const current = Array.isArray(prev) ? prev : [prev];
                          const withoutAll = current.filter(x => x !== 'All');
                          if (withoutAll.includes(sub.name)) {
                            const next = withoutAll.filter(x => x !== sub.name);
                            return next.length === 0 ? ['All'] : next;
                          } else {
                            return [...withoutAll, sub.name];
                          }
                        });
                      }}
                      className="flex items-center gap-1.5 rounded-full text-2xs whitespace-nowrap py-1"
                    >
                      {SubIcon && <SubIcon weight={isSelected ? "fill" : "duotone"} className={`w-3 h-3 ${isSelected ? 'text-foreground' : color}`} />}
                      {sub.name}
                    </ToggleChip>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* View Controls Bar */}
      <div className="flex items-center justify-between bg-background/50 border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
          <ToggleChip 
            active={viewMode === 'table'}
            onClick={() => setViewMode('table')}
            className="flex items-center gap-1.5 rounded-md"
          >
            <ListDashes weight={viewMode === 'table' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </ToggleChip>
          <ToggleChip 
            active={viewMode === 'grid3'}
            onClick={() => setViewMode('grid3')}
            className="flex items-center gap-1.5 rounded-md"
          >
            <SquaresFour weight={viewMode === 'grid3' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">Compact</span>
          </ToggleChip>
          <ToggleChip 
            active={viewMode === 'grid4'}
            onClick={() => setViewMode('grid4')}
            className="flex items-center gap-1.5 rounded-md"
          >
            <GridFour weight={viewMode === 'grid4' ? 'fill' : 'duotone'} className="w-4 h-4" />
            <span className="hidden sm:inline">Detailed</span>
          </ToggleChip>
          {!isReadOnly && (
            <>
              <div className="w-px h-4 bg-border mx-1"></div>
              <ToggleChip 
                active={viewMode === 'auditLog'}
                onClick={() => setViewMode('auditLog')}
                className="flex items-center gap-1.5 rounded-md"
              >
                <ShieldCheck weight={viewMode === 'auditLog' ? 'fill' : 'duotone'} className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Log</span>
              </ToggleChip>
            </>
          )}
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
            <label className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-lg border cursor-pointer select-none transition-all duration-200 bg-transparent border-transparent text-muted-foreground hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 has-[:checked]:bg-red-500/10 has-[:checked]:border-red-500/30 has-[:checked]:text-red-500 group">
              <input 
                type="checkbox" 
                checked={showLowStockOnly} 
                onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                className="sr-only peer"
              />
              <Warning weight={showLowStockOnly ? "fill" : "duotone"} className="w-4 h-4 text-muted-foreground group-hover:text-red-400 peer-checked:text-red-500" />
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
          {viewMode === 'auditLog' && !isReadOnly ? (
            <div className="w-full glass-panel rounded-2xl border border-border/50 overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/30">
                <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  <ShieldCheck weight="duotone" className="w-5 h-5 text-emerald-500" />
                  Stock Adjustment Audit Log
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Global history of manual stock adjustments across all parts.</p>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-secondary/50 border-b border-border/50 text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Part Name</th>
                      <th className="px-4 py-3 text-center">Previous</th>
                      <th className="px-4 py-3 text-center">Difference</th>
                      <th className="px-4 py-3 text-center">New</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {isLoadingGlobalLogs ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground animate-pulse">Loading logs...</td>
                      </tr>
                    ) : globalAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">No stock adjustments recorded.</td>
                      </tr>
                    ) : (
                      globalAuditLogs.map(log => {
                        const prevStock = log.newStock - log.difference;
                        const isAddition = log.difference >= 0;
                        return (
                          <tr key={log.id || log._id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(log.createdAt || Date.now()).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs font-bold text-foreground">
                              {log.part?.name || 'Unknown Part'}
                              <span className="block text-2xs font-mono text-muted-foreground font-normal">{log.part?.sku || ''}</span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-mono text-muted-foreground">{prevStock}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isAddition ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {isAddition ? '+' : ''}{log.difference}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-bold text-foreground">{log.newStock}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={log.reason}>{log.reason}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="w-full overflow-x-auto glass-panel rounded-2xl border border-border/50">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/50 border-b border-border/50 text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Part Name</th>
                    <th className="px-4 py-3">SKU / OEM</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedParts.map(part => (
                      <PartTableRow 
                        key={part.id} 
                        part={part} 
                        openDetailsModal={openDetailsModal} 
                        formatCurrency={formatCurrency}
                        openAdjustStockModal={openAdjustStockModal}
                        openEditModal={openEditModal}
                        onDeletePart={onDeletePart}
                        setPage={typeof setPage !== 'undefined' ? setPage : () => {}}
                      />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`grid gap-5 ${viewMode === 'grid3' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {paginatedParts.map((part) => (
                <PartCard 
                  key={part.id} 
                  part={part} 
                  isAdmin={true}
                  isReadOnly={isReadOnly}
                  formatCurrency={formatCurrency}
                  openDetailsModal={openDetailsModal}
                  setInquiryPart={typeof setInquiryPart !== 'undefined' ? setInquiryPart : () => {}}
                  setInquiryQty={typeof setInquiryQty !== 'undefined' ? setInquiryQty : () => {}}
                  setInquiryMsg={typeof setInquiryMsg !== 'undefined' ? setInquiryMsg : () => {}}
                  setIsInquiryModalOpen={typeof setIsInquiryModalOpen !== 'undefined' ? setIsInquiryModalOpen : () => {}}
                  setPage={typeof setPage !== 'undefined' ? setPage : () => {}}
                  openAdjustStockModal={openAdjustStockModal}
                  openEditModal={openEditModal}
                  onDeletePart={onDeletePart}
                  viewMode={viewMode}
                />
            ))}
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="parts-modal-title"
            className={`w-full ${(modalType === 'details' || modalType === 'adjustStock') ? 'max-w-xl' : 'max-w-5xl'} bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 id="parts-modal-title" className="text-lg font-bold text-foreground font-display">
                {modalType === 'edit' && 'Edit Part Details'}
                {modalType === 'details' && 'Part Details Overview'}
                {modalType === 'adjustStock' && 'Adjust Stock count'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                aria-label="Close part modal"
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X weight="duotone" className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {modalType === 'details' ? (
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column: Image + Description */}
                  <div className="w-full md:w-2/5 flex flex-col gap-6">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-secondary flex items-center justify-center border border-border/50 shadow-inner">
                      {selectedPart?.image ? (
                        <img src={selectedPart.image} alt={selectedPart.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={getCategoryPlaceholder(selectedPart?.category)} alt={selectedPart?.name} className="w-full h-full object-cover opacity-80" />
                      )}
                    </div>
                    
                    {selectedPart?.description && (
                      <div className="space-y-2 bg-background/30 p-4 rounded-xl border border-border/30">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5"><Info weight="duotone" className="w-4 h-4" /> Technical Description</span>
                        <p className="text-muted-foreground text-sm leading-relaxed">{selectedPart.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Details */}
                  <div className="w-full md:w-3/5 flex flex-col space-y-5">
                    <div>
                      {(() => {
                        const { icon: CatIcon, color: catColor, bg: catBg } = getCategoryStyles(selectedPart?.category);
                        const ActualIcon = CatIcon || Package;
                        return (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 border border-border/50 ${catBg || 'bg-slate-800/10'}`}>
                            <ActualIcon weight="duotone" className={`w-4 h-4 ${catColor || 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${catColor || 'text-slate-400'}`}>{selectedPart?.category || 'Uncategorized'}</span>
                          </div>
                        );
                      })()}
                      <h2 className="text-2xl font-bold text-foreground font-display leading-tight">{selectedPart?.name}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-5 bg-background/50 p-5 rounded-2xl border border-border/50 shadow-sm">
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5"><Tag weight="fill" className="text-brandBlue-400" /> SKU / Code</span>
                        <p className="font-mono font-bold text-foreground mt-1 text-sm break-all" title={selectedPart?.sku}>{selectedPart?.sku}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5"><Wrench weight="fill" className="text-emerald-500" /> OEM Part No.</span>
                        <p className="font-mono font-bold text-foreground mt-1 text-sm break-all" title={selectedPart?.oem}>{selectedPart?.oem}</p>
                      </div>
                      
                      <div className="mt-2 min-w-0">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5"><CurrencyDollar weight="fill" className="text-amber-500" /> Unit Retail Price</span>
                        <p className="font-extrabold text-xl sm:text-lg lg:text-xl text-foreground mt-1 break-words" title={formatCurrency(selectedPart?.price || 0)}>{formatCurrency(selectedPart?.price || 0)}</p>
                      </div>
                      <div className="mt-2 min-w-0">
                        <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5"><Package weight="fill" className="text-indigo-400" /> Inventory Qty</span>
                        <p className={`font-extrabold text-xl mt-1 break-words ${selectedPart?.stock <= selectedPart?.minStock ? 'text-red-500' : 'text-emerald-400'}`}>
                          {selectedPart?.stock} <span className="text-xs font-medium text-muted-foreground uppercase ml-1">units</span>
                        </p>
                      </div>
                    </div>

                    {selectedPart?.compatibility && (
                      <div className="space-y-1.5 bg-background/50 p-5 rounded-2xl border border-border/50 shadow-sm">
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Truck weight="duotone" className="w-4 h-4 text-red-500" /> Compatible Models
                        </span>
                        <p className="text-foreground text-sm leading-relaxed font-medium">{selectedPart.compatibility}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inventory Adjustment History Log */}
                {!isReadOnly && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders weight="duotone" className="w-4 h-4 text-emerald-500" /> Stock Adjustment History
                    </span>
                    
                    {isLoadingAdjustments ? (
                      <div className="text-xs text-muted-foreground animate-pulse py-2">Loading history logs...</div>
                    ) : adjustmentsLog.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 border border-dashed border-border rounded-xl text-center">
                        No manual stock adjustments recorded for this part.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-background/50 divide-y divide-border custom-scrollbar">
                        {adjustmentsLog.map((log) => {
                          const isAddition = log.difference >= 0;
                          return (
                            <div key={log._id || log.id} className="p-2.5 text-xs flex flex-col gap-1 hover:bg-background/80 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isAddition ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                  {isAddition ? '+' : ''}{log.difference} (stock: {log.newStock})
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(log.createdAt || Date.now()).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-foreground/90 font-medium">
                                <span className="text-muted-foreground">Reason:</span> {log.reason}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
            ) : modalType === 'adjustStock' ? (
              <form onSubmit={handleAdjustStockFormSubmit} className="flex flex-col p-6 text-left space-y-4">
                <div className="space-y-3 bg-background p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">Part / SKU</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedPart?.name} <span className="font-mono text-muted-foreground text-xs">({selectedPart?.sku})</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase">Current Stock</span>
                      <p className="text-lg font-extrabold text-muted-foreground">{selectedPart?.stock} units</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase">Expected New Stock</span>
                      <p className={`text-lg font-extrabold ${(parseInt(adjustNewStock) || 0) < (selectedPart?.stock || 0) ? 'text-orange-500' : 'text-emerald-400'}`}>
                        {isNaN(parseInt(adjustNewStock)) ? 0 : parseInt(adjustNewStock)} units
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adjust-new-stock" className="text-xs font-semibold text-muted-foreground uppercase">New Stock Count *</label>
                  <input 
                    id="adjust-new-stock"
                    type="number" 
                    required
                    min="0"
                    placeholder="Enter new stock count"
                    value={adjustNewStock}
                    onChange={(e) => setAdjustNewStock(e.target.value)}
                    aria-invalid={!!adjustError}
                    aria-describedby={adjustError ? 'adjust-new-stock-error' : undefined}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adjust-reason" className="text-xs font-semibold text-muted-foreground uppercase">Reason for Adjustment *</label>
                  <textarea 
                    id="adjust-reason"
                    required
                    placeholder="e.g., Damaged items during shipment, Returned by client, Stock audit discrepancy"
                    rows="3"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground resize-none animate-fadeIn"
                  />
                </div>

                {adjustError && (
                  <p id="adjust-new-stock-error" role="alert" className="text-xs text-red-400 font-semibold flex items-center gap-1 animate-shake"><WarningCircle weight="fill" /> {adjustError}</p>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-secondary hover:bg-background text-muted-foreground text-sm font-semibold rounded-xl border border-border transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/60 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </form>
            ) : (
              // Edit Form
              <form onSubmit={handleFormSubmit} className="flex max-h-[82vh] flex-col">
                <div className="overflow-y-auto bg-secondary/40 p-4 text-left custom-scrollbar sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                      {formImage ? (
                        <img src={formImage} alt={`${formName || 'Part'} preview`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/50" weight="duotone" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Editing inventory record</p>
                      <h4 className="mt-1 truncate text-lg font-bold text-foreground font-display" title={formName}>{formName || 'Untitled part'}</h4>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono font-semibold">{formSku || 'No SKU'}</span>
                        <span className="font-mono">{formOem || 'No OEM'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdjustStockModal(selectedPart)}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                    >
                      <Sliders className="h-3.5 w-3.5" weight="duotone" />
                      Adjust stock
                    </button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)]">
                    <section className="space-y-4 rounded-xl border border-border bg-background p-4">
                      <div>
                        <h4 className="text-sm font-bold text-foreground font-display">Identity</h4>
                        <p className="text-xs text-muted-foreground">Search, receipts, category filters, and staff lookup use these fields.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="edit-part-name" className="text-[11px] font-semibold text-muted-foreground">Part name *</label>
                        <input
                          id="edit-part-name"
                          type="text"
                          required
                          placeholder="e.g. Starter Motor Assembly (24V)"
                          value={formName}
                          onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({...prev, name: ''})); }}
                          className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-all focus:outline-none ${formErrors.name ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-foreground/40'}`}
                        />
                        {formErrors.name && <p className="text-2xs font-semibold text-destructive">{formErrors.name}</p>}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor="edit-part-sku" className="text-[11px] font-semibold text-muted-foreground">SKU / code *</label>
                          <input
                            id="edit-part-sku"
                            type="text"
                            required
                            placeholder="e.g. ELC-STR"
                            value={formSku}
                            onChange={(e) => { setFormSku(e.target.value); setFormErrors(prev => ({...prev, sku: ''})); }}
                            className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-all focus:outline-none ${formErrors.sku ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-foreground/40'}`}
                          />
                          {formErrors.sku && <p className="text-2xs font-semibold text-destructive">{formErrors.sku}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="edit-part-oem" className="text-[11px] font-semibold text-muted-foreground">OEM part no. *</label>
                          <input
                            id="edit-part-oem"
                            type="text"
                            required
                            placeholder="e.g. 1-81100-341-1"
                            value={formOem}
                            onChange={(e) => { setFormOem(e.target.value); setFormErrors(prev => ({...prev, oem: ''})); }}
                            className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-all focus:outline-none ${formErrors.oem ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-foreground/40'}`}
                          />
                          {formErrors.oem && <p className="text-2xs font-semibold text-destructive">{formErrors.oem}</p>}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="edit-part-category" className="text-[11px] font-semibold text-muted-foreground">Category / subcategory *</label>
                        <div className={`${formErrors.category ? 'rounded-lg ring-1 ring-destructive' : ''}`}>
                          <Select
                            inputId="edit-part-category"
                            options={categoriesList.filter(c => !c.parentCategory).map(parent => ({
                              label: parent.name,
                              options: [
                                { value: parent.id, label: `${parent.name} (Main)`, catName: parent.name, iconName: parent.iconName, colorTheme: parent.colorTheme },
                                ...categoriesList.filter(c => c.parentCategory && c.parentCategory.id?.toString() === parent.id?.toString()).map(sub => ({ value: sub.id, label: sub.name, catName: sub.name, iconName: sub.iconName, colorTheme: sub.colorTheme }))
                              ]
                            }))}
                            value={
                              formCategory
                                ? (() => {
                                    const c = categoriesList.find(cat => String(cat.id) === String(formCategory));
                                    return c ? { value: c.id, label: c.name, catName: c.name, iconName: c.iconName, colorTheme: c.colorTheme } : null;
                                  })()
                                : null
                            }
                            onChange={(selected) => { setFormCategory(selected?.value || ''); setFormErrors(prev => ({...prev, category: ''})); }}
                            placeholder="Select category"
                            styles={customSelectStyles}
                            isClearable
                            classNamePrefix="react-select"
                            formatOptionLabel={(option) => {
                              if (!option.catName) return <span>{option.label}</span>;
                              const { Icon, color } = getCategoryIconAndColor(option.catName, option.iconName, option.colorTheme);
                              return (
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${color}`} weight="duotone" />
                                  <span>{option.label}</span>
                                </div>
                              );
                            }}
                          />
                        </div>
                        {formErrors.category && <p className="text-2xs font-semibold text-destructive">{formErrors.category}</p>}
                        {categoriesList.length === 0 && <p className="text-2xs font-semibold text-amber-500">Categories not loaded. Check if the backend is running.</p>}
                      </div>
                    </section>

                    <div className="space-y-4">
                      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground font-display">Pricing and Stock</h4>
                          <p className="text-xs text-muted-foreground">Stock quantity is audited separately from descriptive edits.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <label htmlFor="edit-part-price" className="text-[11px] font-semibold text-muted-foreground">Unit price *</label>
                            <input
                              id="edit-part-price"
                              type="number"
                              required
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={formPrice}
                              onChange={(e) => { setFormPrice(e.target.value); setFormErrors(prev => ({...prev, price: ''})); }}
                              className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-all focus:outline-none ${formErrors.price ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-foreground/40'}`}
                            />
                            {formErrors.price && <p className="text-2xs font-semibold text-destructive">{formErrors.price}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="edit-part-stock" className="text-[11px] font-semibold text-muted-foreground">On hand</label>
                            <input
                              id="edit-part-stock"
                              type="number"
                              required
                              min="0"
                              value={formStock}
                              disabled
                              className="h-10 w-full cursor-not-allowed rounded-lg border border-border bg-secondary px-3 text-sm text-muted-foreground"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="edit-part-min-stock" className="text-[11px] font-semibold text-muted-foreground">Min stock *</label>
                            <input
                              id="edit-part-min-stock"
                              type="number"
                              required
                              min="0"
                              placeholder="5"
                              value={formMinStock}
                              onChange={(e) => { setFormMinStock(e.target.value); setFormErrors(prev => ({...prev, minStock: ''})); }}
                              className={`h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-all focus:outline-none ${formErrors.minStock ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-foreground/40'}`}
                            />
                            {formErrors.minStock && <p className="text-2xs font-semibold text-destructive">{formErrors.minStock}</p>}
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 rounded-xl border border-border bg-background p-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground font-display">Notes and Image</h4>
                          <p className="text-xs text-muted-foreground">Keep the description short enough for staff to scan at the counter.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="edit-part-description" className="text-[11px] font-semibold text-muted-foreground">Item description</label>
                          <textarea
                            id="edit-part-description"
                            rows="3"
                            placeholder="e.g. High torque motor built for heavy-duty commercial applications..."
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            className="min-h-[88px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-all custom-scrollbar focus:border-foreground/40 focus:outline-none"
                          />
                        </div>
                        <div className="rounded-lg border border-border bg-secondary/40 p-3">
                          <div className="grid gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                              {formImage ? (
                                <img src={formImage} alt="Preview" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Image className="h-5 w-5 text-muted-foreground/40" weight="duotone" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <label htmlFor="edit-part-image" className="text-[11px] font-semibold text-muted-foreground">Part image</label>
                              <input
                                id="edit-part-image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      setFormErrors(prev => ({...prev, image: 'Image size must be smaller than 2MB.'}));
                                      return;
                                    }
                                    setFormErrors(prev => ({...prev, image: ''}));
                                    const reader = new FileReader();
                                    reader.onloadend = () => setFormImage(reader.result);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="block w-full max-w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-secondary"
                              />
                              <p className="text-2xs text-muted-foreground/70">Max size: 2MB. Square ratio recommended.</p>
                            </div>
                            {formImage && (
                              <button
                                type="button"
                                onClick={() => setFormImage('')}
                                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 sm:w-auto"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {formErrors.image && <p className="mt-2 text-2xs font-semibold text-destructive">{formErrors.image}</p>}
                        </div>
                      </section>
                    </div>
                  </div>

                  <section className="mt-4 rounded-xl border border-border bg-background p-4">
                    <CompatibilityEditor rows={formCompatibleWith} onChange={setFormCompatibleWith} mode="edit" />
                  </section>
                </div>

                {/* Server-side error banner */}
                {serverError && (
                  <div className="mx-5 mb-1 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold animate-fadeIn">
                    <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-secondary hover:bg-background text-muted-foreground text-sm font-semibold rounded-xl border border-border transition-all disabled:opacity-50"
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
                      'Save Changes'
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
                  className="px-4 py-2 bg-secondary hover:bg-background text-muted-foreground text-xs font-semibold rounded-xl border border-border transition-all"
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
                Inquiry submitted successfully. The warehouse team will email or call you regarding **{inquiryPart.name}**.
              </p>
            </div>

            <button 
              onClick={() => setInquirySuccess(false)}
              className="w-full py-2.5 bg-secondary hover:bg-background border border-border text-muted-foreground font-bold rounded-xl text-xs transition-colors"
            >
              Okay
            </button>
          </div>
        </div>,
        document.body
      )}
      <AddPartDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => setIsAddDrawerOpen(false)} 
        onAddPart={onAddPart} 
        categoriesList={categoriesList} 
        parts={parts} 
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlass, Funnel, Warning, Plus, Pencil, Trash, Truck, Wrench, Package, X, FileCode, PaperPlaneRight, CheckCircle, SquaresFour, Gear, ShieldCheck, Pulse, Lightning, CarProfile, Tag, Image } from '@phosphor-icons/react';
import { fetchCategoriesList } from '../authStore';

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
  onAddLog
}) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const itemsPerPage = 12;

  const [categoriesList, setCategoriesList] = useState([]);
  const [formImage, setFormImage] = useState('');
  const [formErrors, setFormErrors] = useState({});

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
    switch (cat) {
      case 'Engine': return { icon: Gear, color: 'text-red-500' };
      case 'Transmission': return { icon: Gear, color: 'text-orange-500' };
      case 'Brakes': return { icon: ShieldCheck, color: 'text-amber-500' };
      case 'Suspension': return { icon: Pulse, color: 'text-blue-500' };
      case 'Electrical': return { icon: Lightning, color: 'text-emerald-500' };
      case 'Body & Exterior': return { icon: CarProfile, color: 'text-purple-500' };
      case 'All': return { icon: SquaresFour, color: 'text-slate-500' };
      default: return { icon: Tag, color: 'text-slate-500' };
    }
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
    
    return matchesSearch && matchesCategory && matchesLowStock;
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
    setIsModalOpen(true);
  };

  const openDetailsModal = (part) => {
    setModalType('details');
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Client-side validation
    const errors = {};
    if (!formName.trim() || formName.trim().length < 3) {
      errors.name = 'Part name must be at least 3 characters.';
    }
    if (!formSku.trim()) {
      errors.sku = 'SKU is required.';
    }
    if (!formOem.trim()) {
      errors.oem = 'OEM number is required.';
    }
    if (!formCategory) {
      errors.category = 'Category selection is required.';
    }
    if (formPrice === '' || isNaN(Number(formPrice)) || Number(formPrice) < 0) {
      errors.price = 'Price must be a valid positive number.';
    }
    if (formStock === '' || isNaN(Number(formStock)) || Number(formStock) < 0) {
      errors.stock = 'Stock must be a non-negative number.';
    }
    if (formMinStock === '' || isNaN(Number(formMinStock)) || Number(formMinStock) < 0) {
      errors.minStock = 'Safety min stock must be a non-negative number.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
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

    if (modalType === 'add') {
      onAddPart(partData);
    } else if (modalType === 'edit') {
      onEditPart(selectedPart.id, partData);
    }
    setIsModalOpen(false);
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
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by part name, SKU, OEM, or compatibility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-foreground placeholder-slate-500"
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

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto">
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-10 text-xs font-semibold rounded-xl border border-border bg-secondary px-3 text-foreground outline-none focus:border-red-600 transition"
          >
            <option value="recommended">Recommended Sort</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="stock-desc">Stock: High to Low</option>
            <option value="stock-asc">Stock: Low to High</option>
          </select>

          {!isReadOnly && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showLowStockOnly} 
                onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                className="rounded text-red-600 focus:ring-red-600 border-border bg-background w-4 h-4"
              />
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Warning weight="duotone" className="w-3.5 h-3.5 text-red-500" /> Low Stock Warning
              </span>
            </label>
          )}

          {!isReadOnly && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-accent/20 transition-all"
            >
              <Plus weight="duotone" className="w-4 h-4" />
              Add New Part
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-900 overflow-x-auto pb-px">
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

      {/* Parts Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-[10px] font-extrabold text-red-500 animate-pulse z-10">
                    <Warning weight="duotone" className="w-3 h-3" />
                    LOW STOCK
                  </div>
                )}

                {/* Part Image */}
                <div className="h-40 rounded-xl overflow-hidden bg-slate-900/60 border border-border/10 mb-4 flex items-center justify-center relative select-none">
                  {part.image ? (
                    <img src={part.image} alt={part.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package weight="duotone" className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>

                {/* Card Top */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brandBlue-400">
                      {part.category}
                    </span>
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
                <div className="space-y-4 pt-4 mt-4 border-t border-slate-900">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Unit Price</span>
                      <span className="text-xl font-bold text-foreground">
                        ₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">{isReadOnly ? 'Stock Status' : 'Quantity'}</span>
                      <span className={`text-base font-extrabold ${isLowStock && !isReadOnly ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {isReadOnly ? (part.stock > 0 ? `${part.stock} available` : 'Out of Stock') : `${part.stock} / ${part.minStock} min`}
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
                    <>
                      {/* Restock Inline Form */}
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          placeholder="+Qty" 
                          min="1"
                          value={restockAmount[part.id] || ''}
                          onChange={(e) => setRestockAmount({ ...restockAmount, [part.id]: e.target.value })}
                          className="w-16 bg-background border border-border rounded-lg text-xs py-1.5 text-center focus:outline-none focus:border-red-600 text-muted-foreground font-bold"
                        />
                        <button 
                          onClick={() => handleRestockSubmit(part.id)}
                          className="flex-1 py-1.5 px-3 bg-brandBlue-500/10 dark:bg-brandBlue-900 hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-800 text-brandBlue-600 dark:text-brandBlue-300 text-xs font-semibold rounded-lg border border-brandBlue-500/30 dark:border-brandBlue-700/30 transition-all flex items-center justify-center gap-1"
                        >
                          <Plus weight="duotone" className="w-3.5 h-3.5" /> Restock
                        </button>
                      </div>

                      {/* Pencil/Delete Actions */}
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => openEditModal(part)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors border border-border"
                          title="Pencil Part Details"
                        >
                          <Pencil weight="duotone" className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                              onDeletePart(part.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-950/10 rounded-lg transition-colors border border-border"
                          title="Delete Part"
                        >
                          <Trash weight="duotone" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background backdrop-blur-sm">
          <div className="w-full max-w-xl bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground font-display">
                {modalType === 'add' && 'Add New Truck Part'}
                {modalType === 'edit' && 'Pencil Part details'}
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
                      <Package weight="duotone" className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brandBlue-400 uppercase tracking-widest">{selectedPart?.category}</span>
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
                    <p className="font-semibold text-lg text-foreground mt-0.5">₱{selectedPart?.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
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
                      <Pencil weight="duotone" className="w-3.5 h-3.5" /> Pencil Details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Add / Pencil Form
              <form onSubmit={handleFormSubmit}>
                <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto pr-2 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Part Name / Component Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Starter Motor Assembly (24V)"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-400 font-semibold">{formErrors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">SKU / Code *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. ELC-STR-24V"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.sku ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      />
                      {formErrors.sku && <p className="text-[10px] text-red-400 font-semibold">{formErrors.sku}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">OEM Part Number *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 0-23000-7010"
                        value={formOem}
                        onChange={(e) => setFormOem(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.oem ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      />
                      {formErrors.oem && <p className="text-[10px] text-red-400 font-semibold">{formErrors.oem}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Category / Subcategory *</label>
                      <select 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        required
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.category ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      >
                        <option value="" disabled>-- Select Category / Subcategory --</option>
                        {categoriesList.filter(c => !c.parentCategory).map(parent => {
                          const subs = categoriesList.filter(c => c.parentCategory && c.parentCategory._id === parent._id);
                          return (
                            <optgroup key={parent._id} label={parent.name}>
                              <option value={parent._id}>{parent.name} (Main)</option>
                              {subs.map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      {formErrors.category && <p className="text-[10px] text-red-400 font-semibold">{formErrors.category}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Unit Price (₱) *</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.price ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      />
                      {formErrors.price && <p className="text-[10px] text-red-400 font-semibold">{formErrors.price}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Initial Stock *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        placeholder="0"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.stock ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      />
                      {formErrors.stock && <p className="text-[10px] text-red-400 font-semibold">{formErrors.stock}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Safety Min Stock *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        placeholder="5"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                        className={`w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground ${formErrors.minStock ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-border'}`}
                      />
                      {formErrors.minStock && <p className="text-[10px] text-red-400 font-semibold">{formErrors.minStock}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Vehicle Compatibility Models</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Isuzu ELF NPR, Forward, Hino 300"
                      value={formCompatibility}
                      onChange={(e) => setFormCompatibility(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Item Description & Specifications</label>
                    <textarea 
                      placeholder="Enter manufacturer details, dimensions, and gear tooth spacing details..."
                      rows="2"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground resize-none"
                    />
                  </div>

                  {/* Upload Image Section */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Part Product Image</label>
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
                          className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-secondary file:text-foreground file:hover:bg-slate-700 transition file:cursor-pointer"
                        />
                        <p className="text-[9px] text-muted-foreground">Supported formats: PNG, JPG, WEBP. Max size: 2MB.</p>
                      </div>
                      {formImage && (
                        <button 
                          type="button"
                          onClick={() => setFormImage('')}
                          className="text-[10px] font-bold text-red-500 hover:text-red-400 px-2 py-1 bg-red-950/20 rounded border border-red-900/30"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 p-5 border-t border-border bg-secondary">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-secondary hover:bg-slate-700 text-muted-foreground text-sm font-semibold rounded-xl border border-border transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all"
                  >
                    {modalType === 'add' ? 'Save Component' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Inquiry Form Modal for Customer Mode */}
      {isInquiryModalOpen && inquiryPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background backdrop-blur-sm">
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
                  <span className="text-[10px] font-bold text-brandBlue-400 uppercase tracking-widest">{inquiryPart.category}</span>
                  <h4 className="font-bold text-foreground text-sm">{inquiryPart.name}</h4>
                  <p className="text-[10px] font-mono text-muted-foreground">SKU: {inquiryPart.sku} | OEM: {inquiryPart.oem}</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Requested Quantity *</label>
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Additional Request Details</label>
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
        </div>
      )}

      {/* Inquiry Success Modal */}
      {inquirySuccess && inquiryPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background backdrop-blur-sm">
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
        </div>
      )}
    </div>
  );
}

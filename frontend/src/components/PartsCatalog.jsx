import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Truck, 
  Wrench, 
  PackageCheck,
  X,
  FileCode2,
  Send,
  CheckCircle2
} from 'lucide-react';

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
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  
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

  // Filter logic
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

  const openAddModal = () => {
    setModalType('add');
    setFormName('');
    setFormSku('');
    setFormOem('');
    setFormCategory(categories[1] || 'Engine'); // avoid 'All'
    setFormPrice('');
    setFormStock('');
    setFormMinStock('');
    setFormCompatibility('');
    setFormDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (part) => {
    setModalType('edit');
    setSelectedPart(part);
    setFormName(part.name);
    setFormSku(part.sku);
    setFormOem(part.oem);
    setFormCategory(part.category);
    setFormPrice(part.price.toString());
    setFormStock(part.stock.toString());
    setFormMinStock(part.minStock.toString());
    setFormCompatibility(part.compatibility || '');
    setFormDescription(part.description || '');
    setIsModalOpen(true);
  };

  const openDetailsModal = (part) => {
    setModalType('details');
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const partData = {
      name: formName,
      sku: formSku,
      oem: formOem,
      category: formCategory,
      price: parseFloat(formPrice) || 0,
      stock: parseInt(formStock) || 0,
      minStock: parseInt(formMinStock) || 0,
      compatibility: formCompatibility,
      description: formDescription
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
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by part name, SKU, OEM, or compatibility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-slate-200 placeholder-slate-500"
          />
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-2 items-center justify-end w-full md:w-auto">
          {!isReadOnly && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showLowStockOnly} 
                onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                className="rounded text-red-600 focus:ring-red-600 border-slate-800 bg-slate-950 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Low Stock Warning
              </span>
            </label>
          )}

          {!isReadOnly && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-accent/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Part
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-900 overflow-x-auto pb-px">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? 'border-accent text-accent glow-text-red' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Parts Grid */}
      {filteredParts.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <PackageCheck className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">No Parts Found</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            We couldn't find any truck parts matching your search or filters. Try adjusting your query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredParts.map((part) => {
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
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-[10px] font-extrabold text-red-500 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    LOW STOCK
                  </div>
                )}

                {/* Card Top */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brandBlue-400">
                      {part.category}
                    </span>
                    <h4 
                      onClick={() => openDetailsModal(part)}
                      className="font-bold text-slate-100 hover:text-red-400 cursor-pointer transition-colors line-clamp-2 leading-snug font-outfit"
                    >
                      {part.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs border-y border-slate-900 py-2">
                    <div>
                      <span className="text-slate-500 block">SKU</span>
                      <span className="font-mono text-slate-300 font-semibold">{part.sku}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">OEM Part No.</span>
                      <span className="font-mono text-slate-300 font-semibold truncate block">{part.oem}</span>
                    </div>
                  </div>

                  {part.compatibility && (
                    <div className="text-xs space-y-0.5">
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Truck className="w-3 h-3 text-red-500" /> Fits
                      </span>
                      <p className="text-slate-300 line-clamp-1">{part.compatibility}</p>
                    </div>
                  )}
                </div>

                {/* Card Bottom / Controls */}
                <div className="space-y-4 pt-4 mt-4 border-t border-slate-900">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Unit Price</span>
                      <span className="text-xl font-bold text-slate-200">
                        ₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">{isReadOnly ? 'Stock Status' : 'Quantity'}</span>
                      <span className={`text-base font-extrabold ${isLowStock && !isReadOnly ? 'text-red-500' : 'text-slate-300'}`}>
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
                      className="w-full py-2 bg-brandBlue-900 hover:bg-brandBlue-800 text-brandBlue-300 text-xs font-semibold rounded-lg border border-brandBlue-700/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Request Quote
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
                          className="w-16 bg-slate-950 border border-slate-800/80 rounded-lg text-xs py-1.5 text-center focus:outline-none focus:border-red-600 text-slate-300 font-bold"
                        />
                        <button 
                          onClick={() => handleRestockSubmit(part.id)}
                          className="flex-1 py-1.5 px-3 bg-brandBlue-900 hover:bg-brandBlue-800 text-brandBlue-300 text-xs font-semibold rounded-lg border border-brandBlue-700/30 transition-all flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Restock
                        </button>
                      </div>

                      {/* Edit/Delete Actions */}
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => openEditModal(part)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors border border-slate-800/40"
                          title="Edit Part Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${part.name}?`)) {
                              onDeletePart(part.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-950/10 rounded-lg transition-colors border border-slate-800/40"
                          title="Delete Part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-outfit">
                {modalType === 'add' && 'Add New Truck Part'}
                {modalType === 'edit' && 'Edit Part details'}
                {modalType === 'details' && 'Part Details Overview'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {modalType === 'details' ? (
              <div className="p-6 space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-brandBlue-400 uppercase tracking-widest">{selectedPart?.category}</span>
                  <h2 className="text-xl font-extrabold text-white font-outfit leading-tight">{selectedPart?.name}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950/45 p-4 rounded-xl border border-slate-800/40">
                  <div>
                    <span className="text-xs text-slate-500 uppercase">SKU / Warehouse Stock Code</span>
                    <p className="font-mono font-bold text-slate-300 mt-0.5">{selectedPart?.sku}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase">OEM Part Identification</span>
                    <p className="font-mono font-bold text-slate-300 mt-0.5">{selectedPart?.oem}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-slate-500 uppercase">Unit Retail Price</span>
                    <p className="font-semibold text-lg text-white mt-0.5">₱{selectedPart?.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-slate-500 uppercase">Inventory Quantity</span>
                    <p className={`font-extrabold text-lg mt-0.5 ${selectedPart?.stock <= selectedPart?.minStock ? 'text-red-500' : 'text-emerald-400'}`}>
                      {selectedPart?.stock} units (min: {selectedPart?.minStock})
                    </p>
                  </div>
                </div>

                {selectedPart?.compatibility && (
                  <div className="space-y-1 bg-slate-950/20 p-4 rounded-xl border border-slate-800/30">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-red-500" /> Compatible Models
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedPart.compatibility}</p>
                  </div>
                )}

                {selectedPart?.description && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Technical Description</span>
                    <p className="text-slate-400 text-sm leading-relaxed">{selectedPart.description}</p>
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
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brandBlue-900 text-brandBlue-300 border border-brandBlue-700/30 hover:bg-brandBlue-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Request Quote
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsModalOpen(false);
                        openEditModal(selectedPart);
                      }}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brandBlue-900 text-brandBlue-300 border border-brandBlue-700/30 hover:bg-brandBlue-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Add / Edit Form
              <form onSubmit={handleFormSubmit}>
                <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto pr-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Part Name / Component Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Starter Motor Assembly (24V)"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">SKU / Code *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. ELC-STR-24V"
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">OEM Part Number *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 0-23000-7010"
                        value={formOem}
                        onChange={(e) => setFormOem(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Category *</label>
                      <select 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      >
                        {categories.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Unit Price (₱) *</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Initial Stock *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        placeholder="0"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase">Safety Min Stock *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        placeholder="5"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Vehicle Compatibility Models</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Isuzu ELF NPR, Forward, Hino 300"
                      value={formCompatibility}
                      onChange={(e) => setFormCompatibility(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase">Item Description & Specifications</label>
                    <textarea 
                      placeholder="Enter manufacturer details, dimensions, and gear tooth spacing details..."
                      rows="3"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-all text-slate-200 resize-none"
                    />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-900/60">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700/50 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-outfit">Parts Quote Request</h3>
              <button 
                onClick={() => setIsInquiryModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleRequestQuoteSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-slate-950/45 p-3.5 rounded-xl border border-slate-850 text-xs space-y-1 text-left">
                  <span className="text-[10px] font-bold text-brandBlue-400 uppercase tracking-widest">{inquiryPart.category}</span>
                  <h4 className="font-bold text-slate-200 text-sm">{inquiryPart.name}</h4>
                  <p className="text-[10px] font-mono text-slate-500">SKU: {inquiryPart.sku} | OEM: {inquiryPart.oem}</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Quantity *</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={inquiryQty}
                    onChange={(e) => setInquiryQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-slate-200"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Request Details</label>
                  <textarea 
                    placeholder="E.g., transport lead time, packaging requirements, custom specifications..."
                    rows="3"
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-slate-200 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-800 bg-slate-900/60">
                <button 
                  type="button" 
                  onClick={() => setIsInquiryModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-brandBlue-900 hover:bg-brandBlue-800 text-brandBlue-100 text-xs font-bold rounded-xl shadow-lg border border-brandBlue-700/40 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 text-center animate-scaleUp">
            <div className="mx-auto w-16 h-16 bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-800/35">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-outfit">Inquiry Received!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Quote request submitted successfully. The warehouse team will email or call you regarding **{inquiryPart.name}**.
              </p>
            </div>

            <button 
              onClick={() => setInquirySuccess(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Buildings, User, Plus, Trash, X, CheckCircle, MagnifyingGlass,
  CaretRight, Package, CurrencyDollar, ShoppingCart, PencilSimple,
  Star, Funnel, ArrowsDownUp, ChartBar, Receipt, EnvelopeSimple,
  Globe, Archive, Eye, EyeSlash, ArrowCounterClockwise, FilePdf,
  TrendUp, ClockCounterClockwise, Truck, ListDashes, SquaresFour,
  WarningCircle, CheckSquare, Timer, HandPointing, CalendarBlank
} from '@phosphor-icons/react';
import {
  fetchSuppliers, createSupplier, updateSupplier, archiveSupplier, restoreSupplier,
  fetchPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
  updatePoBillingStatus, togglePartPublished
} from '../authStore';
import { auth } from '../firebaseConfig';
import { useSettings } from '../context/SettingsContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReactCountryFlag from 'react-country-flag';
import { getCategoryIconAndColor } from '../utils/categoryIcons';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area, LabelList
} from 'recharts';
import Select from 'react-select';

// ─── Custom Styles for React-Select Glassmorphism ─────────────────────────────
export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--color-secondary)',
    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-border)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--color-accent)' : 'none',
    '&:hover': {
      borderColor: 'var(--color-accent)'
    },
    color: 'var(--color-foreground)',
    borderRadius: '0.5rem',
    minHeight: '38px',
    padding: '0 4px',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#0f172a', // Tailwind slate-900 for dark mode dropdown menu
    border: '1px solid #1e293b',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    zIndex: 9999
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? 'var(--color-accent)' 
      : state.isFocused 
        ? 'rgba(255, 255, 255, 0.05)' 
        : 'transparent',
    color: state.isSelected ? '#fff' : '#e2e8f0', // slate-200 text
    '&:active': {
      backgroundColor: 'var(--color-accent)'
    },
    padding: '8px 12px'
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--color-foreground)'
  }),
  input: (base) => ({
    ...base,
    color: 'var(--color-foreground)'
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--color-muted-foreground)'
  }),
  menuPortal: base => ({ ...base, zIndex: 9999 })
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NOT_ACKNOWLEDGED_DAYS = 7;
const CHART_COLORS = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

// ─── localStorage helpers for favorites ───────────────────────────────────────
const getFavorites = (key) => {
  try { return JSON.parse(localStorage.getItem(`fav_${key}`) || '[]'); } catch { return []; }
};
const toggleFavorite = (key, id) => {
  const favs = getFavorites(key);
  const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
  localStorage.setItem(`fav_${key}`, JSON.stringify(next));
  return next;
};

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    'Draft':          'bg-secondary text-muted-foreground border-border',
    'RFQ Sent':       'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Confirmed':      'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Received':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Cancelled':      'bg-red-500/15 text-red-400 border-red-500/30',
    'Waiting Bills':  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Bills Received': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${map[status] || map['Draft']}`}>
      {status}
    </span>
  );
};

const StatChip = ({ label, count, icon: Icon, color, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
      active ? `${color} shadow-sm` : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
    }`}
  >
    {Icon && <Icon weight="duotone" className="w-3.5 h-3.5" />}
    {label}
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${active ? 'bg-black/20' : 'bg-background'}`}>
      {count}
    </span>
  </button>
);

const PipelineChevron = ({ currentStatus }) => {
  const stages = ['Draft', 'RFQ Sent', 'Confirmed', 'Received'];
  let idx = stages.indexOf(currentStatus);
  if (idx === -1) idx = 0;
  if (currentStatus === 'Cancelled')
    return <div className="flex border border-red-500/50 rounded-lg overflow-hidden bg-red-950/20 text-red-400 font-bold px-4 py-1.5 text-xs">CANCELLED</div>;
  return (
    <div className="flex bg-secondary/50 rounded-lg border border-border overflow-hidden text-[10px] font-bold uppercase tracking-wider">
      {stages.map((s, i) => (
        <div key={s} className={`flex items-center px-3 py-2 relative transition-colors ${i === idx ? 'bg-accent text-white' : i < idx ? 'text-foreground' : 'text-muted-foreground'}`}>
          {s}
          {i !== stages.length - 1 && <CaretRight weight="bold" className={`absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-3 h-3 ${i === idx ? 'text-accent' : 'text-border'}`} />}
        </div>
      ))}
    </div>
  );
};

// ─── Drag & Drop Image Uploader ─────────────────────────────────────────────
const DragDropImageUploader = ({ image, onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave' || e.type === 'drop') setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onImageUpload(reader.result); // Base64 string
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-muted-foreground">Product Image</label>
      <div 
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
          isDragging ? 'border-accent bg-accent/10' : 'border-border bg-secondary hover:bg-secondary/80'
        }`}
      >
        <input type="file" accept="image/*" onChange={handleChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
        
        {image ? (
          <div className="relative w-full h-32 flex items-center justify-center">
            <img src={image} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
              <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-md">Change Image</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mb-3 border border-border shadow-sm">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Click or Drag & Drop</p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">SVG, PNG, JPG or GIF</p>
          </div>
        )}
      </div>
      {image && (
        <button onClick={() => onImageUpload('')} className="text-xs text-red-400 hover:text-red-300 self-start font-semibold">
          Remove Image
        </button>
      )}
    </div>
  );
};

// ─── Control Panel (Search + Filters + GroupBy + Favorites) ──────────────────
const ControlPanel = ({ search, onSearch, filters, activeFilters, onFilter, groupByOptions, activeGroup, onGroupBy, favoritesCount, onFavoritesFilter, showFavoritesOnly }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const filterRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
      if (groupRef.current && !groupRef.current.contains(e.target)) setShowGroup(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
        />
        {search && (
          <button onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setShowFilters(v => !v); setShowGroup(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${activeFilters.length > 0 ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
          >
            <Funnel weight={activeFilters.length > 0 ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
            Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          {showFilters && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-xl shadow-2xl p-2 min-w-[200px] animate-fadeIn">
              {filters.map(f => (
                <label key={f.value} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer text-sm text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes(f.value)}
                    onChange={() => onFilter(f.value)}
                    className="w-3.5 h-3.5 accent-accent"
                  />
                  {f.label}
                </label>
              ))}
              {activeFilters.length > 0 && (
                <button onClick={() => activeFilters.forEach(f => onFilter(f))} className="w-full mt-1 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg text-left font-semibold">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group By */}
      {groupByOptions.length > 0 && (
        <div className="relative" ref={groupRef}>
          <button
            onClick={() => { setShowGroup(v => !v); setShowFilters(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${activeGroup ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
          >
            <ArrowsDownUp weight="regular" className="w-3.5 h-3.5" />
            {activeGroup ? `By: ${activeGroup}` : 'Group By'}
          </button>
          {showGroup && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-xl shadow-2xl p-2 min-w-[160px] animate-fadeIn">
              {activeGroup && (
                <button onClick={() => { onGroupBy(null); setShowGroup(false); }} className="w-full px-3 py-2 rounded-lg hover:bg-secondary text-left text-xs text-accent font-semibold mb-1">
                  Clear grouping
                </button>
              )}
              {groupByOptions.map(g => (
                <button key={g} onClick={() => { onGroupBy(g); setShowGroup(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeGroup === g ? 'text-accent font-bold bg-accent/10' : 'text-foreground hover:bg-secondary'}`}>
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites */}
      <button
        onClick={onFavoritesFilter}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${showFavoritesOnly ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
      >
        <Star weight={showFavoritesOnly ? 'fill' : 'regular'} className="w-3.5 h-3.5" />
        Favorites {favoritesCount > 0 && `(${favoritesCount})`}
      </button>
    </div>
  );
};

// ─── Grouped DataTable ────────────────────────────────────────────────────────
const GroupedTable = ({ columns, rows, groupBy, onRowClick, favKey, favorites, onToggleFav }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [rows, sortCol, sortDir]);

  const grouped = useMemo(() => {
    if (!groupBy) return { '': sorted };
    return sorted.reduce((acc, row) => {
      const key = row[groupBy] || 'Unknown';
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [sorted, groupBy]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="glass-panel border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-border bg-secondary/80 text-muted-foreground">
              <th className="py-2.5 px-3 w-8"></th>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''} ${col.sortable !== false ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                >
                  <span className="flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}">
                    {col.label}
                    {sortCol === col.key && <span className="text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {Object.entries(grouped).map(([group, groupRows]) => (
              <React.Fragment key={group}>
                {groupBy && group && (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-2 px-4 bg-secondary/40 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                      {group} <span className="text-accent ml-1">({groupRows.length})</span>
                    </td>
                  </tr>
                )}
                {groupRows.map((row) => (
                  <tr
                    key={row._id || row.id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-secondary/50 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-3">
                      <button
                        onClick={e => { e.stopPropagation(); onToggleFav(row._id || row.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star
                          weight={favorites.includes(row._id || row.id) ? 'fill' : 'regular'}
                          className={`w-3.5 h-3.5 ${favorites.includes(row._id || row.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`}
                        />
                      </button>
                    </td>
                    {columns.map(col => (
                      <td key={col.key} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-16 text-center text-muted-foreground">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function PurchasingModule({ onAddLog, parts, onPartsUpdated, transactions, onAddPart, onEditPart, onDeletePart, categories, showToast }) {
  const { formatCurrency } = useSettings();
  const [activeSection, setActiveSection] = useState('orders'); // 'orders' | 'products' | 'reports'
  const [activeOrderTab, setActiveOrderTab] = useState('rfq'); // 'rfq' | 'pos' | 'vendors'

  // Data
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [countries, setCountries] = useState([]);
  const [countryCodes, setCountryCodes] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [viewingPo, setViewingPo] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [viewingPart, setViewingPart] = useState(null);
  const [productActiveTab, setProductActiveTab] = useState('general');

  // Control panel state per sub-view
  const [rfqSearch, setRfqSearch] = useState('');
  const [rfqFilters, setRfqFilters] = useState([]);
  const [rfqGroup, setRfqGroup] = useState(null);
  const [rfqFavsOnly, setRfqFavsOnly] = useState(false);
  const [rfqFavs, setRfqFavs] = useState(getFavorites('rfq'));
  const [rfqStatFilter, setRfqStatFilter] = useState(null);

  const [posSearch, setPosSearch] = useState('');
  const [posFilters, setPosFilters] = useState([]);
  const [posGroup, setPosGroup] = useState(null);
  const [posFavsOnly, setPosFavsOnly] = useState(false);
  const [posFavs, setPosFavs] = useState(getFavorites('pos'));

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorFilters, setVendorFilters] = useState([]);
  const [vendorGroup, setVendorGroup] = useState(null);
  const [vendorFavsOnly, setVendorFavsOnly] = useState(false);
  const [vendorFavs, setVendorFavs] = useState(getFavorites('vendor'));

  const [prodSearch, setProdSearch] = useState('');
  const [prodFilters, setProdFilters] = useState([]);
  const [prodGroup, setProdGroup] = useState(null);
  const [prodFavsOnly, setProdFavsOnly] = useState(false);
  const [prodFavs, setProdFavs] = useState(getFavorites('prod'));
  const [prodView, setProdView] = useState('grid'); // 'grid' | 'list'

  // Forms
  const [supplierForm, setSupplierForm] = useState({ name: '', type: 'Company', contactPerson: '', email: '', phone: '', address: '', country: '', paymentTerms: 'Net 30', notes: '' });
  const [poForm, setPoForm] = useState({ supplier: '', expectedDeliveryDate: '', notes: '', items: [], sourceRfq: '' });
  const [poPartSel, setPoPartSel] = useState('');
  const [poQty, setPoQty] = useState('');
  const [productForm, setProductForm] = useState({ name: '', sku: '', oem: '', category: '', price: '', stock: '', minStock: '', image: '' });

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
    loadCountries();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sups, pos] = await Promise.all([fetchSuppliers(), fetchPurchaseOrders()]);
    setSuppliers(sups);
    setPurchaseOrders(pos);
    setLoading(false);
  };

  const loadCountries = async () => {
    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
      const data = await res.json();
      const names = data.map(c => c.name.common).sort();
      const codeMap = {};
      data.forEach(c => { codeMap[c.name.common] = c.cca2; });
      
      setCountries(names);
      setCountryCodes(codeMap);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
      setCountries([]);
      setCountryCodes({});
    }
  };

  // ── RFQ derived data ─────────────────────────────────────────────────────────
  const today = new Date();
  const rfqs = useMemo(() => purchaseOrders.filter(p => p.status === 'Draft' || p.status === 'RFQ Sent'), [purchaseOrders]);
  const confirmedPos = useMemo(() => purchaseOrders.filter(p => ['Confirmed', 'Received', 'Cancelled'].includes(p.status)), [purchaseOrders]);

  const rfqStats = useMemo(() => ({
    new: rfqs.filter(r => r.status === 'Draft').length,
    sent: rfqs.filter(r => r.status === 'RFQ Sent').length,
    lateRfq: rfqs.filter(r => r.expectedDeliveryDate && new Date(r.expectedDeliveryDate) < today && r.status !== 'Received').length,
    notAcknowledged: rfqs.filter(r => {
      if (r.status !== 'RFQ Sent') return false;
      const diff = (today - new Date(r.updatedAt)) / (1000 * 60 * 60 * 24);
      return diff >= NOT_ACKNOWLEDGED_DAYS;
    }).length,
    lateReceipt: confirmedPos.filter(r => r.status === 'Confirmed' && r.expectedDeliveryDate && new Date(r.expectedDeliveryDate) < today).length,
  }), [rfqs, confirmedPos]);

  // ── Filter / search helpers ───────────────────────────────────────────────────
  const applyFilter = (rows, search, filters, favsOnly, favs, searchFields) => {
    let out = rows;
    if (search) {
      const re = new RegExp(search, 'i');
      out = out.filter(r => searchFields.some(f => re.test(r[f] ?? '')));
    }
    if (favsOnly) out = out.filter(r => favs.includes(r._id || r.id));
    return out;
  };

  const filteredRfqs = useMemo(() => {
    let rows = rfqs;
    if (rfqStatFilter === 'new') rows = rows.filter(r => r.status === 'Draft');
    else if (rfqStatFilter === 'sent') rows = rows.filter(r => r.status === 'RFQ Sent');
    else if (rfqStatFilter === 'lateRfq') rows = rows.filter(r => r.expectedDeliveryDate && new Date(r.expectedDeliveryDate) < today);
    else if (rfqStatFilter === 'notAck') rows = rows.filter(r => {
      if (r.status !== 'RFQ Sent') return false;
      return (today - new Date(r.updatedAt)) / (1000 * 60 * 60 * 24) >= NOT_ACKNOWLEDGED_DAYS;
    });
    if (rfqFilters.includes('myOrders')) rows = rows.filter(r => r.createdBy === 'Admin');
    if (rfqFilters.includes('new')) rows = rows.filter(r => r.status === 'Draft');
    if (rfqFilters.includes('sent')) rows = rows.filter(r => r.status === 'RFQ Sent');
    return applyFilter(rows, rfqSearch, rfqFilters, rfqFavsOnly, rfqFavs, ['poNumber', 'createdBy']);
  }, [rfqs, rfqSearch, rfqFilters, rfqFavsOnly, rfqFavs, rfqStatFilter]);

  const filteredPos = useMemo(() => {
    let rows = confirmedPos;
    if (posFilters.includes('waitingBills')) rows = rows.filter(r => r.billingStatus === 'Waiting Bills');
    if (posFilters.includes('billsReceived')) rows = rows.filter(r => r.billingStatus === 'Bills Received');
    return applyFilter(rows, posSearch, posFilters, posFavsOnly, posFavs, ['poNumber', 'createdBy']);
  }, [confirmedPos, posSearch, posFilters, posFavsOnly, posFavs]);

  const filteredVendors = useMemo(() => {
    let rows = suppliers;
    if (vendorFilters.includes('person')) rows = rows.filter(s => s.type === 'Person');
    if (vendorFilters.includes('company')) rows = rows.filter(s => s.type === 'Company');
    if (vendorFilters.includes('archived')) rows = rows.filter(s => s.archived);
    else rows = rows.filter(s => !s.archived);
    return applyFilter(rows, vendorSearch, vendorFilters, vendorFavsOnly, vendorFavs, ['name', 'email', 'country']);
  }, [suppliers, vendorSearch, vendorFilters, vendorFavsOnly, vendorFavs]);

  const filteredParts = useMemo(() => {
    let rows = parts || [];
    if (prodFilters.includes('published')) rows = rows.filter(p => p.published);
    if (prodFilters.includes('unpublished')) rows = rows.filter(p => !p.published);
    if (prodFilters.includes('archived')) rows = rows.filter(p => p.archived);
    else rows = rows.filter(p => !p.archived);
    if (prodFilters.includes('lowStock')) rows = rows.filter(p => p.stock <= p.minStock);
    const search = prodSearch;
    if (search) {
      const re = new RegExp(search, 'i');
      rows = rows.filter(p => re.test(p.name) || re.test(p.sku) || re.test(p.category));
    }
    if (prodFavsOnly) rows = rows.filter(p => prodFavs.includes(p.id));
    return rows;
  }, [parts, prodSearch, prodFilters, prodFavsOnly, prodFavs]);

  // ── Reports data ─────────────────────────────────────────────────────────────
  const reportData = useMemo(() => {
    // KPI: Total Spend YTD
    const totalSpend = purchaseOrders
      .filter(p => p.status === 'Received')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    // KPI: Capital in Transit
    const capitalInTransit = purchaseOrders
      .filter(p => p.status === 'Confirmed')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    // KPI: Average Supplier Lead Time
    const receivedPOs = purchaseOrders.filter(p => p.status === 'Received' && p.createdAt && p.updatedAt);
    const avgLeadTime = receivedPOs.length > 0
      ? Math.round(receivedPOs.reduce((sum, po) => {
          const days = (new Date(po.updatedAt) - new Date(po.createdAt)) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, days);
        }, 0) / receivedPOs.length)
      : 0;

    // KPI: Pending RFQs
    const pendingRfqs = purchaseOrders.filter(p => p.status === 'Draft' || p.status === 'RFQ Sent').length;

    // Pipeline Distribution
    const pipelineDataRaw = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {});
    const pipelineData = Object.entries(pipelineDataRaw).map(([name, value]) => ({ name, value }));

    // Spend by Vendor (Revamped with counts)
    const spendByVendorRaw = purchaseOrders.filter(p => p.status === 'Received').reduce((acc, po) => {
      const name = po.supplier?.name || 'Unknown';
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += (po.totalAmount || 0);
      acc[name].count += 1;
      return acc;
    }, {});
    
    const spendByVendor = Object.entries(spendByVendorRaw)
      .map(([name, data]) => ({ name, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total).slice(0, 8);

    const topParts = Object.entries(
      purchaseOrders.filter(p => p.status === 'Received').flatMap(po => po.items).reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {})
    ).map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty).slice(0, 8);

    const totalPos = purchaseOrders.filter(p => ['Confirmed', 'Received'].includes(p.status)).length;
    const onTimePos = purchaseOrders.filter(p => p.status === 'Received' && p.expectedDeliveryDate && new Date(p.updatedAt) <= new Date(p.expectedDeliveryDate)).length;
    const onTimeRate = totalPos > 0 ? Math.round((onTimePos / totalPos) * 100) : 0;

    const poByMonth = purchaseOrders.reduce((acc, po) => {
      const m = new Date(po.createdAt).toLocaleDateString('en', { month: 'short', year: '2-digit' });
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    const poTimeline = Object.entries(poByMonth).slice(-8).map(([month, count]) => ({ month, count }));

    const top5Parts = (parts || []).slice(0, 5);
    const purchasedMap = purchaseOrders.filter(p => p.status === 'Received').flatMap(po => po.items)
      .reduce((acc, item) => { acc[item.name] = (acc[item.name] || 0) + item.quantity; return acc; }, {});
    const soldMap = (transactions || []).flatMap(tx => tx.items)
      .reduce((acc, item) => { acc[item.name] = (acc[item.name] || 0) + item.quantity; return acc; }, {});
    const pvs = top5Parts.map(p => ({
      name: p.name,
      purchased: purchasedMap[p.name] || 0,
      sold: soldMap[p.name] || 0
    }));

    return { totalSpend, capitalInTransit, avgLeadTime, pendingRfqs, pipelineData, spendByVendor, topParts, onTimeRate, poTimeline, pvs };
  }, [purchaseOrders, parts, transactions]);

  // ── Product analytics ─────────────────────────────────────────────────────────
  const productSales = useMemo(() => {
    if (!viewingPart) return [];
    return (transactions || []).flatMap(tx => {
      const item = tx.items?.find(i => i.partId === viewingPart.id);
      return item ? [{ date: tx.date, invoice: tx.invoiceNumber, customer: tx.customerName, qty: item.quantity, revenue: item.subtotal }] : [];
    });
  }, [viewingPart, transactions]);

  const productPurchases = useMemo(() => {
    if (!viewingPart) return [];
    return purchaseOrders.flatMap(po => {
      const item = po.items?.find(i => i.partId === viewingPart.id || i.name === viewingPart.name);
      return item ? [{ date: po.createdAt, poNumber: po.poNumber, supplier: po.supplier?.name, qty: item.quantity, status: po.status }] : [];
    });
  }, [viewingPart, purchaseOrders]);

  const totalUnitsSold = productSales.reduce((s, r) => s + r.qty, 0);
  const totalRevenue = productSales.reduce((s, r) => s + r.revenue, 0);
  const unitsOnOrder = productPurchases.filter(p => !['Received', 'Cancelled'].includes(p.status)).reduce((s, p) => s + p.qty, 0);

  // ── Supplier CRUD ─────────────────────────────────────────────────────────────
  const openSupplierModal = (s = null) => {
    setEditingSupplier(s);
    setSupplierForm(s ? { ...s } : { name: '', type: 'Company', contactPerson: '', email: '', phone: '', address: '', country: '', paymentTerms: 'Net 30', notes: '' });
    setIsSupplierModalOpen(true);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return alert('Supplier name is required.');
    if (editingSupplier) {
      const res = await updateSupplier(editingSupplier._id, supplierForm);
      if (res.ok) { setSuppliers(prev => prev.map(s => s._id === res.supplier._id ? res.supplier : s)); setIsSupplierModalOpen(false); onAddLog('system', `Updated supplier: ${res.supplier.name}`); }
      else alert(res.error);
    } else {
      const res = await createSupplier(supplierForm);
      if (res.ok) { setSuppliers(prev => [...prev, res.supplier]); setIsSupplierModalOpen(false); onAddLog('system', `Added supplier: ${res.supplier.name}`); }
      else alert(res.error);
    }
  };

  const doArchiveSupplier = async (id, name) => {
    if (!confirm(`Archive supplier "${name}"? They will be hidden but preserved.`)) return;
    const res = await archiveSupplier(id);
    if (res.ok) { setSuppliers(prev => prev.map(s => s._id === id ? { ...s, archived: true } : s)); setIsSupplierModalOpen(false); onAddLog('system', `Archived supplier: ${name}`); }
    else alert(res.error);
  };

  // ── PO CRUD ───────────────────────────────────────────────────────────────────
  const openPoModal = (po = null) => {
    setViewingPo(po);
    setPoForm(po ? { supplier: po.supplier?._id || '', expectedDeliveryDate: po.expectedDeliveryDate?.substring(0, 10) || '', notes: po.notes || '', items: po.items || [], sourceRfq: po.sourceRfq || '' }
      : { supplier: '', expectedDeliveryDate: '', notes: '', items: [], sourceRfq: '' });
    setIsPoModalOpen(true);
  };

  const addPoItem = () => {
    if (!poPartSel || !poQty || Number(poQty) <= 0) return;
    const part = parts.find(p => p.id === poPartSel);
    if (!part) return;
    setPoForm(prev => ({ ...prev, items: [...prev.items, { partId: part.id, name: part.name, sku: part.sku, quantity: parseInt(poQty), unitPrice: part.price, subtotal: parseInt(poQty) * part.price }] }));
    setPoPartSel(''); setPoQty('');
  };

  const removePoItem = (idx) => setPoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const savePo = async () => {
    if (!poForm.supplier) return alert('Select a vendor.');
    if (poForm.items.length === 0) return alert('Add at least one item.');
    
    // Inject the current user's display name as the Buyer/Handler
    const payload = {
      ...poForm,
      createdBy: auth?.currentUser?.displayName || auth?.currentUser?.email || 'Unknown User'
    };
    
    const res = await createPurchaseOrder(payload);
    if (res.ok) { setPurchaseOrders(prev => [res.purchaseOrder, ...prev]); setViewingPo(res.purchaseOrder); onAddLog('system', `Created PO: ${res.purchaseOrder.poNumber}`); }
    else alert(res.error);
  };

  const updatePoStatus = async (id, status, poNumber) => {
    if (status === 'Received' && !confirm(`Confirming receipt for ${poNumber} will increment stock. Proceed?`)) return;
    if (status === 'Cancelled' && !confirm(`Cancel ${poNumber}?`)) return;
    const res = await updatePurchaseOrderStatus(id, status);
    if (res.ok) {
      const updated = res.purchaseOrder;
      setPurchaseOrders(prev => prev.map(p => p._id === id ? updated : p));
      setViewingPo(updated);
      onAddLog('stock', `PO ${poNumber} → ${status}`);
      if (status === 'Received') {
        if (onPartsUpdated) onPartsUpdated();
        const itemCount = updated?.items?.length || 0;
        if (showToast) showToast(`📦 Stock received: ${itemCount} item${itemCount !== 1 ? 's' : ''} updated from ${poNumber}.`, 'success');
      }
    } else {
      if (showToast) showToast(`Error: ${res.error}`, 'error');
      else alert(res.error);
    }
  };

  const updateBillingStatus = async (id, billingStatus) => {
    const res = await updatePoBillingStatus(id, billingStatus);
    if (res.ok) {
      setPurchaseOrders(prev => prev.map(p => p._id === id ? res.purchaseOrder : p));
      setViewingPo(res.purchaseOrder);
    } else alert(res.error);
  };

  // ── PDF ───────────────────────────────────────────────────────────────────────
  const generatePDF = (po) => {
    const doc = new jsPDF();
    const sup = po.supplier;
    doc.setFontSize(22); doc.text('Purchase Order', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`Reference: ${po.poNumber}`, 14, 35); doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, 14, 40);
    doc.text(`Vendor: ${sup?.name || 'N/A'}`, 14, 55);
    const tableData = po.items.map(i => [`[${i.sku || 'N/A'}] ${i.name}`, i.quantity.toString(), `PHP ${i.unitPrice.toFixed(2)}`, `PHP ${i.subtotal.toFixed(2)}`]);
    autoTable(doc, { startY: 70, head: [['Description', 'Qty', 'Unit Price', 'Amount']], body: tableData, theme: 'grid', headStyles: { fillColor: [44, 62, 80] } });
    const fy = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`Total: PHP ${po.totalAmount.toFixed(2)}`, 14, fy);
    doc.save(`${po.poNumber}.pdf`);
  };

  // ── Product CRUD ──────────────────────────────────────────────────────────────
  const openProductModal = (part = null) => {
    setViewingPart(part);
    setProductActiveTab('general');
    setProductForm(part ? { ...part } : { name: '', sku: '', oem: '', category: categories?.[1] || '', price: '', stock: '', minStock: '' });
    setIsProductModalOpen(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.sku) return alert('Name and SKU required.');

    if (viewingPart && Number(productForm.stock) !== Number(viewingPart.stock)) {
      if (!productForm.adjustmentReason?.trim()) {
        if (showToast) showToast('Reason for stock adjustment is mandatory.', 'error');
        else alert('Reason for stock adjustment is mandatory.');
        return;
      }
    }

    let result;
    if (viewingPart) {
      result = await onEditPart(viewingPart.id, { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock), minStock: Number(productForm.minStock) });
    } else {
      result = await onAddPart({ ...productForm, price: Number(productForm.price), stock: Number(productForm.stock), minStock: Number(productForm.minStock) });
    }
    // Only close if the parent reported success (or if it returned nothing — legacy)
    if (!result || result.ok) {
      setIsProductModalOpen(false);
    } else if (result.error) {
      if (showToast) showToast(`Error: ${result.error}`, 'error');
      else alert(result.error);
    }
  };

  const doTogglePublished = async (partId, current) => {
    const res = await togglePartPublished(partId, !current);
    if (res.ok && onPartsUpdated) onPartsUpdated();
  };

  // ── Tab config ────────────────────────────────────────────────────────────────
  const sectionTabs = [
    { key: 'orders', label: 'Orders', icon: Receipt },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'reports', label: 'Reports', icon: ChartBar },
  ];
  const orderTabs = [
    { key: 'rfq', label: 'Requests for Quotation' },
    { key: 'pos', label: 'Purchase Orders' },
    { key: 'vendors', label: 'Vendors' },
  ];

  // ── RFQ columns ───────────────────────────────────────────────────────────────
  const rfqColumns = [
    { key: 'poNumber', label: 'Reference', className: 'font-bold text-foreground group-hover:text-accent transition-colors', render: (v) => v },
    { key: 'vendorName', label: 'Vendor', render: (_, r) => r.supplier?.name || '—' },
    { key: 'createdBy', label: 'Buyer' },
    { key: 'expectedDeliveryDate', label: 'Order Deadline', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: v => <span className="font-bold">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', align: 'right', render: v => <StatusBadge status={v} /> },
  ];
  const posColumns = [
    { key: 'poNumber', label: 'Reference', className: 'font-bold text-foreground group-hover:text-accent transition-colors' },
    { key: 'confirmationDate', label: 'Confirmation Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'vendorName', label: 'Vendor', render: (_, r) => r.supplier?.name || '—' },
    { key: 'createdBy', label: 'Buyer' },
    { key: 'sourceRfq', label: 'Source', render: v => v ? <span className="font-mono text-xs text-muted-foreground">{v}</span> : '—' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: v => <span className="font-bold">{formatCurrency(v)}</span> },
    { key: 'billingStatus', label: 'Billing', align: 'right', render: v => <StatusBadge status={v || 'Waiting Bills'} /> },
    { key: 'expectedDeliveryDate', label: 'Expected Arrival', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', align: 'right', render: v => <StatusBadge status={v} /> },
  ];
  const vendorColumns = [
    { key: 'name', label: 'Name', className: 'font-bold text-foreground group-hover:text-accent transition-colors', render: (v, r) => (
      <span className="flex items-center gap-2">
        {r.type === 'Person' ? <User weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" /> : <Buildings weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />}
        {v}
      </span>
    ) },
    { key: 'email', label: 'Email', render: v => v ? <a href={`mailto:${v}`} onClick={e => e.stopPropagation()} className="text-accent hover:underline">{v}</a> : '—' },
    { key: 'phone', label: 'Phone' },
    { key: 'country', label: 'Country', render: v => {
      if (!v) return '—';
      const countryKey = Object.keys(countryCodes).find(k => k.toLowerCase() === v.toLowerCase().trim());
      return (
        <div className="flex items-center justify-center">
          {countryKey ? <ReactCountryFlag title={countryKey} countryCode={countryCodes[countryKey]} svg style={{ width: '1.8em', height: '1.8em' }} className="rounded-sm shadow-sm hover:scale-110 transition-transform cursor-help" /> : <span className="text-xs">{v}</span>}
        </div>
      );
    } },
    { key: 'paymentTerms', label: 'Payment Terms' },
  ];

  if (loading) return (
    <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">
      <Package weight="duotone" className="w-8 h-8 mr-3 text-accent animate-spin" style={{ animationDuration: '2s' }} />
      Loading Purchasing data...
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background animate-fadeIn">
      {/* ── Top Navigation ── */}
      <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Purchasing</span>
          {activeSection !== 'orders' && <><CaretRight className="w-3 h-3" /><span className="capitalize text-foreground font-medium">{activeSection}</span></>}
          {activeSection === 'orders' && <><CaretRight className="w-3 h-3" /><span className="text-foreground font-medium">{orderTabs.find(t => t.key === activeOrderTab)?.label}</span></>}
        </div>
        <div className="flex items-center gap-1 bg-secondary border border-border p-1 rounded-xl">
          {sectionTabs.map(t => (
            <button key={t.key} onClick={() => setActiveSection(t.key)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeSection === t.key ? 'bg-background text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <t.icon weight={activeSection === t.key ? 'duotone' : 'regular'} className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (activeSection === 'products') openProductModal();
            else if (activeSection === 'orders' && activeOrderTab === 'vendors') openSupplierModal();
            else if (activeSection === 'orders') openPoModal();
          }}
          className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg shadow transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus weight="bold" /> New
        </button>
      </div>

      {/* ── Orders Section ── */}
      {activeSection === 'orders' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Sub tabs */}
          <div className="flex gap-0 border-b border-border bg-background px-6">
            {orderTabs.map(t => (
              <button key={t.key} onClick={() => setActiveOrderTab(t.key)} className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeOrderTab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
                {t.key === 'rfq' && rfqs.length > 0 && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded-full font-bold">{rfqs.length}</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-secondary/20">
            {/* RFQ Tab */}
            {activeOrderTab === 'rfq' && (
              <>
                {/* Stat chips */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <StatChip label="New" count={rfqStats.new} icon={Plus} color="bg-blue-500/15 border-blue-500/30 text-blue-400" active={rfqStatFilter === 'new'} onClick={() => setRfqStatFilter(p => p === 'new' ? null : 'new')} />
                  <StatChip label="RFQ Sent" count={rfqStats.sent} icon={EnvelopeSimple} color="bg-cyan-500/15 border-cyan-500/30 text-cyan-400" active={rfqStatFilter === 'sent'} onClick={() => setRfqStatFilter(p => p === 'sent' ? null : 'sent')} />
                  <StatChip label="Late RFQ" count={rfqStats.lateRfq} icon={Timer} color="bg-orange-500/15 border-orange-500/30 text-orange-400" active={rfqStatFilter === 'lateRfq'} onClick={() => setRfqStatFilter(p => p === 'lateRfq' ? null : 'lateRfq')} />
                  <StatChip label="Not Acknowledged" count={rfqStats.notAcknowledged} icon={WarningCircle} color="bg-amber-500/15 border-amber-500/30 text-amber-400" active={rfqStatFilter === 'notAck'} onClick={() => setRfqStatFilter(p => p === 'notAck' ? null : 'notAck')} />
                  <StatChip label="Late Receipt" count={rfqStats.lateReceipt} icon={HandPointing} color="bg-red-500/15 border-red-500/30 text-red-400" active={rfqStatFilter === 'lateReceipt'} onClick={() => setRfqStatFilter(p => p === 'lateReceipt' ? null : 'lateReceipt')} />
                </div>
                <ControlPanel
                  search={rfqSearch} onSearch={setRfqSearch}
                  filters={[{ value: 'myOrders', label: 'My Orders' }, { value: 'new', label: 'New' }, { value: 'sent', label: 'RFQ Sent' }]}
                  activeFilters={rfqFilters} onFilter={v => setRfqFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Vendor', 'Buyer', 'Status']} activeGroup={rfqGroup} onGroupBy={setRfqGroup}
                  favoritesCount={rfqFavs.length} onFavoritesFilter={() => setRfqFavsOnly(p => !p)} showFavoritesOnly={rfqFavsOnly}
                />
                <GroupedTable
                  columns={rfqColumns} rows={filteredRfqs} groupBy={rfqGroup}
                  onRowClick={openPoModal}
                  favKey="rfq" favorites={rfqFavs}
                  onToggleFav={id => setRfqFavs(toggleFavorite('rfq', id))}
                />
              </>
            )}

            {/* PO Tab */}
            {activeOrderTab === 'pos' && (
              <>
                <ControlPanel
                  search={posSearch} onSearch={setPosSearch}
                  filters={[{ value: 'waitingBills', label: 'Waiting Bills' }, { value: 'billsReceived', label: 'Bills Received' }]}
                  activeFilters={posFilters} onFilter={v => setPosFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Vendor', 'Buyer', 'Status']} activeGroup={posGroup} onGroupBy={setPosGroup}
                  favoritesCount={posFavs.length} onFavoritesFilter={() => setPosFavsOnly(p => !p)} showFavoritesOnly={posFavsOnly}
                />
                <GroupedTable
                  columns={posColumns} rows={filteredPos} groupBy={posGroup}
                  onRowClick={openPoModal}
                  favKey="pos" favorites={posFavs}
                  onToggleFav={id => setPosFavs(toggleFavorite('pos', id))}
                />
              </>
            )}

            {/* Vendors Tab */}
            {activeOrderTab === 'vendors' && (
              <>
                <ControlPanel
                  search={vendorSearch} onSearch={setVendorSearch}
                  filters={[{ value: 'person', label: 'Person' }, { value: 'company', label: 'Company' }, { value: 'archived', label: 'Show Archived' }]}
                  activeFilters={vendorFilters} onFilter={v => setVendorFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Country', 'Type']} activeGroup={vendorGroup} onGroupBy={setVendorGroup}
                  favoritesCount={vendorFavs.length} onFavoritesFilter={() => setVendorFavsOnly(p => !p)} showFavoritesOnly={vendorFavsOnly}
                />
                <GroupedTable
                  columns={vendorColumns} rows={filteredVendors} groupBy={vendorGroup}
                  onRowClick={openSupplierModal}
                  favKey="vendor" favorites={vendorFavs}
                  onToggleFav={id => setVendorFavs(toggleFavorite('vendor', id))}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Products Section ── */}
      {activeSection === 'products' && (
        <div className="flex-1 overflow-y-auto p-6 bg-secondary/20">
          <div className="flex items-center justify-between mb-2">
            <ControlPanel
              search={prodSearch} onSearch={setProdSearch}
              filters={[{ value: 'published', label: 'Published' }, { value: 'unpublished', label: 'Unpublished' }, { value: 'lowStock', label: 'Low Stock' }, { value: 'archived', label: 'Show Archived' }]}
              activeFilters={prodFilters} onFilter={v => setProdFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
              groupByOptions={['Category']} activeGroup={prodGroup} onGroupBy={setProdGroup}
              favoritesCount={prodFavs.length} onFavoritesFilter={() => setProdFavsOnly(p => !p)} showFavoritesOnly={prodFavsOnly}
            />
            <div className="flex items-center gap-1 bg-secondary border border-border p-1 rounded-lg ml-2 mb-4">
              <button onClick={() => setProdView('grid')} className={`p-1.5 rounded transition-colors ${prodView === 'grid' ? 'bg-background text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><SquaresFour className="w-4 h-4" /></button>
              <button onClick={() => setProdView('list')} className={`p-1.5 rounded transition-colors ${prodView === 'list' ? 'bg-background text-accent shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><ListDashes className="w-4 h-4" /></button>
            </div>
          </div>

          {prodView === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredParts.map(part => {
                const { Icon, color } = getCategoryIconAndColor(part.category);
                const isLow = part.stock <= part.minStock;
                const isFav = prodFavs.includes(part.id);
                return (
                  <div key={part.id} onClick={() => openProductModal(part)} className={`bg-secondary border rounded-xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col group relative ${part.archived ? 'opacity-50 border-border/30' : 'border-border'}`}>
                    {isLow && !part.archived && <div className="absolute top-3 right-8 w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_6px_rgba(220,38,38,0.7)]" title="Low Stock" />}
                    <button onClick={e => { e.stopPropagation(); setProdFavs(toggleFavorite('prod', part.id)); }} className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Star weight={isFav ? 'fill' : 'regular'} className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`} />
                    </button>
                    <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center mb-3 shadow-inner" style={{ color: color || '#888' }}>
                      <Icon weight="duotone" className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono tracking-wider">{part.sku}</span>
                    <h4 className="font-bold text-foreground leading-snug line-clamp-2 mt-1 mb-auto group-hover:text-accent transition-colors text-sm">{part.name}</h4>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-sm font-extrabold text-foreground">{formatCurrency(part.price)}</span>
                      <span className={`text-[11px] font-bold ${isLow ? 'text-accent' : 'text-emerald-500'}`}>{part.stock} pcs</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {part.published ? <Eye weight="duotone" className="w-3 h-3 text-emerald-500" /> : <EyeSlash weight="duotone" className="w-3 h-3 text-muted-foreground" />}
                      <span className={`text-[10px] font-semibold ${part.published ? 'text-emerald-500' : 'text-muted-foreground'}`}>{part.published ? 'Published' : 'Unpublished'}</span>
                      {part.archived && <span className="ml-auto text-[10px] font-bold text-amber-400 flex items-center gap-0.5"><Archive className="w-3 h-3" /> Archived</span>}
                    </div>
                  </div>
                );
              })}
              {filteredParts.length === 0 && <div className="col-span-full py-16 text-center text-muted-foreground">No products found.</div>}
            </div>
          ) : (
            <GroupedTable
              columns={[
                { key: 'name', label: 'Product', className: 'font-bold text-foreground group-hover:text-accent transition-colors' },
                { key: 'sku', label: 'SKU', render: v => <span className="font-mono text-xs">{v}</span> },
                { key: 'category', label: 'Category' },
                { key: 'price', label: 'Price', align: 'right', render: v => formatCurrency(v) },
                { key: 'stock', label: 'Stock', align: 'right', render: (v, r) => <span className={`font-bold ${v <= r.minStock ? 'text-accent' : 'text-emerald-500'}`}>{v}</span> },
                { key: 'published', label: 'Published', align: 'right', render: v => v ? <Eye weight="duotone" className="w-4 h-4 text-emerald-500 ml-auto" /> : <EyeSlash weight="duotone" className="w-4 h-4 text-muted-foreground ml-auto" /> },
              ]}
              rows={filteredParts} groupBy={prodGroup}
              onRowClick={openProductModal}
              favKey="prod" favorites={prodFavs}
              onToggleFav={id => setProdFavs(toggleFavorite('prod', id))}
            />
          )}
        </div>
      )}

      {/* ── Reports Section ── */}
      {activeSection === 'reports' && (
        <div className="flex-1 overflow-y-auto p-6 bg-secondary/20 space-y-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-foreground">Purchasing Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">Advanced metrics and operational pipeline analysis.</p>
          </div>

          {/* Executive KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-accent/20 group-hover:bg-accent transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><CurrencyDollar className="w-4 h-4 text-emerald-500" /> Total Spend (YTD)</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{formatCurrency(reportData.totalSpend)}</span>
              <span className="text-[10px] text-muted-foreground mt-2">Capital in received inventory</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-400" /> Capital in Transit</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{formatCurrency(reportData.capitalInTransit)}</span>
              <span className="text-[10px] text-muted-foreground mt-2">Confirmed orders awaiting delivery</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Timer className="w-4 h-4 text-amber-500" /> Avg Supplier Lead Time</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{reportData.avgLeadTime} <span className="text-sm text-muted-foreground font-semibold">days</span></span>
              <span className="text-[10px] text-muted-foreground mt-2">From order confirmation to receipt</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/20 group-hover:bg-purple-500 transition-colors" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><EnvelopeSimple className="w-4 h-4 text-purple-400" /> Pending RFQs</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{reportData.pendingRfqs} <span className="text-sm text-muted-foreground font-semibold">requests</span></span>
              <span className="text-[10px] text-muted-foreground mt-2">Drafts and sent quotes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Vendor Spend & Order Matrix */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><CurrencyDollar weight="duotone" className="w-4 h-4 text-emerald-500" /> Vendor Spend & Order Matrix</h3>
              {reportData.spendByVendor.length > 0 ? (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.spendByVendor} layout="vertical" margin={{ top: 0, right: 60, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={200} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(v, name) => [name === 'total' ? `₱${v.toLocaleString()}` : v, name === 'total' ? 'Spend' : 'Total Orders']} 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20} minPointSize={3}>
                        <LabelList dataKey="total" position="right" formatter={(v) => `₱${v.toLocaleString()}`} fill="#94a3b8" fontSize={10} fontWeight="bold" />
                        {reportData.spendByVendor.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-8 text-center">No received orders yet.</p>}
            </div>

            {/* Pipeline Bottleneck Distribution */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ChartBar weight="duotone" className="w-4 h-4 text-purple-400" /> Order Pipeline Distribution</h3>
              {reportData.pipelineData.length > 0 ? (
                <div className="w-full h-64 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.pipelineData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {reportData.pipelineData.map((entry, index) => {
                          const COLORS = { 'Draft': '#94a3b8', 'RFQ Sent': '#a855f7', 'Confirmed': '#3b82f6', 'Received': '#10b981', 'Cancelled': '#ef4444' };
                          return <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={40} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '15px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-black text-foreground">{purchaseOrders.length}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Total POs</span>
                  </div>
                </div>
              ) : <p className="text-muted-foreground text-sm py-8 text-center m-auto">No orders in pipeline.</p>}
            </div>

            {/* PO History Timeline (Area Chart) */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ClockCounterClockwise weight="duotone" className="w-4 h-4 text-accent" /> PO History Timeline</h3>
              {reportData.poTimeline.length > 0 ? (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.poTimeline} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-8 text-center">No purchase orders yet.</p>}
            </div>

            {/* Top Restocked Parts */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Package weight="duotone" className="w-4 h-4 text-emerald-500" /> Top Restocked Parts</h3>
              {reportData.topParts.length > 0 ? (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.topParts} margin={{ top: 25, right: 0, left: -20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-35} textAnchor="end" height={80} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="qty" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} minPointSize={3}>
                        <LabelList dataKey="qty" position="top" fill="#94a3b8" fontSize={10} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-8 text-center">No received orders yet.</p>}
            </div>

            {/* Purchase vs Sales Volume */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><TrendUp weight="duotone" className="w-4 h-4 text-accent" /> Overstock Analysis: Purchase vs Sales Volume</h3>
              {reportData.pvs.some(p => p.purchased > 0 || p.sold > 0) ? (
                <div className="w-full h-72 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.pvs} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                      <Bar dataKey="purchased" name="Total Purchased" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="sold" name="Total Sold" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-8 text-center">No data yet. Create purchase orders and record sales to see this chart.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── VENDOR MODAL ── */}
      {isSupplierModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
              <h3 className="text-xl font-bold text-foreground">{editingSupplier ? 'Vendor Profile' : 'New Vendor'}</h3>
              <div className="flex items-center gap-2">
                <button onClick={saveSupplier} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow flex items-center gap-1.5 transition-all active:scale-95">
                  <CheckCircle weight="bold" className="w-4 h-4" /> Save
                </button>
                {editingSupplier && (
                  <button onClick={() => doArchiveSupplier(editingSupplier._id, editingSupplier.name)} className="px-3 py-1.5 bg-secondary border border-border hover:bg-amber-500/10 hover:border-amber-500/30 text-muted-foreground hover:text-amber-400 text-sm font-bold rounded transition-all flex items-center gap-1.5">
                    <Archive weight="bold" className="w-4 h-4" /> Archive
                  </button>
                )}
                <button onClick={() => setIsSupplierModalOpen(false)} className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded transition-all"><X weight="bold" className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto bg-background space-y-6">
              {/* Type + Name */}
              <div className="flex gap-6">
                <div className="w-20 h-20 shrink-0 bg-secondary border border-border shadow-inner rounded-lg flex items-center justify-center text-muted-foreground">
                  {supplierForm.type === 'Person' ? <User weight="fill" className="w-10 h-10" /> : <Buildings weight="fill" className="w-10 h-10" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"><input type="radio" checked={supplierForm.type === 'Individual'} onChange={() => setSupplierForm({ ...supplierForm, type: 'Person' })} className="accent-accent" /> Individual</label>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"><input type="radio" checked={supplierForm.type === 'Company'} onChange={() => setSupplierForm({ ...supplierForm, type: 'Company' })} className="accent-accent" /> Company</label>
                  </div>
                  <input type="text" placeholder="Vendor Name *" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full bg-transparent border-b-2 border-border focus:border-accent focus:outline-none text-2xl font-extrabold text-foreground placeholder:text-muted-foreground pb-1 transition-colors" />
                </div>
              </div>
              {/* Fields grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { label: 'Contact Person', key: 'contactPerson', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Phone', key: 'phone', type: 'text' },
                  { label: 'Address', key: 'address', type: 'text' },
                  { label: 'Payment Terms', key: 'paymentTerms', type: 'text' },
                ].map(f => (
                  <div key={f.key} className="flex border-b border-border pb-1">
                    <label className="w-1/3 font-semibold text-muted-foreground pt-0.5">{f.label}</label>
                    <input type={f.type} value={supplierForm[f.key]} onChange={e => setSupplierForm({ ...supplierForm, [f.key]: e.target.value })}
                      className="w-2/3 bg-transparent focus:outline-none text-foreground" />
                  </div>
                ))}
                {/* Country dropdown */}
                <div className="flex border-b border-border pb-1">
                  <label className="w-1/3 font-semibold text-muted-foreground pt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" /> Country</label>
                  <select value={supplierForm.country} onChange={e => setSupplierForm({ ...supplierForm, country: e.target.value })}
                    className="w-2/3 bg-transparent focus:outline-none text-foreground">
                    <option value="">Select country...</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">Notes</label>
                <textarea value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg p-2 focus:ring-1 focus:ring-accent text-sm resize-none h-16 focus:outline-none" />
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── PO MODAL ── */}
      {isPoModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pb-10 px-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn custom-scrollbar">
          <div className="w-full max-w-5xl bg-secondary border border-border shadow-2xl rounded-2xl overflow-hidden animate-scaleUp flex flex-col relative my-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-border bg-background gap-3 sticky top-0 z-20">
              <div className="flex flex-wrap items-center gap-2">
                {viewingPo ? (
                  <>
                    {viewingPo.status === 'Draft' && <>
                      <button onClick={() => updatePoStatus(viewingPo._id, 'RFQ Sent', viewingPo.poNumber)} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow-sm">Send RFQ</button>
                      <button onClick={() => updatePoStatus(viewingPo._id, 'Confirmed', viewingPo.poNumber)} className="px-4 py-1.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded shadow-sm">Confirm Order</button>
                    </>}
                    {viewingPo.status === 'RFQ Sent' && <button onClick={() => updatePoStatus(viewingPo._id, 'Confirmed', viewingPo.poNumber)} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow-sm">Confirm Order</button>}
                    {viewingPo.status === 'Confirmed' && <>
                      <button onClick={() => updatePoStatus(viewingPo._id, 'Received', viewingPo.poNumber)} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow-sm">Receive Products</button>
                      {viewingPo.billingStatus === 'Waiting Bills' && <button onClick={() => updateBillingStatus(viewingPo._id, 'Bills Received')} className="px-4 py-1.5 bg-secondary border border-border text-foreground text-sm font-bold rounded shadow-sm hover:bg-secondary/80">Mark Bills Received</button>}
                    </>}
                    {viewingPo.status === 'Received' && viewingPo.billingStatus === 'Waiting Bills' && (
                      <button onClick={() => updateBillingStatus(viewingPo._id, 'Bills Received')} className="px-4 py-1.5 bg-secondary border border-border text-foreground text-sm font-bold rounded shadow-sm hover:bg-secondary/80">Mark Bills Received</button>
                    )}
                    {['Draft', 'RFQ Sent'].includes(viewingPo.status) && <button onClick={() => updatePoStatus(viewingPo._id, 'Cancelled', viewingPo.poNumber)} className="px-4 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold rounded shadow-sm hover:bg-red-500/20">Cancel</button>}
                    <button onClick={() => generatePDF(viewingPo)} className="px-3 py-1.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded shadow-sm flex items-center gap-1.5 ml-2">
                      <FilePdf weight="duotone" className="w-4 h-4 text-red-400" /> PDF
                    </button>
                  </>
                ) : (
                  <button onClick={savePo} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow-sm">Save Draft</button>
                )}
                <button onClick={() => setIsPoModalOpen(false)} className="px-4 py-1.5 text-muted-foreground hover:text-foreground text-sm font-bold rounded border border-transparent hover:border-border hover:bg-secondary ml-auto md:ml-2">Discard</button>
                <button onClick={() => setIsPoModalOpen(false)} className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded ml-1"><X weight="bold" className="w-5 h-5" /></button>
              </div>
              <div className="hidden md:block">
                <PipelineChevron currentStatus={viewingPo?.status || 'Draft'} />
              </div>
            </div>

            {/* Body */}
            <div className="p-6 md:p-10 bg-background">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">{viewingPo ? viewingPo.poNumber : 'New Purchase Order'}</h1>
                {viewingPo && <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={viewingPo.status} />
                  <StatusBadge status={viewingPo.billingStatus || 'Waiting Bills'} />
                </div>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mb-10">
                <div className="space-y-4">
                  <div className="flex border-b border-border pb-1">
                    <label className="w-1/3 font-bold text-foreground">Vendor</label>
                    <select disabled={!!viewingPo} value={poForm.supplier} onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} className="w-2/3 bg-transparent focus:outline-none text-foreground disabled:text-accent font-semibold">
                      <option value="">Select Vendor...</option>
                      {suppliers.filter(s => !s.archived).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex border-b border-border pb-1">
                    <label className="w-1/3 font-bold text-foreground">Source RFQ</label>
                    <input type="text" disabled={!!viewingPo} value={poForm.sourceRfq} onChange={e => setPoForm({ ...poForm, sourceRfq: e.target.value })} placeholder="RFQ reference..." className="w-2/3 bg-transparent focus:outline-none text-foreground font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex border-b border-border pb-1">
                    <label className="w-1/3 font-bold text-foreground">Order Date</label>
                    <span className="w-2/3 text-foreground">{viewingPo ? new Date(viewingPo.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex border-b border-border pb-1">
                    <label className="w-1/3 font-bold text-foreground">Expected Arrival</label>
                    <input disabled={!!viewingPo} type="date" value={poForm.expectedDeliveryDate} onChange={e => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })} className="w-2/3 bg-transparent focus:outline-none text-foreground" />
                  </div>
                  {viewingPo?.confirmationDate && (
                    <div className="flex border-b border-border pb-1">
                      <label className="w-1/3 font-bold text-foreground">Confirmed On</label>
                      <span className="w-2/3 text-foreground">{new Date(viewingPo.confirmationDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <div className="border-b border-border mb-4 flex"><button className="border-b-2 border-accent text-accent font-bold pb-2 text-sm">Products</button></div>
              <div className="min-h-[200px]">
                <table className="w-full text-left text-sm whitespace-nowrap mb-4">
                  <thead><tr className="border-b-2 border-border text-muted-foreground">
                    <th className="py-2 px-2 font-bold w-1/2">Product</th>
                    <th className="py-2 px-2 font-bold text-right w-1/6">Qty</th>
                    <th className="py-2 px-2 font-bold text-right w-1/6">Unit Price</th>
                    <th className="py-2 px-2 font-bold text-right w-1/6">Subtotal</th>
                    {!viewingPo && <th className="w-8" />}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {poForm.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/50">
                        <td className="py-2 px-2 font-medium">[{item.sku}] {item.name}</td>
                        <td className="py-2 px-2 text-right">{item.quantity}</td>
                        <td className="py-2 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 px-2 text-right font-bold">{formatCurrency(item.subtotal)}</td>
                        {!viewingPo && <td className="py-2 px-2 text-right"><button onClick={() => removePoItem(idx)} className="text-muted-foreground hover:text-accent"><X className="w-4 h-4" /></button></td>}
                      </tr>
                    ))}
                    {!viewingPo && (
                      <tr><td colSpan="5" className="py-2">
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-1/2">
                            <Select
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              placeholder="Type to search product..."
                              value={poPartSel ? { value: poPartSel, label: `[${(parts.find(p => p.id === poPartSel)||{}).sku}] ${(parts.find(p => p.id === poPartSel)||{}).name}` } : null}
                              onChange={(option) => setPoPartSel(option ? option.value : '')}
                              options={(parts || []).filter(p => !p.archived).map(p => ({
                                value: p.id,
                                label: `[${p.sku}] ${p.name}`
                              }))}
                              isClearable
                              isSearchable
                            />
                          </div>
                          <input type="number" min="1" placeholder="Qty" value={poQty} onChange={e => setPoQty(e.target.value)} className="w-20 bg-secondary border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-accent text-center text-foreground" />
                          <button onClick={addPoItem} className="px-3 py-1.5 text-accent font-bold hover:bg-accent/10 rounded text-sm">Add Line</button>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
                <div className="flex justify-between items-start mt-4 pt-4 border-t border-border">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Notes</label>
                    <textarea disabled={!!viewingPo} value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} className="w-full bg-transparent border border-border rounded-lg p-2 focus:ring-1 focus:ring-accent text-sm resize-none h-16 focus:outline-none" />
                  </div>
                  <div className="w-1/3 flex justify-between font-bold text-lg text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(poForm.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── PRODUCT PROFILE MODAL ── */}
      {isProductModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl h-[88vh] bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center shadow-inner">
                  <Package weight="duotone" className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground leading-tight">{viewingPart ? viewingPart.name : 'New Product'}</h3>
                  {viewingPart && <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">SKU: {viewingPart.sku}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveProduct} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg shadow flex items-center gap-1.5 transition-all active:scale-95">
                  <CheckCircle weight="bold" className="w-4 h-4" /> Save
                </button>
                {viewingPart && (
                  <button onClick={() => { doTogglePublished(viewingPart.id, viewingPart.published); setIsProductModalOpen(false); }} className={`px-3 py-1.5 text-sm font-bold rounded-lg border transition-all flex items-center gap-1.5 ${viewingPart.published ? 'bg-secondary border-border text-muted-foreground hover:text-foreground' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                    {viewingPart.published ? <><EyeSlash weight="bold" className="w-4 h-4" /> Unpublish</> : <><Eye weight="bold" className="w-4 h-4" /> Publish</>}
                  </button>
                )}
                {viewingPart && (
                  <button onClick={() => { if (confirm('Archive this product? It will be hidden but preserved.')) { onDeletePart(viewingPart.id); setIsProductModalOpen(false); } }} className="px-3 py-1.5 text-sm font-bold rounded-lg border border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all flex items-center gap-1.5">
                    <Archive weight="bold" className="w-4 h-4" /> Archive
                  </button>
                )}
                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg ml-1"><X weight="bold" className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
              {/* Stats row */}
              {viewingPart && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Units Sold', value: totalUnitsSold, icon: ShoppingCart, color: 'text-foreground' },
                    { label: 'Revenue', value: formatCurrency(totalRevenue), icon: CurrencyDollar, color: 'text-emerald-500' },
                    { label: 'On Order', value: unitsOnOrder, icon: Truck, color: 'text-blue-400' },
                    { label: 'In Stock', value: viewingPart.stock, icon: Package, color: viewingPart.stock <= viewingPart.minStock ? 'text-accent' : 'text-foreground', alert: viewingPart.stock <= viewingPart.minStock },
                  ].map(s => (
                    <div key={s.label} className={`bg-secondary border rounded-xl p-4 text-center shadow-sm relative overflow-hidden ${s.alert ? 'border-accent/50' : 'border-border'}`}>
                      {s.alert && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />}
                      <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        <s.icon weight="duotone" className="w-3.5 h-3.5" /> {s.label}
                      </span>
                      <div className={`text-2xl font-extrabold font-display ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-border mb-6">
                {[
                  { key: 'general', label: 'General Information' },
                  ...(viewingPart ? [{ key: 'sales', label: 'Sales Analytics' }, { key: 'purchases', label: 'Purchase History' }] : []),
                ].map(t => (
                  <button key={t.key} onClick={() => setProductActiveTab(t.key)} className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${productActiveTab === t.key ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* General */}
              {productActiveTab === 'general' && (
                <div className="space-y-8">
                  {/* Image Upload Area */}
                  <DragDropImageUploader 
                    image={productForm.image} 
                    onImageUpload={(b64) => setProductForm({ ...productForm, image: b64 })} 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <div className="space-y-5">
                      {[
                        { label: 'Product Name', key: 'name', type: 'text', bold: true },
                        { label: 'SKU', key: 'sku', type: 'text', mono: true },
                        { label: 'OEM / MPN', key: 'oem', type: 'text' },
                      ].map(f => (
                        <div key={f.key} className="flex flex-col border-b border-border pb-1">
                          <label className="text-xs font-bold text-muted-foreground mb-1">{f.label}</label>
                          <input type={f.type} value={productForm[f.key] || ''} onChange={e => setProductForm({ ...productForm, [f.key]: e.target.value })}
                            className={`bg-transparent focus:outline-none text-foreground ${f.bold ? 'font-semibold text-lg' : ''} ${f.mono ? 'font-mono' : ''}`} />
                        </div>
                      ))}
                      <div className="flex flex-col border-b border-border pb-1">
                        <label className="text-xs font-bold text-muted-foreground mb-1">Category</label>
                        <select value={productForm.category || ''} onChange={e => setProductForm({ ...productForm, category: e.target.value })} className="bg-transparent focus:outline-none text-foreground">
                          {(categories || []).filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-5">
                    {[
                      { label: 'Unit Price (PHP)', key: 'price', type: 'number' },
                      { label: 'Current Stock', key: 'stock', type: 'number' },
                      { label: 'Min Safety Stock', key: 'minStock', type: 'number' },
                    ].map(f => (
                      <div key={f.key} className="flex flex-col border-b border-border pb-1">
                        <label className="text-xs font-bold text-muted-foreground mb-1">{f.label}</label>
                        <input type={f.type} value={productForm[f.key] || ''} onChange={e => setProductForm({ ...productForm, [f.key]: e.target.value })}
                          className="bg-transparent focus:outline-none text-foreground font-bold text-lg" />
                      </div>
                    ))}
                    {viewingPart && Number(productForm.stock) !== Number(viewingPart.stock) && (
                      <div className="flex flex-col border-b border-border pb-1">
                        <label className="text-xs font-bold text-accent mb-1">Reason for Stock Adjustment *</label>
                        <input type="text" value={productForm.adjustmentReason || ''} onChange={e => setProductForm({ ...productForm, adjustmentReason: e.target.value })}
                          className="bg-transparent focus:outline-none text-foreground font-bold" placeholder="e.g. damaged goods, return" required />
                      </div>
                    )}
                    {viewingPart && (
                      <div className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg">
                        <div>
                          <div className="text-sm font-bold text-foreground">Published</div>
                          <div className="text-xs text-muted-foreground">Visible on customer storefront</div>
                        </div>
                        <button onClick={() => doTogglePublished(viewingPart.id, viewingPart.published)}
                          className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${viewingPart.published ? 'bg-accent' : 'bg-secondary border border-border'}`}>
                          <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-1 ${viewingPart.published ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

              {/* Sales */}
              {productActiveTab === 'sales' && (
                <div className="overflow-x-auto border border-border rounded-lg bg-secondary">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background border-b border-border text-muted-foreground">
                      <tr className="uppercase text-xs tracking-wider">
                        <th className="p-3">Date</th><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productSales.map((s, i) => (
                        <tr key={i} className="hover:bg-background/50">
                          <td className="p-3 text-muted-foreground">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-foreground">{s.invoice}</td>
                          <td className="p-3">{s.customer}</td>
                          <td className="p-3 text-right font-bold">{s.qty}</td>
                          <td className="p-3 text-right text-emerald-500 font-bold">{formatCurrency(s.revenue)}</td>
                        </tr>
                      ))}
                      {productSales.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No sales recorded yet.</td></tr>}
                    </tbody>
                    {productSales.length > 0 && (
                      <tfoot className="border-t border-border bg-background">
                        <tr>
                          <td colSpan="3" className="p-3 font-bold text-foreground">Total</td>
                          <td className="p-3 text-right font-black text-foreground">{totalUnitsSold}</td>
                          <td className="p-3 text-right font-black text-emerald-500">{formatCurrency(totalRevenue)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Purchase History */}
              {productActiveTab === 'purchases' && (
                <div className="overflow-x-auto border border-border rounded-lg bg-secondary">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background border-b border-border text-muted-foreground">
                      <tr className="uppercase text-xs tracking-wider">
                        <th className="p-3">Date</th><th className="p-3">PO Number</th><th className="p-3">Vendor</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productPurchases.map((p, i) => (
                        <tr key={i} className="hover:bg-background/50">
                          <td className="p-3 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-foreground font-mono">{p.poNumber}</td>
                          <td className="p-3">{p.supplier}</td>
                          <td className="p-3 text-right font-bold">{p.qty}</td>
                          <td className="p-3 text-right"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                      {productPurchases.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No purchase history for this product yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

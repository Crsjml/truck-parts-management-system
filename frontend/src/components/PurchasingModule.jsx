import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Buildings, User, Plus, Minus, Trash, X, CheckCircle, MagnifyingGlass,
  CaretLeft, CaretRight, Package, CurrencyDollar, ShoppingCart, PencilSimple,
  Star, Funnel, ArrowsDownUp, ChartBar, Receipt, EnvelopeSimple,
  Globe, Archive, Eye, EyeSlash, ArrowCounterClockwise, FilePdf, Clock,
  TrendUp, ClockCounterClockwise, Truck, ListDashes, SquaresFour,
  WarningCircle, CheckSquare, Timer, CalendarBlank
} from '@phosphor-icons/react';
import {
  fetchSuppliers, createSupplier, updateSupplier, archiveSupplier, restoreSupplier,
  fetchPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus, updatePurchaseOrderDetails,
  updatePoBillingStatus, togglePartPublished, updatePoItemPrices, updatePoPayment
} from '../authStore';
import { supabase } from '../supabaseClient';
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
import AsyncSelect from 'react-select/async';
import PhoneInput from 'react-phone-number-input';
import { getCountries } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import {
  customSelectStyles,
  StatusBadge,
  StatChip,
  PipelineChevron,
  DragDropImageUploader,
  ControlPanel,
  GroupedTable
} from './ui/PurchasingAtoms';

// ─── Constants ────────────────────────────────────────────────────────────────
const NOT_ACKNOWLEDGED_DAYS = 7;
const PAYMENT_DUE_SOON_DAYS = 7;
const CHART_COLORS = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
const ORDERS_PAGE_SIZE = 15;

const toMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

const lineSubtotal = (quantity, unitPrice) => {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return 0;
  return toMoney(qty * price);
};

const getPaymentStatus = (po, today = new Date()) => {
  if (po.paidAt) return 'Paid';
  if (!po.paymentDueDate) return po.paymentStatus || 'Pending';

  const due = new Date(po.paymentDueDate);
  if (Number.isNaN(due.getTime())) return po.paymentStatus || 'Pending';

  const current = new Date(today);
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((due - current) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return 'Overdue';
  if (daysUntilDue <= PAYMENT_DUE_SOON_DAYS) return 'Due Soon';
  return 'Pending';
};

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


// ─── Main Module ──────────────────────────────────────────────────────────────
export default function PurchasingModule({ onAddLog, parts, onPartsUpdated, transactions, onAddPart, onEditPart, onDeletePart, categories, showToast }) {
  const { formatCurrency } = useSettings();
  const [activeSection, setActiveSection] = useState('orders'); // 'orders' | 'products' | 'reports'
  const [activeOrderTab, setActiveOrderTab] = useState('rfq'); // 'rfq' | 'pos' | 'suppliers'

  // Data
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper for country data
  const countryOptions = useMemo(() => getCountries().map(c => ({ value: en[c], label: en[c], code: c })), []);
  const getCountryCode = (countryName) => {
    if (!countryName) return null;
    return getCountries().find(c => en[c].toLowerCase() === countryName.toLowerCase().trim());
  };

  const loadAddressOptions = async (inputValue) => {
    if (!inputValue || inputValue.length < 3) return [];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputValue)}&format=json&addressdetails=1&limit=5`);
      const data = await res.json();
      return data.map(item => ({
        label: item.display_name,
        value: item.display_name
      }));
    } catch (err) {
      console.error('Error fetching address:', err);
      return [];
    }
  };

  // Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [viewingPo, setViewingPo] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [viewingPart, setViewingPart] = useState(null);
  const [productActiveTab, setProductActiveTab] = useState('general');

  // Delivery checklist: set of item IDs confirmed as received
  const [deliveredItems, setDeliveredItems] = useState(new Set());
  // Quoted prices: map of item ID -> string input value
  const [quotedPrices, setQuotedPrices] = useState({});
  const [savingPrices, setSavingPrices] = useState(false);

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

  const [payableSearch, setPayableSearch] = useState('');
  const [payableFilters, setPayableFilters] = useState([]);
  const [payableGroup, setPayableGroup] = useState(null);
  const [payableFavsOnly, setPayableFavsOnly] = useState(false);
  const [payableFavs, setPayableFavs] = useState(getFavorites('payables'));

  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFilters, setSupplierFilters] = useState([]);
  const [supplierGroup, setSupplierGroup] = useState(null);
  const [supplierFavsOnly, setSupplierFavsOnly] = useState(false);
  const [supplierFavs, setSupplierFavs] = useState(getFavorites('supplier'));

  const [prodSearch, setProdSearch] = useState('');
  const [prodFilters, setProdFilters] = useState([]);
  const [prodGroup, setProdGroup] = useState(null);
  const [prodFavsOnly, setProdFavsOnly] = useState(false);
  const [prodFavs, setProdFavs] = useState(getFavorites('prod'));
  const [prodView, setProdView] = useState('grid'); // 'grid' | 'list'

  // ── Pagination state per orders sub-tab ──────────────────────────────────────
  const [rfqPage, setRfqPage] = useState(1);
  const [posPage, setPosPage] = useState(1);
  const [payablePage, setPayablePage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);

  // Forms
  const [supplierForm, setSupplierForm] = useState({ name: '', type: 'Company', contactPerson: '', email: '', phone: '', address: '', country: '', paymentTerms: 'Net 30', notes: '' });
  const [poForm, setPoForm] = useState({ supplier: '', expectedDeliveryDate: '', paymentDueDate: '', notes: '', items: [], sourceRfq: '' });
  const [poPartSel, setPoPartSel] = useState('');
  const [poQty, setPoQty] = useState('');
  const [productForm, setProductForm] = useState({ name: '', sku: '', oem: '', category: '', price: '', stock: '', minStock: '', image: '' });

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  // ── Pagination resets ────────────────────────────────────────────────────────
  // Reset all pages when switching the active order tab
  useEffect(() => { setRfqPage(1); setPosPage(1); setPayablePage(1); setSupplierPage(1); }, [activeOrderTab]);
  // Reset per-tab page on any filter/search/groupBy/favorites change
  useEffect(() => { setRfqPage(1); }, [rfqSearch, rfqFilters, rfqGroup, rfqFavsOnly, rfqStatFilter]);
  useEffect(() => { setPosPage(1); }, [posSearch, posFilters, posGroup, posFavsOnly]);
  useEffect(() => { setPayablePage(1); }, [payableSearch, payableFilters, payableGroup, payableFavsOnly]);
  useEffect(() => { setSupplierPage(1); }, [supplierSearch, supplierFilters, supplierGroup, supplierFavsOnly]);

  useEffect(() => {
    const handlePurchasingIntent = (e) => {
      const payload = e.detail;
      if (payload) {
        const parts = Array.isArray(payload) ? payload : [payload];
        if (parts.length === 0) return;

        setActiveSection('orders');
        setActiveOrderTab('rfq'); // or 'pos', but 'rfq' is the Draft phase
        setPoForm({
          supplier: '',
          expectedDeliveryDate: '',
          paymentDueDate: '',
          notes: parts.length > 1 ? `Restock request for ${parts.length} items` : `Restock request for ${parts[0].name}`,
          items: parts.map(part => ({
            partId: part.id,
            name: part.name,
            quantity: Math.max(1, (part.deficit && part.deficit > 0) ? part.deficit : 1),
            unitPrice: part.price,
            subtotal: lineSubtotal(Math.max(1, (part.deficit && part.deficit > 0) ? part.deficit : 1), part.price)
          })),
          sourceRfq: ''
        });
        setIsPoModalOpen(true);
      }
    };
    window.addEventListener('purchasingIntent', handlePurchasingIntent);
    return () => window.removeEventListener('purchasingIntent', handlePurchasingIntent);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sups, pos] = await Promise.all([fetchSuppliers(), fetchPurchaseOrders()]);
    setSuppliers(sups);
    setPurchaseOrders(pos);
    setLoading(false);
  };



  // ── RFQ derived data ─────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
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
    if (favsOnly) out = out.filter(r => favs.includes(r.id || r.id));
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

  const payableRows = useMemo(() => purchaseOrders
    .filter(po => po.status !== 'Cancelled' && (po.paymentDueDate || po.paidAt))
    .map(po => {
      const paymentStatus = po.paymentStatus || getPaymentStatus(po, today);
      return {
        ...po,
        rfqNumber: po.sourceRfq || po.poNumber,
        purchaseOrderNumber: ['Confirmed', 'Received'].includes(po.status) ? po.poNumber : '',
        supplierName: po.supplier?.name || '—',
        amountDue: Number(po.amountDue ?? po.totalAmount ?? 0),
        paymentStatus
      };
    })
    .sort((a, b) => {
      if (a.paymentStatus === 'Paid' && b.paymentStatus !== 'Paid') return 1;
      if (a.paymentStatus !== 'Paid' && b.paymentStatus === 'Paid') return -1;
      const aDue = a.paymentDueDate ? new Date(a.paymentDueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.paymentDueDate ? new Date(b.paymentDueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    }), [purchaseOrders]);

  const filteredPayables = useMemo(() => {
    let rows = payableRows;
    const statusFilters = ['Pending', 'Due Soon', 'Overdue', 'Paid'];
    const activeStatuses = payableFilters.filter(f => statusFilters.includes(f));
    if (activeStatuses.length > 0) rows = rows.filter(r => activeStatuses.includes(r.paymentStatus));
    if (payableSearch) {
      const re = new RegExp(payableSearch, 'i');
      rows = rows.filter(r => (
        re.test(r.supplierName || '')
        || re.test(r.rfqNumber || '')
        || re.test(r.purchaseOrderNumber || '')
      ));
    }
    if (payableFavsOnly) rows = rows.filter(r => payableFavs.includes(r.id));
    return rows;
  }, [payableRows, payableSearch, payableFilters, payableFavsOnly, payableFavs]);

  const filteredSuppliers = useMemo(() => {
    let rows = suppliers;
    if (supplierFilters.includes('person')) rows = rows.filter(s => s.type === 'Person');
    if (supplierFilters.includes('company')) rows = rows.filter(s => s.type === 'Company');
    if (supplierFilters.includes('archived')) rows = rows.filter(s => s.archived);
    else rows = rows.filter(s => !s.archived);
    return applyFilter(rows, supplierSearch, supplierFilters, supplierFavsOnly, supplierFavs, ['name', 'email', 'country']);
  }, [suppliers, supplierSearch, supplierFilters, supplierFavsOnly, supplierFavs]);

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

    // Spend by Supplier (Revamped with counts)
    const spendBySupplierRaw = purchaseOrders.filter(p => p.status === 'Received').reduce((acc, po) => {
      const name = po.supplier?.name || 'Unknown';
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += (po.totalAmount || 0);
      acc[name].count += 1;
      return acc;
    }, {});

    const spendBySupplier = Object.entries(spendBySupplierRaw)
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

    return { totalSpend, capitalInTransit, avgLeadTime, pendingRfqs, pipelineData, spendBySupplier, topParts, onTimeRate, poTimeline, pvs };
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
      const res = await updateSupplier(editingSupplier.id, supplierForm);
      if (res.ok) { setSuppliers(prev => prev.map(s => s.id === res.supplier.id ? res.supplier : s)); setIsSupplierModalOpen(false); onAddLog('system', `Updated supplier: ${res.supplier.name}`); }
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
    if (res.ok) { setSuppliers(prev => prev.map(s => s.id === id ? { ...s, archived: true } : s)); setIsSupplierModalOpen(false); onAddLog('system', `Archived supplier: ${name}`); }
    else alert(res.error);
  };

  // ── PO CRUD ───────────────────────────────────────────────────────────────────
  const getPoFormFromOrder = (po) => ({
    supplier: po.supplier?.id || '',
    expectedDeliveryDate: po.expectedDeliveryDate?.substring(0, 10) || '',
    paymentDueDate: po.paymentDueDate?.substring(0, 10) || '',
    notes: po.notes || '',
    items: po.items || [],
    sourceRfq: po.sourceRfq || ''
  });

  const openPoModal = (po = null, prefillSupplierId = '') => {
    setViewingPo(po);
    setPoForm(po ? getPoFormFromOrder(po)
      : { supplier: prefillSupplierId, expectedDeliveryDate: '', paymentDueDate: '', notes: '', items: [], sourceRfq: '' });
    // Reset checklist + quoted prices when opening a new PO
    setDeliveredItems(new Set());
    setQuotedPrices(po ? Object.fromEntries((po.items || []).map(i => [i.id, String(i.unitPrice)])) : {});
    setIsPoModalOpen(true);
  };

  const addPoItem = () => {
    if (!poPartSel || !poQty || Number(poQty) <= 0) return;
    const part = parts.find(p => p.id === poPartSel);
    if (!part) return;
    const quantity = parseInt(poQty, 10);
    setPoForm(prev => ({ ...prev, items: [...prev.items, { partId: part.id, name: part.name, sku: part.sku, quantity, unitPrice: part.price, subtotal: lineSubtotal(quantity, part.price) }] }));
    setPoPartSel(''); setPoQty('');
  };

  const removePoItem = (idx) => setPoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const savePo = async () => {
    if (!poForm.supplier) return alert('Select a supplier.');
    if (poForm.items.length === 0) return alert('Add at least one item.');
    if (!poForm.expectedDeliveryDate) return alert('Expected delivery date is required.');
    if (poForm.paymentDueDate && Number.isNaN(new Date(poForm.paymentDueDate).getTime())) return alert('Payment deadline is invalid.');

    // Inject the current user's display name as the Buyer/Handler
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...poForm,
      createdBy: user?.user_metadata?.full_name || user?.email || 'Unknown User'
    };

    const res = await createPurchaseOrder(payload);
    if (res.ok) { 
      setPurchaseOrders(prev => [res.purchaseOrder, ...prev]); 
      setViewingPo(res.purchaseOrder); 
      const supplierName = res.purchaseOrder.supplier?.name || suppliers.find(s => s.id === poForm.supplier)?.name;
      const itemCount = res.purchaseOrder.items?.length || poForm.items?.length || 0;
      onAddLog('purchasing', `PO ${res.purchaseOrder.poNumber} created${supplierName ? ' — ' + supplierName : ''}${itemCount ? `, ${itemCount} items` : ''}`); 
    }
    else alert(res.error);
  };

  const updatePoStatus = async (id, status, poNumber) => {
    if (status === 'Received' && !confirm(`Confirming receipt for ${poNumber} will increment stock. Proceed?`)) return;
    if (status === 'Cancelled' && !confirm(`Cancel ${poNumber}?`)) return;

    if (status === 'Confirmed' && viewingPo && ['Draft', 'RFQ Sent'].includes(viewingPo.status)) {
      if (!poForm.expectedDeliveryDate) return alert('Expected delivery date is required.');
      const detailsRes = await updatePurchaseOrderDetails(id, {
        expectedDeliveryDate: poForm.expectedDeliveryDate,
        paymentDueDate: poForm.paymentDueDate,
        notes: poForm.notes,
        sourceRfq: poForm.sourceRfq
      });
      if (!detailsRes.ok) {
        if (showToast) showToast(`Failed to save details: ${detailsRes.error}`, 'error');
        else alert(`Failed to save details: ${detailsRes.error}`);
        return;
      }
    }

    const res = await updatePurchaseOrderStatus(id, status);
    if (res.ok) {
      const updated = res.purchaseOrder;
      setPurchaseOrders(prev => prev.map(p => p.id === id ? updated : p));
      setViewingPo(updated);
      setPoForm(getPoFormFromOrder(updated));
      onAddLog('purchasing', `PO ${poNumber} → ${status}`);
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
      setPurchaseOrders(prev => prev.map(p => p.id === id ? res.purchaseOrder : p));
      setViewingPo(res.purchaseOrder);
      setPoForm(getPoFormFromOrder(res.purchaseOrder));
    } else alert(res.error);
  };

  const saveRfqDetails = async () => {
    if (!viewingPo) return;
    if (!poForm.expectedDeliveryDate) return alert('Expected delivery date is required.');
    const res = await updatePurchaseOrderDetails(viewingPo.id, {
      expectedDeliveryDate: poForm.expectedDeliveryDate,
      paymentDueDate: poForm.paymentDueDate,
      notes: poForm.notes,
      sourceRfq: poForm.sourceRfq
    });
    if (res.ok) {
      setPurchaseOrders(prev => prev.map(p => p.id === viewingPo.id ? res.purchaseOrder : p));
      setViewingPo(res.purchaseOrder);
      setPoForm(getPoFormFromOrder(res.purchaseOrder));
      if (showToast) showToast('RFQ details saved.', 'success');
    } else if (showToast) {
      showToast(res.error, 'error');
    } else {
      alert(res.error);
    }
  };

  const updateSupplierPayment = async (po, markPaid = true) => {
    const payload = markPaid
      ? {
          paidAt: new Date().toISOString().slice(0, 10),
          paymentReference: po.paymentReference || '',
          paymentNotes: po.paymentNotes || ''
        }
      : {
          paidAt: null,
          paymentReference: '',
          paymentNotes: ''
        };

    const res = await updatePoPayment(po.id, payload);
    if (res.ok) {
      setPurchaseOrders(prev => prev.map(p => p.id === po.id ? res.purchaseOrder : p));
      if (viewingPo?.id === po.id) {
        setViewingPo(res.purchaseOrder);
        setPoForm(getPoFormFromOrder(res.purchaseOrder));
      }
      if (showToast) showToast(markPaid ? 'Supplier payment marked paid.' : 'Supplier payment reopened.', 'success');
    } else if (showToast) {
      showToast(res.error, 'error');
    } else {
      alert(res.error);
    }
  };

  // ── PDF ───────────────────────────────────────────────────────────────────────
  const generatePDF = (po) => {
    const doc = new jsPDF();
    const sup = po.supplier;
    doc.setFontSize(22); doc.text('Purchase Order', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`Reference: ${po.poNumber}`, 14, 35); doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, 14, 40);
    doc.text(`Supplier: ${sup?.name || 'N/A'}`, 14, 55);
    const tableData = po.items.map(i => [`[${i.sku || 'N/A'}] ${i.name}`, i.quantity.toString(), `PHP ${i.unitPrice.toFixed(2)}`, `PHP ${i.subtotal.toFixed(2)}`]);
    autoTable(doc, { startY: 70, head: [['Description', 'Qty', 'Unit Price', 'Amount']], body: tableData, theme: 'grid', headStyles: { fillColor: [44, 62, 80] } });
    const fy = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`Total: PHP ${po.totalAmount.toFixed(2)}`, 14, fy);
    doc.save(`${po.poNumber}.pdf`);
  };

  // RFQ PDF — no prices, just items to quote
  const generateRfqPDF = (po) => {
    const doc = new jsPDF();
    const sup = po.supplier;
    doc.setFontSize(22); doc.text('Request for Quotation', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`RFQ No: ${po.poNumber}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);
    doc.text(`To: ${sup?.name || 'N/A'}`, 14, 48);
    if (sup?.email) doc.text(`Email: ${sup.email}`, 14, 54);
    doc.text('Please provide your best quotation for the following items:', 14, 65);
    const tableData = po.items.map(i => [
      `[${i.sku || 'N/A'}] ${i.name}`,
      i.quantity.toString(),
      '', // Unit Price — to be filled by supplier
      ''  // Total — to be filled by supplier
    ]);
    autoTable(doc, {
      startY: 72,
      head: [['Description / SKU', 'Qty Required', 'Your Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
      columnStyles: { 2: { minCellWidth: 35 }, 3: { minCellWidth: 35 } }
    });
    const fy = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text('Please reply to this RFQ at your earliest convenience. Prices should be in PHP.', 14, fy);
    doc.save(`RFQ_${po.poNumber}.pdf`);
  };

  // Save quoted prices entered by admin
  const saveQuotedPrices = async () => {
    if (!viewingPo) return;
    setSavingPrices(true);
    try {
      const items = (viewingPo.items || []).map(i => {
        const raw = quotedPrices[i.id] ?? i.unitPrice;
        const unitPrice = Number(raw);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error('Quoted prices must be valid non-negative numbers.');
        }
        return { id: i.id, unitPrice };
      });
      const res = await updatePoItemPrices(viewingPo.id, items);
      if (res.ok) {
        setPurchaseOrders(prev => prev.map(p => p.id === res.purchaseOrder.id ? res.purchaseOrder : p));
        setViewingPo(res.purchaseOrder);
        setPoForm(getPoFormFromOrder(res.purchaseOrder));
        if (showToast) showToast('Quoted prices saved.', 'success');
      } else if (showToast) {
        showToast(res.error, 'error');
      }
    } catch (err) {
      if (showToast) showToast(err.message, 'error');
      else alert(err.message);
    } finally {
      setSavingPrices(false);
    }
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
    { key: 'payables', label: 'Payables' },
    { key: 'suppliers', label: 'Suppliers' },
  ];
  const getNewButtonLabel = () => {
    if (activeSection === 'products') return 'New Product';
    if (activeSection === 'orders' && activeOrderTab === 'suppliers') return 'New Supplier';
    return 'New PO';
  };
  const getPoModalSubtitle = () => {
    if (!viewingPo) return 'Prepare supplier, arrival, products, notes, and total before saving this purchase draft.';
    if (viewingPo.status === 'Draft') return 'Draft purchase order ready for supplier request or direct confirmation.';
    if (viewingPo.status === 'RFQ Sent') return 'Supplier quotation request is out; review prices before confirming.';
    if (viewingPo.status === 'Confirmed') return 'Confirmed order awaiting bills and receipt checks.';
    if (viewingPo.status === 'Received') return 'Received purchase order retained as an inventory document.';
    if (viewingPo.status === 'Cancelled') return 'Cancelled purchase order retained for purchasing history.';
    return 'Review this purchase order document.';
  };

  // ── RFQ columns ───────────────────────────────────────────────────────────────
  const rfqColumns = [
    { key: 'poNumber', label: 'Reference', className: 'font-bold text-foreground group-hover:text-accent transition-colors', render: (v) => v },
    { key: 'supplierName', label: 'Supplier', render: (_, r) => r.supplier?.name || '—' },
    { key: 'createdBy', label: 'Buyer' },
    { key: 'expectedDeliveryDate', label: 'Order Deadline', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: v => <span className="font-bold">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', align: 'right', render: v => <StatusBadge status={v} /> },
  ];
  const posColumns = [
    { key: 'poNumber', label: 'Reference', className: 'font-bold text-foreground group-hover:text-accent transition-colors' },
    { key: 'confirmationDate', label: 'Confirmation Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'supplierName', label: 'Supplier', render: (_, r) => r.supplier?.name || '—' },
    { key: 'createdBy', label: 'Buyer' },
    { key: 'sourceRfq', label: 'Source', render: v => v ? <span className="font-mono text-xs text-muted-foreground">{v}</span> : '—' },
    { key: 'totalAmount', label: 'Total', align: 'right', render: v => <span className="font-bold">{formatCurrency(v)}</span> },
    { key: 'billingStatus', label: 'Billing', align: 'right', render: v => <StatusBadge status={v || 'Waiting Bills'} /> },
    { key: 'expectedDeliveryDate', label: 'Expected Arrival', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', align: 'right', render: v => <StatusBadge status={v} /> },
  ];
  const payableColumns = [
    { key: 'rfqNumber', label: 'RFQ No.', className: 'font-bold text-foreground group-hover:text-accent transition-colors', render: v => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'purchaseOrderNumber', label: 'PO No.', render: v => v ? <span className="font-mono text-xs">{v}</span> : '—' },
    { key: 'supplierName', label: 'Supplier' },
    { key: 'amountDue', label: 'Amount Due', align: 'right', render: v => <span className="font-bold">{formatCurrency(v)}</span> },
    { key: 'paymentDueDate', label: 'Payment Deadline', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'paymentStatus', label: 'Payment', align: 'right', render: v => <StatusBadge status={v} /> },
    { key: 'paidAt', label: 'Date Paid', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'paymentReference', label: 'Reference', render: v => v ? <span className="font-mono text-xs">{v}</span> : '—' },
    { key: 'paymentNotes', label: 'Notes', render: v => v || '—' },
    {
      key: 'paidToggle',
      label: 'Paid',
      align: 'right',
      sortable: false,
      render: (_, r) => {
        const isPaid = r.paymentStatus === 'Paid';
        const reference = r.purchaseOrderNumber || r.rfqNumber || 'payable';
        return (
          <button
            type="button"
            role="switch"
            aria-checked={isPaid}
            aria-label={isPaid ? `Mark ${reference} as unpaid` : `Mark ${reference} as paid`}
            onClick={(e) => { e.stopPropagation(); updateSupplierPayment(r, !isPaid); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isPaid
                ? 'border-emerald-500/40 bg-emerald-500/20'
                : 'border-border bg-secondary'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-background border transition-transform ${
                isPaid
                  ? 'translate-x-5 border-emerald-500'
                  : 'translate-x-1 border-muted-foreground/30'
              }`}
            />
          </button>
        );
      }
    },
  ];
  const supplierColumns = [
    {
      key: 'name', label: 'Name', className: 'font-bold text-foreground group-hover:text-accent transition-colors', render: (v, r) => (
        <span className="flex items-center gap-2">
          {r.type === 'Person' ? <User weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" /> : <Buildings weight="duotone" className="w-4 h-4 text-muted-foreground shrink-0" />}
          {v}
        </span>
      )
    },
    { key: 'email', label: 'Email', render: v => v ? <a href={`mailto:${v}`} onClick={e => e.stopPropagation()} className="text-accent hover:underline">{v}</a> : '—' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'country', label: 'Country', render: v => {
        if (!v) return '—';
        const code = getCountryCode(v);
        return (
          <div className="flex items-center justify-center">
            {code ? <ReactCountryFlag title={en[code]} countryCode={code} svg style={{ width: '1.8em', height: '1.8em' }} className="rounded-sm shadow-sm hover:scale-110 transition-transform cursor-help" /> : <span className="text-xs">{v}</span>}
          </div>
        );
      }
    },
    { key: 'paymentTerms', label: 'Payment Terms' },
    {
      key: 'actions', label: 'Actions', align: 'right', render: (_, r) => (
        <div className="flex justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); openSupplierModal(r); }} className="p-1.5 text-muted-foreground hover:text-accent bg-secondary hover:bg-background rounded-md transition-colors border border-transparent hover:border-border shadow-sm">
            <PencilSimple weight="bold" className="w-4 h-4" />
          </button>
          {!r.archived && (
            <button onClick={(e) => { e.stopPropagation(); doArchiveSupplier(r.id, r.name); }} className="p-1.5 text-muted-foreground hover:text-red-500 bg-secondary hover:bg-background rounded-md transition-colors border border-transparent hover:border-border shadow-sm">
              <Trash weight="bold" className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    },
  ];

  const getQuotedUnitPrice = (item) => {
    const raw = quotedPrices[item.id] ?? item.unitPrice;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : Number(item.unitPrice) || 0;
  };

  const canEditRfqDetails = !!viewingPo && ['Draft', 'RFQ Sent'].includes(viewingPo.status);

  const visiblePoTotal = poForm.items.reduce((sum, item) => {
    if (viewingPo?.status === 'Confirmed') {
      return sum + lineSubtotal(item.quantity, getQuotedUnitPrice(item));
    }
    return sum + toMoney(item.subtotal ?? lineSubtotal(item.quantity, item.unitPrice));
  }, 0);

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
            <button key={t.key} onClick={() => setActiveSection(t.key)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeSection === t.key ? 'bg-background text-accent border border-border' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}>
              <t.icon weight={activeSection === t.key ? 'duotone' : 'regular'} className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (activeSection === 'products') openProductModal();
            else if (activeSection === 'orders' && activeOrderTab === 'suppliers') openSupplierModal();
            else if (activeSection === 'orders') openPoModal();
          }}
          className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus weight="bold" /> {getNewButtonLabel()}
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
                {t.key === 'rfq' && rfqs.length > 0 && <span className="ml-2 px-1.5 py-0.5 text-2xs bg-accent/20 text-accent rounded-full font-bold">{rfqs.length}</span>}
                {t.key === 'payables' && payableRows.length > 0 && <span className="ml-2 px-1.5 py-0.5 text-2xs bg-accent/20 text-accent rounded-full font-bold">{payableRows.length}</span>}
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
                </div>
                <ControlPanel
                  search={rfqSearch} onSearch={setRfqSearch}
                  filters={[{ value: 'myOrders', label: 'My Orders' }, { value: 'new', label: 'New' }, { value: 'sent', label: 'RFQ Sent' }]}
                  activeFilters={rfqFilters} onFilter={v => setRfqFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Supplier', 'Buyer', 'Status']} activeGroup={rfqGroup} onGroupBy={setRfqGroup}
                  favoritesCount={rfqFavs.length} onFavoritesFilter={() => setRfqFavsOnly(p => !p)} showFavoritesOnly={rfqFavsOnly}
                />
                {(() => {
                  const rfqTotalPages = rfqGroup ? 1 : Math.ceil(filteredRfqs.length / ORDERS_PAGE_SIZE);
                  const rfqRows = rfqGroup ? filteredRfqs : filteredRfqs.slice((rfqPage - 1) * ORDERS_PAGE_SIZE, rfqPage * ORDERS_PAGE_SIZE);
                  return (
                    <>
                      <GroupedTable
                        columns={rfqColumns} rows={rfqRows} groupBy={rfqGroup}
                        onRowClick={openPoModal}
                        favKey="rfq" favorites={rfqFavs}
                        onToggleFav={id => setRfqFavs(toggleFavorite('rfq', id))}
                      />
                      {rfqTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium pl-1">
                            Showing {(rfqPage - 1) * ORDERS_PAGE_SIZE + 1} to {Math.min(rfqPage * ORDERS_PAGE_SIZE, filteredRfqs.length)} of {filteredRfqs.length} items
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setRfqPage(p => Math.max(1, p - 1))}
                              disabled={rfqPage === 1}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Previous page"
                            >
                              <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-foreground px-2">{rfqPage} / {rfqTotalPages}</span>
                            <button
                              onClick={() => setRfqPage(p => Math.min(rfqTotalPages, p + 1))}
                              disabled={rfqPage === rfqTotalPages}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Next page"
                            >
                              <CaretRight weight="bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* PO Tab */}
            {activeOrderTab === 'pos' && (
              <>
                <ControlPanel
                  search={posSearch} onSearch={setPosSearch}
                  filters={[{ value: 'waitingBills', label: 'Waiting Bills' }, { value: 'billsReceived', label: 'Bills Received' }]}
                  activeFilters={posFilters} onFilter={v => setPosFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Supplier', 'Buyer', 'Status']} activeGroup={posGroup} onGroupBy={setPosGroup}
                  favoritesCount={posFavs.length} onFavoritesFilter={() => setPosFavsOnly(p => !p)} showFavoritesOnly={posFavsOnly}
                />
                {(() => {
                  const posTotalPages = posGroup ? 1 : Math.ceil(filteredPos.length / ORDERS_PAGE_SIZE);
                  const posRows = posGroup ? filteredPos : filteredPos.slice((posPage - 1) * ORDERS_PAGE_SIZE, posPage * ORDERS_PAGE_SIZE);
                  return (
                    <>
                      <GroupedTable
                        columns={posColumns} rows={posRows} groupBy={posGroup}
                        onRowClick={openPoModal}
                        favKey="pos" favorites={posFavs}
                        onToggleFav={id => setPosFavs(toggleFavorite('pos', id))}
                      />
                      {posTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium pl-1">
                            Showing {(posPage - 1) * ORDERS_PAGE_SIZE + 1} to {Math.min(posPage * ORDERS_PAGE_SIZE, filteredPos.length)} of {filteredPos.length} items
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPosPage(p => Math.max(1, p - 1))}
                              disabled={posPage === 1}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Previous page"
                            >
                              <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-foreground px-2">{posPage} / {posTotalPages}</span>
                            <button
                              onClick={() => setPosPage(p => Math.min(posTotalPages, p + 1))}
                              disabled={posPage === posTotalPages}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Next page"
                            >
                              <CaretRight weight="bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Payables Tab */}
            {activeOrderTab === 'payables' && (
              <>
                <ControlPanel
                  search={payableSearch} onSearch={setPayableSearch}
                  filters={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Due Soon', label: 'Due Soon' },
                    { value: 'Overdue', label: 'Overdue' },
                    { value: 'Paid', label: 'Paid' }
                  ]}
                  activeFilters={payableFilters} onFilter={v => setPayableFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['supplierName', 'paymentStatus']} activeGroup={payableGroup} onGroupBy={setPayableGroup}
                  favoritesCount={payableFavs.length} onFavoritesFilter={() => setPayableFavsOnly(p => !p)} showFavoritesOnly={payableFavsOnly}
                />
                {(() => {
                  const payableTotalPages = payableGroup ? 1 : Math.ceil(filteredPayables.length / ORDERS_PAGE_SIZE);
                  const payablePageRows = payableGroup ? filteredPayables : filteredPayables.slice((payablePage - 1) * ORDERS_PAGE_SIZE, payablePage * ORDERS_PAGE_SIZE);
                  return (
                    <>
                      <GroupedTable
                        columns={payableColumns} rows={payablePageRows} groupBy={payableGroup}
                        onRowClick={openPoModal}
                        favKey="payables" favorites={payableFavs}
                        onToggleFav={id => setPayableFavs(toggleFavorite('payables', id))}
                      />
                      {payableTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium pl-1">
                            Showing {(payablePage - 1) * ORDERS_PAGE_SIZE + 1} to {Math.min(payablePage * ORDERS_PAGE_SIZE, filteredPayables.length)} of {filteredPayables.length} items
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPayablePage(p => Math.max(1, p - 1))}
                              disabled={payablePage === 1}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Previous page"
                            >
                              <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-foreground px-2">{payablePage} / {payableTotalPages}</span>
                            <button
                              onClick={() => setPayablePage(p => Math.min(payableTotalPages, p + 1))}
                              disabled={payablePage === payableTotalPages}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Next page"
                            >
                              <CaretRight weight="bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Suppliers Tab */}
            {activeOrderTab === 'suppliers' && (
              <>
                <ControlPanel
                  search={supplierSearch} onSearch={setSupplierSearch}
                  filters={[{ value: 'person', label: 'Person' }, { value: 'company', label: 'Company' }, { value: 'archived', label: 'Show Archived' }]}
                  activeFilters={supplierFilters} onFilter={v => setSupplierFilters(p => p.includes(v) ? p.filter(f => f !== v) : [...p, v])}
                  groupByOptions={['Country', 'Type']} activeGroup={supplierGroup} onGroupBy={setSupplierGroup}
                  favoritesCount={supplierFavs.length} onFavoritesFilter={() => setSupplierFavsOnly(p => !p)} showFavoritesOnly={supplierFavsOnly}
                />
                {(() => {
                  const supplierTotalPages = supplierGroup ? 1 : Math.ceil(filteredSuppliers.length / ORDERS_PAGE_SIZE);
                  const supplierPageRows = supplierGroup ? filteredSuppliers : filteredSuppliers.slice((supplierPage - 1) * ORDERS_PAGE_SIZE, supplierPage * ORDERS_PAGE_SIZE);
                  return (
                    <>
                      <GroupedTable
                        columns={supplierColumns} rows={supplierPageRows} groupBy={supplierGroup}
                        onRowClick={openSupplierModal}
                        favKey="supplier" favorites={supplierFavs}
                        onToggleFav={id => setSupplierFavs(toggleFavorite('supplier', id))}
                      />
                      {supplierTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium pl-1">
                            Showing {(supplierPage - 1) * ORDERS_PAGE_SIZE + 1} to {Math.min(supplierPage * ORDERS_PAGE_SIZE, filteredSuppliers.length)} of {filteredSuppliers.length} items
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSupplierPage(p => Math.max(1, p - 1))}
                              disabled={supplierPage === 1}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Previous page"
                            >
                              <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-semibold text-foreground px-2">{supplierPage} / {supplierTotalPages}</span>
                            <button
                              onClick={() => setSupplierPage(p => Math.min(supplierTotalPages, p + 1))}
                              disabled={supplierPage === supplierTotalPages}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Next page"
                            >
                              <CaretRight weight="bold" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
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
                    <span className="text-2xs uppercase font-bold text-muted-foreground font-mono tracking-wider">{part.sku}</span>
                    <h4 className="font-bold text-foreground leading-snug line-clamp-2 mt-1 mb-auto group-hover:text-accent transition-colors text-sm">{part.name}</h4>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-sm font-extrabold text-foreground">{formatCurrency(part.price)}</span>
                      <span className={`text-11px font-bold ${isLow ? 'text-accent' : 'text-emerald-500'}`}>{part.stock} pcs</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {part.published ? <Eye weight="duotone" className="w-3 h-3 text-emerald-500" /> : <EyeSlash weight="duotone" className="w-3 h-3 text-muted-foreground" />}
                      <span className={`text-2xs font-semibold ${part.published ? 'text-emerald-500' : 'text-muted-foreground'}`}>{part.published ? 'Published' : 'Unpublished'}</span>
                      {part.archived && <span className="ml-auto text-2xs font-bold text-amber-400 flex items-center gap-0.5"><Archive className="w-3 h-3" /> Archived</span>}
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
              <span className="text-11px font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><CurrencyDollar className="w-4 h-4 text-emerald-500" /> Total Spend (YTD)</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{formatCurrency(reportData.totalSpend)}</span>
              <span className="text-2xs text-muted-foreground mt-2">Capital in received inventory</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
              <span className="text-11px font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-400" /> Capital in Transit</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{formatCurrency(reportData.capitalInTransit)}</span>
              <span className="text-2xs text-muted-foreground mt-2">Confirmed orders awaiting delivery</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
              <span className="text-11px font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Timer className="w-4 h-4 text-amber-500" /> Avg Supplier Lead Time</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{reportData.avgLeadTime} <span className="text-sm text-muted-foreground font-semibold">days</span></span>
              <span className="text-2xs text-muted-foreground mt-2">From order confirmation to receipt</span>
            </div>
            <div className="bg-background border border-border p-5 rounded-2xl shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
              <span className="text-11px font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><EnvelopeSimple className="w-4 h-4 text-primary" /> Pending Orders</span>
              <span className="text-3xl font-black text-foreground font-display tracking-tight">{reportData.pendingRfqs} <span className="text-sm text-muted-foreground font-semibold">requests</span></span>
              <span className="text-2xs text-muted-foreground mt-2">Drafts and pending POs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Supplier Spend & Order Matrix */}
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><CurrencyDollar weight="duotone" className="w-4 h-4 text-emerald-500" /> Supplier Spend & Order Matrix</h3>
              {reportData.spendBySupplier.length > 0 ? (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.spendBySupplier} layout="vertical" margin={{ top: 0, right: 60, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={200} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name) => [name === 'total' ? `₱${v.toLocaleString()}` : v, name === 'total' ? 'Spend' : 'Total Orders']}
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20} minPointSize={3}>
                        <LabelList dataKey="total" position="right" formatter={(v) => `₱${v.toLocaleString()}`} fill="#94a3b8" fontSize={10} fontWeight="bold" />
                        {reportData.spendBySupplier.map((entry, index) => (
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
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><ChartBar weight="duotone" className="w-4 h-4 text-primary" /> Order Pipeline Distribution</h3>
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
                    <span className="text-2xs font-bold text-muted-foreground uppercase">Total POs</span>
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
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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

      {/* ── SUPPLIER MODAL ── */}
      {isSupplierModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
              <h3 className="text-xl font-bold text-foreground">{editingSupplier ? 'Supplier Profile' : 'New Supplier'}</h3>
              <div className="flex items-center gap-2">
                <button onClick={saveSupplier} className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded shadow flex items-center gap-1.5 transition-all active:scale-95">
                  <CheckCircle weight="bold" className="w-4 h-4" /> Save
                </button>
                {editingSupplier && (
                  <button onClick={() => doArchiveSupplier(editingSupplier.id, editingSupplier.name)} className="px-3 py-1.5 bg-secondary border border-border hover:bg-amber-500/10 hover:border-amber-500/30 text-muted-foreground hover:text-amber-400 text-sm font-bold rounded transition-all flex items-center gap-1.5">
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
                  <input type="text" placeholder="Supplier Name *" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full bg-transparent border-b-2 border-border focus:border-accent focus:outline-none text-2xl font-extrabold text-foreground placeholder:text-muted-foreground pb-1 transition-colors" />
                </div>
              </div>
              {/* Fields grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-muted-foreground">Contact Person</label>
                  <input type="text" value={supplierForm.contactPerson} onChange={e => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} className="w-full bg-secondary border border-border rounded-lg p-2 focus:ring-2 focus:ring-accent focus:outline-none text-foreground transition-all h-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-muted-foreground">Email</label>
                  <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full bg-secondary border border-border rounded-lg p-2 focus:ring-2 focus:ring-accent focus:outline-none text-foreground transition-all h-10" />
                </div>

                {/* Country dropdown */}
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-muted-foreground flex items-center gap-2"><Globe className="w-4 h-4" /> Country</label>
                  <Select
                    options={countryOptions}
                    value={supplierForm.country ? { value: supplierForm.country, label: supplierForm.country } : null}
                    onChange={(sel) => setSupplierForm({ ...supplierForm, country: sel ? sel.value : '' })}
                    placeholder="Select country..."
                    styles={customSelectStyles}
                    isClearable
                    classNamePrefix="react-select"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-bold text-muted-foreground">Phone</label>
                  <PhoneInput
                    countrySelectComponent={() => null}
                    country={getCountryCode(supplierForm.country)}
                    value={supplierForm.phone}
                    onChange={val => setSupplierForm({ ...supplierForm, phone: val })}
                    className="w-full bg-secondary border border-border rounded-lg p-2 focus:ring-2 focus:ring-accent focus:outline-none text-foreground transition-all h-10"
                    placeholder={supplierForm.country ? "Enter phone number" : "Select country first"}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-bold text-muted-foreground">Address</label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={loadAddressOptions}
                    defaultOptions={false}
                    value={supplierForm.address ? { label: supplierForm.address, value: supplierForm.address } : null}
                    onChange={(sel) => setSupplierForm({ ...supplierForm, address: sel ? sel.value : '' })}
                    onInputChange={(val, { action }) => {
                      if (action === 'input-change') {
                        setSupplierForm({ ...supplierForm, address: val });
                      }
                    }}
                    placeholder="Start typing an address..."
                    styles={customSelectStyles}
                    isClearable
                    classNamePrefix="react-select"
                    noOptionsMessage={() => "Type to search address..."}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-bold text-muted-foreground">Payment Terms</label>
                  <Select
                    options={['Net 15', 'Net 30', 'Net 60', 'Due on Receipt', 'Prepaid'].map(t => ({ value: t, label: t }))}
                    value={supplierForm.paymentTerms ? { value: supplierForm.paymentTerms, label: supplierForm.paymentTerms } : null}
                    onChange={(sel) => setSupplierForm({ ...supplierForm, paymentTerms: sel ? sel.value : '' })}
                    placeholder="Select terms..."
                    styles={customSelectStyles}
                    isClearable
                    classNamePrefix="react-select"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground">Notes</label>
                <textarea value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg p-2 focus:ring-1 focus:ring-accent text-sm resize-none h-16 focus:outline-none" />
              </div>

              {editingSupplier && (
                <div className="border-t border-border pt-6 mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-foreground">Purchase Orders</h4>
                    <button
                      onClick={() => {
                        setIsSupplierModalOpen(false);
                        openPoModal(null, editingSupplier.id);
                      }}
                      className="text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                    >
                      Create PO
                    </button>
                  </div>
                  <div className="space-y-2">
                    {purchaseOrders.filter(po => po.supplier?.id === editingSupplier.id).length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center border border-dashed border-border rounded-xl">No purchase orders found for this supplier.</p>
                    ) : (
                      purchaseOrders.filter(po => po.supplier?.id === editingSupplier.id).map(po => (
                        <div key={po.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-background hover:bg-secondary transition-colors">
                          <div>
                            <span className="font-bold text-sm text-foreground block">{po.poNumber}</span>
                            <span className="text-xs text-muted-foreground font-semibold">{po.status} • {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'No Date'}</span>
                          </div>
                          <button
                            onClick={() => {
                              setIsSupplierModalOpen(false);
                              openPoModal(po);
                            }}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border hover:border-muted-foreground rounded transition-colors"
                          >
                            View Order
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── PO MODAL ── */}
      {isPoModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 pb-8 px-4 bg-foreground/30 overflow-y-auto animate-fadeIn custom-scrollbar">
          <div className="w-full max-w-6xl bg-background border border-border shadow-none rounded-xl overflow-hidden flex flex-col relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background sticky top-0 z-20">
              <div>
                <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Purchasing document</p>
                <h3 className="text-xl font-bold text-foreground leading-tight">
                  {viewingPo ? viewingPo.poNumber : 'New Purchase Order'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block">
                  <PipelineChevron currentStatus={viewingPo?.status || 'Draft'} />
                </div>
                <button onClick={() => setIsPoModalOpen(false)} className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded" title="Close"><X weight="bold" className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 md:p-6 bg-background">
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-secondary/25 p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{viewingPo ? viewingPo.poNumber : 'New Purchase Order'}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{getPoModalSubtitle()}</p>
                </div>
                {viewingPo && <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusBadge status={viewingPo.status} />
                  <StatusBadge status={viewingPo.billingStatus || 'Waiting Bills'} />
                </div>}
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 mb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier</label>
                    <div className="min-w-0">
                      <Select
                        isDisabled={!!viewingPo}
                        value={poForm.supplier ? { value: poForm.supplier, label: suppliers.find(s => s.id === poForm.supplier)?.name || poForm.supplier } : null}
                        onChange={(option) => setPoForm({ ...poForm, supplier: option ? option.value : '' })}
                        options={suppliers.filter(s => !s.archived).map(s => ({ value: s.id, label: s.name }))}
                        placeholder="Select Supplier..."
                        styles={customSelectStyles}
                        menuPortalTarget={document.body}
                        isClearable
                        isSearchable
                        classNamePrefix="react-select"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source RFQ</label>
                      <input type="text" disabled={!!viewingPo && !canEditRfqDetails} value={poForm.sourceRfq} onChange={e => setPoForm({ ...poForm, sourceRfq: e.target.value })} placeholder="RFQ reference..." className="min-w-0 bg-transparent focus:outline-none text-foreground font-mono text-sm" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Date</label>
                      <span className="text-foreground">{viewingPo ? new Date(viewingPo.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                      <label htmlFor="po-expected-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Arrival</label>
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          id="po-expected-date"
                          disabled={!!viewingPo && !canEditRfqDetails}
                          type="date"
                          value={poForm.expectedDeliveryDate}
                          onChange={e => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                          className="flex-1 bg-transparent focus:outline-none text-foreground [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                        />
                        {(!viewingPo || canEditRfqDetails) && (
                          <button
                            type="button"
                            onClick={() => document.getElementById('po-expected-date')?.showPicker?.()}
                            className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                            title="Open calendar"
                          >
                            <CalendarBlank weight="duotone" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {viewingPo && (
                      <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                        <label htmlFor="po-payment-deadline" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Deadline</label>
                        <div className="flex min-w-0 items-center gap-2">
                          <input
                            id="po-payment-deadline"
                            disabled={!!viewingPo && !canEditRfqDetails}
                            type="date"
                            value={poForm.paymentDueDate}
                            onChange={e => setPoForm({ ...poForm, paymentDueDate: e.target.value })}
                            className="flex-1 bg-transparent focus:outline-none text-foreground [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                          />
                          {canEditRfqDetails && (
                            <button
                              type="button"
                              onClick={() => document.getElementById('po-payment-deadline')?.showPicker?.()}
                              className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                              title="Open payment deadline calendar"
                            >
                              <CalendarBlank weight="duotone" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {viewingPo?.confirmationDate && (
                      <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-border pb-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirmed On</label>
                        <span className="text-foreground">{new Date(viewingPo.confirmationDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items table */}
                <div className="mb-3 flex items-end justify-between border-b border-border">
                  <button className="border-b-2 border-accent text-accent font-bold pb-2 text-sm">Products</button>
                  <span className="pb-2 text-xs font-semibold text-muted-foreground">{poForm.items.length} line{poForm.items.length === 1 ? '' : 's'}</span>
                </div>
                <div className="min-h-[200px] overflow-hidden rounded-xl border border-border bg-background">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead><tr className="border-b border-border bg-secondary/60 text-muted-foreground">
                      <th className="py-2.5 px-3 font-bold w-1/2">Product</th>
                      <th className="py-2.5 px-3 font-bold text-right w-1/8">Qty</th>
                      {viewingPo && viewingPo.status === 'Confirmed' ? (
                        <th className="py-2.5 px-3 font-bold text-right w-1/6">Quoted Price</th>
                      ) : (
                        <th className="py-2.5 px-3 font-bold text-right w-1/6">Unit Price</th>
                      )}
                      <th className="py-2.5 px-3 font-bold text-right w-1/6">Subtotal</th>
                      {viewingPo?.status === 'Confirmed' && <th className="py-2.5 px-3 font-bold text-center w-20">Received</th>}
                      {!viewingPo && <th className="w-8" />}
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {poForm.items.map((item, idx) => {
                        const isDelivered = deliveredItems.has(item.id);
                        const isConfirmed = viewingPo?.status === 'Confirmed';
                        return (
                          <tr key={idx} className={`hover:bg-secondary/50 transition-colors ${isConfirmed && isDelivered ? 'bg-emerald-500/5' : ''}`}>
                            <td className="py-3 px-3 font-medium">[{item.sku}] {item.name}</td>
                            <td className="py-3 px-3 text-right">{item.quantity}</td>
                            <td className="py-3 px-3 text-right">
                              {isConfirmed ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={quotedPrices[item.id] ?? item.unitPrice}
                                  onChange={e => setQuotedPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className="w-24 text-right bg-amber-500/10 border border-amber-400/30 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              ) : (
                                formatCurrency(item.unitPrice)
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold">
                              {isConfirmed
                                ? formatCurrency(lineSubtotal(item.quantity, getQuotedUnitPrice(item)))
                                : formatCurrency(item.subtotal)}
                            </td>
                            {isConfirmed && (
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDeliveredItems(prev => {
                                    const next = new Set(prev);
                                    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                                    return next;
                                  })}
                                  className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                    isDelivered
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-border hover:border-emerald-500 text-transparent'
                                  }`}
                                  title={isDelivered ? 'Mark as not received' : 'Mark as received'}
                                >
                                  <CheckCircle weight="bold" className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                            {!viewingPo && <td className="py-3 px-3 text-right"><button onClick={() => removePoItem(idx)} className="text-muted-foreground hover:text-accent"><X className="w-4 h-4" /></button></td>}
                          </tr>
                        );
                      })}
                      {!viewingPo && (
                        <tr><td colSpan="5" className="bg-secondary/25 p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="min-w-[240px] flex-1">
                              <Select
                                styles={customSelectStyles}
                                menuPortalTarget={document.body}
                                placeholder="Type to search product..."
                                value={poPartSel ? { value: poPartSel, label: `[${(parts.find(p => p.id === poPartSel) || {}).sku}] ${(parts.find(p => p.id === poPartSel) || {}).name}` } : null}
                                onChange={(option) => setPoPartSel(option ? option.value : '')}
                                options={(parts || []).filter(p => !p.archived).map(p => ({
                                  value: p.id,
                                  label: `[${p.sku}] ${p.name}`
                                }))}
                                isClearable
                                isSearchable
                              />
                            </div>
                            <div className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setPoQty(prev => String(Math.max(1, (parseInt(prev) || 1) - 1)))}
                                className="px-2 py-2 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Decrease quantity"
                              >
                                <Minus weight="bold" className="w-3.5 h-3.5" />
                              </button>
                              <input type="number" min="1" placeholder="Qty" value={poQty} onChange={e => setPoQty(e.target.value)} className="w-14 bg-transparent px-1 py-2 text-sm focus:outline-none text-center text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <button
                                type="button"
                                onClick={() => setPoQty(prev => String((parseInt(prev) || 0) + 1))}
                                className="px-2 py-2 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Increase quantity"
                              >
                                <Plus weight="bold" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button onClick={addPoItem} className="px-3 py-2 text-accent font-bold hover:bg-accent/10 rounded text-sm">Add Line</button>
                          </div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                  <div className="grid gap-4 mt-4 pt-4 border-t border-border md:grid-cols-[1fr_320px] md:items-start">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Notes</label>
                      <textarea disabled={!!viewingPo && !canEditRfqDetails} value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} className="w-full bg-transparent border border-border rounded-lg p-2 focus:ring-1 focus:ring-accent text-sm resize-none h-16 focus:outline-none" />
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <div className="w-full flex justify-between rounded-lg border border-border bg-secondary/25 px-3 py-2 font-bold text-lg text-foreground">
                        <span>Total</span>
                        <span>{formatCurrency(visiblePoTotal)}</span>
                      </div>
                      {!viewingPo ? (
                          <div className="flex gap-2 justify-end w-full">
                            <button
                              type="button"
                              onClick={() => setIsPoModalOpen(false)}
                              className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                            >
                              Discard
                            </button>
                            <button
                              type="button"
                              onClick={savePo}
                              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg transition-colors"
                            >
                              Save Draft
                            </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 justify-end w-full">
                            <button
                              type="button"
                              onClick={() => generateRfqPDF(viewingPo)}
                              className="px-3 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg flex items-center gap-1.5"
                              title="Download RFQ PDF (for supplier)"
                            >
                              <FilePdf weight="duotone" className="w-4 h-4 text-primary" /> RFQ PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => generatePDF(viewingPo)}
                              className="px-3 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg flex items-center gap-1.5"
                              title="Download PO PDF"
                            >
                              <FilePdf weight="duotone" className="w-4 h-4 text-accent" /> PO PDF
                            </button>

                          {viewingPo.status === 'Draft' && (
                            <>
                                <button
                                  type="button"
                                  onClick={saveRfqDetails}
                                  className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                                >
                                  Save RFQ Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePoStatus(viewingPo.id, 'Cancelled', viewingPo.poNumber)}
                                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              <button
                                  type="button"
                                  onClick={() => updatePoStatus(viewingPo.id, 'Confirmed', viewingPo.poNumber)}
                                  className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                                >
                                  Confirm Order
                                </button>
                              <button
                                  type="button"
                                  onClick={() => updatePoStatus(viewingPo.id, 'RFQ Sent', viewingPo.poNumber)}
                                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                  Send RFQ
                                </button>
                            </>
                          )}

                          {viewingPo.status === 'RFQ Sent' && (
                            <>
                                <button
                                  type="button"
                                  onClick={saveRfqDetails}
                                  className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                                >
                                  Save RFQ Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePoStatus(viewingPo.id, 'Cancelled', viewingPo.poNumber)}
                                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              <button
                                  type="button"
                                  onClick={() => updatePoStatus(viewingPo.id, 'Confirmed', viewingPo.poNumber)}
                                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                  Confirm Order
                                </button>
                            </>
                          )}

                          {viewingPo.status === 'Confirmed' && (
                            <>
                              {/* Quoted prices save */}
                              <button
                                  type="button"
                                  onClick={saveQuotedPrices}
                                  disabled={savingPrices}
                                  className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-500 text-sm font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                                >
                                {savingPrices ? <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <CurrencyDollar weight="bold" className="w-4 h-4" />}
                                Save Quoted Prices
                              </button>
                              {viewingPo.billingStatus === 'Waiting Bills' && (
                                <button
                                    type="button"
                                    onClick={() => updateBillingStatus(viewingPo.id, 'Bills Received')}
                                    className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                                  >
                                  Mark Bills Received
                                </button>
                              )}
                              {/* Receive Products — gated by checklist */}
                              {(() => {
                                const allDelivered = poForm.items.length > 0 && poForm.items.every(i => deliveredItems.has(i.id));
                                return (
                                  <button
                                    type="button"
                                      disabled={!allDelivered}
                                      onClick={() => updatePoStatus(viewingPo.id, 'Received', viewingPo.poNumber)}
                                      className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors ${
                                        allDelivered
                                          ? 'bg-accent hover:bg-accent/90'
                                          : 'bg-accent/30 cursor-not-allowed'
                                      }`}
                                    title={allDelivered ? 'Confirm receipt' : `Check all ${poForm.items.length} items first`}
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Truck weight="duotone" className="w-4 h-4" />
                                      Receive Products {!allDelivered && `(${deliveredItems.size}/${poForm.items.length})`}
                                    </span>
                                  </button>
                                );
                              })()}
                            </>
                          )}

                          {viewingPo.status === 'Received' && viewingPo.billingStatus === 'Waiting Bills' && (
                            <button
                                type="button"
                                onClick={() => updateBillingStatus(viewingPo.id, 'Bills Received')}
                                className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground text-sm font-bold rounded-lg transition-colors"
                              >
                              Mark Bills Received
                            </button>
                          )}
                        </div>
                      )}
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
                      {viewingPart && <p className="text-2xs text-muted-foreground font-mono uppercase tracking-wider">SKU: {viewingPart.sku}</p>}
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
                        { label: 'Reserved', value: viewingPart.reservedStock || 0, icon: Clock, color: 'text-amber-500', alert: (viewingPart.reservedStock || 0) > 0 },
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
                            <th className="p-3">Date</th><th className="p-3">PO Number</th><th className="p-3">Supplier</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Status</th>
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

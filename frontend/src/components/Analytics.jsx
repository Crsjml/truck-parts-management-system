import React, { useState, useMemo, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ChartBar, Download, FileText, CurrencyDollar, TrendUp, Stack, ChartPieSlice, CalendarBlank, MagnifyingGlass, ShoppingCart, ArrowsOut, X, Package, CaretDown, Clock, Truck, CheckCircle, Receipt, Eye } from '@phosphor-icons/react';
import PeriodSelector from './analytics/PeriodSelector';
import ChannelSelector from './analytics/ChannelSelector';
import KpiTile from './analytics/KpiTile';
import ChartRenderer from './analytics/ChartRenderer';
import BestSellingPartsReport from './analytics/BestSellingPartsReport';
import SlowMovingStockReport from './analytics/SlowMovingStockReport';
import PeakSalesPeriodReport from './analytics/PeakSalesPeriodReport';
import PartDetailDrawer from './PartDetailDrawer';
import { resolvePeriod, inRange, computeKpis, trendSeries, buildCategoryTree, categoryRevenue, topMovers, paymentMix, orderStatusBreakdown, byChannel, PAYMENT_METHODS, PAYMENT_COLORS, PAYMENT_LABELS } from '../utils/salesAnalytics';
import { fetchCategoriesList } from '../authStore';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const ZOOM_TITLES = {
  trend: 'Revenue Trend',
  movers: 'Top Movers',
  treemap: 'Category Revenue Allocation',
  payments: 'Payment Method Mix',
  status: 'Order Status Breakdown'
};

const ZOOM_ICONS = {
  trend: TrendUp,
  movers: ChartBar,
  treemap: Stack,
  payments: CurrencyDollar,
  status: Package
};

// Removed inline chart components, moved to ChartRenderer

export default function Analytics({ parts = [], transactions = [], isLoading = false }) {
  const { formatCurrency, displayCurrency, formatBaseCurrency } = useSettings();
  const [searchInvoice, setSearchInvoice] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [zoomedChart, setZoomedChart] = useState(null); // 'trend' | 'movers' | 'donut' | 'payments' | null
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [categories, setCategories] = useState([]);
  const [drilledCategory, setDrilledCategory] = useState(null);
  const [detailedPart, setDetailedPart] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [channel, setChannel] = useState('all');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setZoomedChart(null);
        setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync with props if transactions change from App.jsx
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Fetch category hierarchy for treemap drill-down
  useEffect(() => {
    fetchCategoriesList()
      .then(data => setCategories(data || []))
      .catch(err => {
        console.error('Failed to fetch categories list:', err);
        setCategories([]);
      });
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(`/api/transactions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setLocalTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status: newStatus } : tx));
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        console.error('Failed to update status');
        alert('Failed to update status. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return CheckCircle;
      case 'Ready for Pickup': return Truck;
      case 'Cancelled': return X;
      default: return Clock;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Ready for Pickup': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Cancelled': return 'text-alarm-red bg-alarm-red/10 border-alarm-red/20';
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  // Computations
  const range = useMemo(() => resolvePeriod(period), [period]);
  const channelTx = useMemo(() => byChannel(localTransactions, channel), [localTransactions, channel]);
  const currentTx = useMemo(() => inRange(channelTx, range.start, range.end), [channelTx, range]);
  const previousTx = useMemo(() => inRange(channelTx, range.prevStart, range.prevEnd), [channelTx, range]);
  const kpis = useMemo(() => computeKpis(currentTx, previousTx), [currentTx, previousTx]);
  const trend = useMemo(() => trendSeries(currentTx, previousTx, range), [currentTx, previousTx, range]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const catRevenue = useMemo(() => categoryRevenue(currentTx, parts, categoryTree, drilledCategory), [currentTx, parts, categoryTree, drilledCategory]);
  const maxCatRevenue = useMemo(() => {
    if (!catRevenue.length) return 1;
    return Math.max(...catRevenue.map(c => c.revenue || 0), 1);
  }, [catRevenue]);

  // ponytail: top movers ranking by period with rank-change indicators
  const movers = useMemo(() => topMovers(currentTx, previousTx, 5), [currentTx, previousTx]);
  const payments = useMemo(() => paymentMix(currentTx, range), [currentTx, range]);
  const orderStatuses = useMemo(() => orderStatusBreakdown(currentTx, range), [currentTx, range]);

  // Filtered transactions for the log
  const filteredTransactions = localTransactions.filter(tx => 
    tx.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    tx.customerName.toLowerCase().includes(searchInvoice.toLowerCase())
  ).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-border hide-scrollbar">
        {['overview', 'best-selling', 'slow-moving', 'peak-sales'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-brandBlue-500 text-brandBlue-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-700'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'best-selling' && 'Best-Selling Parts'}
            {tab === 'slow-moving' && 'Slow-Moving Stock'}
            {tab === 'peak-sales' && 'Peak Sales Period'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* KPI Stats Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <h2 className="text-xl font-bold text-foreground font-display">Sales Overview</h2>
            <div className="flex items-center gap-2">
              <ChannelSelector selectedChannel={channel} onSelectChannel={setChannel} />
              <PeriodSelector selectedPeriod={period} onSelectPeriod={setPeriod} />
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiTile label="Total Revenue" value={formatBaseCurrency(kpis.revenue)} delta={kpis.deltas?.revenue} icon={CurrencyDollar} iconBgClass="bg-emerald-950/40" iconColorClass="text-emerald-400" iconBorderClass="border-emerald-800/35" />
        <KpiTile label="Total Invoices" value={kpis.invoices} delta={kpis.deltas?.invoices} icon={FileText} iconBgClass="bg-brandBlue-900/40" iconColorClass="text-brandBlue-400" iconBorderClass="border-brandBlue-700/30" />
        <KpiTile label="Average Invoice" value={formatBaseCurrency(kpis.avgInvoice)} delta={kpis.deltas?.avgInvoice} icon={TrendUp} iconBgClass="bg-amber-950/40" iconColorClass="text-amber-500" iconBorderClass="border-amber-800/35" />
        <KpiTile label="Units per Invoice" value={kpis.unitsPerInvoice.toFixed(1)} delta={kpis.deltas?.unitsPerInvoice} icon={ShoppingCart} iconBgClass="bg-violet-950/40" iconColorClass="text-violet-400" iconBorderClass="border-violet-800/35" />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend (Full Width) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendUp weight="duotone" className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-foreground font-display">Revenue Trend</h3>
            </div>
            <button title="Expand Chart" aria-label="Zoom Revenue Trend" onClick={() => setZoomedChart('trend')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-800/20 animate-pulse rounded-xl border border-slate-700/30"></div>
              </div>
            ) : currentTx.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : (
              <ChartRenderer type="trend" data={trend} formatCurrency={formatBaseCurrency} />
            )}
          </div>
        </div>

        {/* Category Revenue Donut */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <ChartPieSlice weight="duotone" className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-foreground font-display">
                  {drilledCategory ? `Category Revenue: ${drilledCategory}` : 'Category Revenue Allocation'}
                </h3>
              </div>
              {!drilledCategory && (
                <span className="text-[11px] text-muted-foreground ml-7 leading-tight mt-0.5">
                  'Uncategorized' groups deleted parts or missing categories
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {drilledCategory && (
                <button
                  onClick={() => setDrilledCategory(null)}
                  className="text-xs font-semibold text-brandBlue-400 hover:text-brandBlue-300 flex items-center gap-1 bg-secondary/80 px-2.5 py-1 rounded-lg border border-border transition-all"
                >
                  ← Back
                </button>
              )}
              <button title="Expand Chart" aria-label="Zoom Category Revenue" onClick={() => setZoomedChart('donut')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
                <ArrowsOut weight="duotone" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full min-h-[320px] h-80">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-800/20 animate-pulse rounded-xl border border-slate-700/30"></div>
              </div>
            ) : currentTx.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : catRevenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No revenue data for categories.</div>
            ) : (
              <ChartRenderer 
                type="donut" 
                data={catRevenue} 
                formatCurrency={formatBaseCurrency}
                extraProps={{ maxCatRevenue, onDrill: setDrilledCategory }}
              />
            )}
          </div>
        </div>

        {/* Top Movers Panel */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <ChartBar weight="duotone" className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-foreground font-display">Top Movers</h3>
              </div>
              <span className="text-[11px] text-muted-foreground ml-7 leading-tight mt-0.5">Rank change by volume vs previous</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('best-selling')}
                className="text-xs font-semibold text-brandBlue-400 hover:text-brandBlue-300 flex items-center gap-1 bg-secondary/80 px-2.5 py-1 rounded-lg border border-border transition-all"
              >
                View full report →
              </button>
              <button title="Expand Chart" aria-label="Zoom Top Movers" onClick={() => setZoomedChart('movers')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
                <ArrowsOut weight="duotone" className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-800/20 animate-pulse rounded-xl border border-slate-700/30"></div>
              </div>
            ) : currentTx.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : movers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No products sold yet.</div>
            ) : (
              <ChartRenderer 
                type="movers" 
                data={movers} 
                formatCurrency={formatBaseCurrency}
                extraProps={{
                  onMoverClick: (partName) => {
                    const found = parts.find(p => p.name === partName);
                    if (found) setDetailedPart(found);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Payment Method Mix (1 Column) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CurrencyDollar weight="duotone" className="w-5 h-5 text-violet-400" />
              <h3 className="text-base font-bold text-foreground font-display">Payment Method Mix</h3>
            </div>
            <button title="Expand Chart" aria-label="Zoom Payment Method Mix" onClick={() => setZoomedChart('payments')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-800/20 animate-pulse rounded-xl border border-slate-700/30"></div>
              </div>
            ) : currentTx.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : channel === 'online' ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5 w-full max-w-sm">
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Online Payments</span>
                    <h3 className="text-2xl font-bold text-foreground font-display">100% Card</h3>
                    <p className="text-2xs font-medium text-emerald-400 flex items-center gap-1">
                      {currentTx.length} orders · {formatBaseCurrency(kpis.revenue)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border bg-violet-950/40 text-violet-400 border-violet-800/35">
                    <CurrencyDollar weight="duotone" className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ) : (
              <ChartRenderer type="payments" data={payments} formatCurrency={formatBaseCurrency} />
            )}
          </div>
        </div>

        {/* Order Status Breakdown (1 Column) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Package weight="duotone" className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-foreground font-display">Order Status</h3>
            </div>
            <button title="Expand Chart" aria-label="Zoom Order Status" onClick={() => setZoomedChart('status')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-800/20 animate-pulse rounded-xl border border-slate-700/30"></div>
              </div>
            ) : currentTx.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : (
              <ChartRenderer type="status" data={orderStatuses} formatCurrency={formatBaseCurrency} />
            )}
          </div>
        </div>
      </div>

      {/* Invoice Ledger History */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="space-y-1 w-full sm:w-auto">
            <h3 className="text-base font-bold text-foreground font-display">Sales Invoice Ledger</h3>
            <p className="text-xs text-muted-foreground">View payment history and re-download generated PDF receipts.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass weight="duotone" className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search invoice or customer..."
              value={searchInvoice}
              onChange={(e) => {
                setSearchInvoice(e.target.value);
                setLedgerPage(1);
              }}
              className="w-full bg-background border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No matching transactions logged.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-muted-foreground font-semibold uppercase border-b border-border">
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3 text-center">Items Count</th>
                  <th className="py-3 px-3 text-right">Invoiced Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">View</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {(() => {
                  const itemsPerPage = 5;
                  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
                  const paginatedTransactions = filteredTransactions.slice(
                    (ledgerPage - 1) * itemsPerPage,
                    ledgerPage * itemsPerPage
                  );
                  return (
                    <>
                      {paginatedTransactions.map((tx) => (
                        <tr 
                          key={tx.id} 
                          className="hover:bg-secondary transition-colors"
                        >
                          <td className="py-3 px-3 font-semibold text-red-500">{tx.invoiceNumber}</td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {new Date(tx.transactionDate).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">{tx.customerName}</td>
                          <td className="py-3 px-3 text-center text-muted-foreground">
                            {tx.items.reduce((s, i) => s + i.quantity, 0)} items
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            {formatBaseCurrency(tx.total)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="relative inline-flex items-center group cursor-pointer" title="Click to change order status">
                              <select 
                                value={tx.status || 'Order Placed'}
                                onChange={(e) => handleStatusUpdate(tx.id, e.target.value)}
                                className={`text-xs pl-3 pr-8 py-1.5 rounded-md border appearance-none outline-none text-left cursor-pointer font-bold transition-all shadow-sm group-hover:shadow focus-visible:ring-2 focus-visible:ring-accent
                                  ${tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:border-emerald-500/40' : 
                                    tx.status === 'Ready for Pickup' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 group-hover:border-blue-500/40' : 
                                    tx.status === 'Cancelled' ? 'bg-alarm-red/10 text-alarm-red border-alarm-red/20 group-hover:border-alarm-red/40' : 
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20 group-hover:border-amber-500/40'}`}
                              >
                                <option value="Order Placed" className="bg-background text-foreground font-medium">ORDER_PLACED</option>
                                <option value="Ready for Pickup" className="bg-background text-foreground font-medium">Ready for Pickup</option>
                                <option value="Completed" className="bg-background text-foreground font-medium">Completed</option>
                                <option value="Cancelled" className="bg-background text-foreground font-medium">Cancelled</option>
                              </select>
                              <CaretDown weight="bold" className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              aria-label="View Invoice Details"
                              onClick={() => setSelectedInvoice(tx)}
                              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all mx-auto"
                              title="View Invoice Details"
                            >
                              <Eye weight="duotone" className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              aria-label="Download Invoice PDF"
                              onClick={() => buildInvoicePdf(tx, { formatCurrency: formatBaseCurrency, displayCurrency, duplicate: true })}
                              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all mx-auto"
                              title="Download Invoice"
                            >
                              <Download weight="duotone" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })()}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {filteredTransactions.length > 5 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {((ledgerPage - 1) * 5) + 1} to {Math.min(ledgerPage * 5, filteredTransactions.length)} of {filteredTransactions.length} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLedgerPage(p => Math.max(1, p - 1))}
                disabled={ledgerPage === 1}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all text-foreground"
              >
                Previous
              </button>
              <button
                onClick={() => setLedgerPage(p => Math.min(Math.ceil(filteredTransactions.length / 5), p + 1))}
                disabled={ledgerPage >= Math.ceil(filteredTransactions.length / 5)}
                className="px-3 py-1 text-xs rounded-md border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all text-foreground"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'best-selling' && <BestSellingPartsReport transactions={channelTx} parts={parts} />}
      {activeTab === 'slow-moving' && <SlowMovingStockReport transactions={channelTx} parts={parts} />}
      {activeTab === 'peak-sales' && <PeakSalesPeriodReport transactions={channelTx} />}

      {/* ZOOM MODAL */}
      <AnimatePresence>
        {zoomedChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl h-[80vh] bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
                <div className="flex items-center gap-2">
                  {React.createElement(ZOOM_ICONS[zoomedChart] || ChartBar, { weight: 'duotone', className: 'w-6 h-6 text-accent' })}
                  <h3 className="text-xl font-bold text-foreground font-display">
                    {ZOOM_TITLES[zoomedChart] || 'Chart View'}
                  </h3>
                </div>
                <button aria-label="Close modal" onClick={() => setZoomedChart(null)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-all">
                  <X weight="bold" className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-background p-8 min-h-[400px]">
                {zoomedChart === 'trend' && <ChartRenderer type="trend" data={trend} formatCurrency={formatBaseCurrency} />}
                {zoomedChart === 'movers' && (
                  <ChartRenderer 
                    type="movers" 
                    data={movers} 
                    formatCurrency={formatBaseCurrency} 
                    extraProps={{
                      onMoverClick: (partName) => {
                        const found = parts.find(p => p.name === partName);
                        if (found) {
                          setZoomedChart(null);
                          setDetailedPart(found);
                        }
                      }
                    }}
                  />
                )}
                {zoomedChart === 'donut' && (
                  <ChartRenderer 
                    type="donut" 
                    data={catRevenue} 
                    formatCurrency={formatBaseCurrency} 
                    extraProps={{ maxCatRevenue, onDrill: setDrilledCategory }} 
                  />
                )}
                {zoomedChart === 'payments' && (
                  channel === 'online' ? (
                    <div className="h-full flex items-center justify-center p-4">
                      <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/5 w-full max-w-sm">
                        <div className="space-y-2">
                          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Online Payments</span>
                          <h3 className="text-2xl font-bold text-foreground font-display">100% Card</h3>
                          <p className="text-2xs font-medium text-emerald-400 flex items-center gap-1">
                            {currentTx.length} orders · {formatBaseCurrency(kpis.revenue)}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl border bg-violet-950/40 text-violet-400 border-violet-800/35">
                          <CurrencyDollar weight="duotone" className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ChartRenderer type="payments" data={payments} formatCurrency={formatBaseCurrency} />
                  )
                )}
                {zoomedChart === 'status' && <ChartRenderer type="status" data={orderStatuses} formatCurrency={formatBaseCurrency} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELECTED INVOICE SIDE-DRAWER */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm"
          >
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setSelectedInvoice(null)} />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-secondary h-full border-l border-border shadow-2xl flex flex-col relative z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-background shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-accent" />
                    Invoice {selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedInvoice.transactionDate).toLocaleString(undefined, { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <button 
                  aria-label="Close invoice details"
                  onClick={() => setSelectedInvoice(null)} 
                  className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full transition-all bg-background border border-border hover:border-muted-foreground/30 shadow-sm"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background custom-scrollbar">
                
                {/* Status & Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <div className="bg-secondary/50 rounded-xl p-5 border border-border/50">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Customer Details</p>
                    <p className="font-bold text-foreground text-lg">{selectedInvoice.customerName}</p>
                    <p className="text-sm text-muted-foreground">ID: {selectedInvoice.userId}</p>
                  </div>

                  {/* Status Card */}
                  <div className={`rounded-xl p-5 border ${getStatusColor(selectedInvoice.status)}`}>
                    <p className="text-xs uppercase tracking-wider opacity-70 font-semibold mb-2">Order Status</p>
                    <div className="flex items-center gap-3">
                      {React.createElement(getStatusIcon(selectedInvoice.status), { weight: 'fill', className: 'w-8 h-8' })}
                      <div className="flex-1 relative group cursor-pointer" title="Click to change status">
                        <select 
                          value={selectedInvoice.status || 'Order Placed'}
                          onChange={(e) => handleStatusUpdate(selectedInvoice.id, e.target.value)}
                          className="w-full appearance-none bg-transparent font-bold text-xl outline-none cursor-pointer"
                        >
                          <option value="Order Placed" className="bg-background text-foreground text-base">ORDER_PLACED</option>
                          <option value="Ready for Pickup" className="bg-background text-foreground text-base">Ready for Pickup</option>
                          <option value="Completed" className="bg-background text-foreground text-base">Completed</option>
                          <option value="Cancelled" className="bg-background text-foreground text-base">Cancelled</option>
                        </select>
                        <CaretDown weight="bold" className="w-4 h-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="font-bold text-foreground mb-4 text-lg border-b border-border/50 pb-2">Line Items</h4>
                  <div className="space-y-3">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
                        <div className="w-12 h-12 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{formatBaseCurrency(item.price * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {formatBaseCurrency(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-secondary/50 rounded-xl p-5 border border-border/50 flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-sm">Total Amount</span>
                  <span className="text-2xl font-bold text-accent">{formatBaseCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="p-4 border-t border-border bg-background shrink-0">
                <button 
                  onClick={() => buildInvoicePdf(selectedInvoice, { formatCurrency: formatBaseCurrency, displayCurrency, duplicate: true })}
                  className="w-full py-3 bg-brandBlue-600 hover:bg-brandBlue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg shadow-brandBlue-500/20"
                >
                  <Download weight="bold" className="w-5 h-5" />
                  Download PDF Invoice
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PartDetailDrawer
        part={detailedPart}
        nestedCategories={categories}
        customerSession={null}
        transactions={localTransactions}
        addToCart={() => {}}
        onClose={() => setDetailedPart(null)}
      />
    </div>
  );
}

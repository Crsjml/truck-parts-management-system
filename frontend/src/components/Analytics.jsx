import React, { useState, useMemo, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ChartBar, Download, FileText, CurrencyDollar, TrendUp, Stack, CalendarBlank, MagnifyingGlass, ShoppingCart, ArrowsOut, X, Package, CaretDown, Clock, Truck, CheckCircle, Receipt } from '@phosphor-icons/react';
import PeriodSelector from './analytics/PeriodSelector';
import KpiTile from './analytics/KpiTile';
import { resolvePeriod, inRange, computeKpis, trendSeries, buildCategoryTree, categoryRevenue, topMovers } from '../utils/salesAnalytics';
import { fetchCategoriesList } from '../authStore';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Treemap, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const ZOOM_TITLES = {
  trend: 'Revenue Trend',
  movers: 'Top Movers',
  treemap: 'Category Revenue Allocation',
  payments: 'Payment Method Breakdown'
};

const ZOOM_ICONS = {
  trend: TrendUp,
  movers: ChartBar,
  treemap: Stack,
  payments: CurrencyDollar
};

function TreemapCell({ x, y, width, height, name, revenue, value, hasChildren, maxRev, onDrill, formatCurrency }) {
  if (!width || !height || width < 5 || height < 5) return null;

  const rev = revenue ?? value ?? 0;
  const ratio = maxRev > 0 ? Math.min(1, Math.max(0, rev / maxRev)) : 0.5;
  const fill = `hsl(217, 85%, ${Math.round(18 + ratio * 30)}%)`;

  const handleClick = () => {
    if (hasChildren && onDrill) {
      onDrill(name);
    }
  };

  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width={width}
        height={height}
        fill={fill}
        stroke="#0f172a"
        strokeWidth={2}
        rx={6}
        ry={6}
        className={hasChildren ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        onClick={handleClick}
      />
      {width > 40 && height > 28 && (
        <foreignObject x={4} y={4} width={width - 8} height={height - 8} style={{ pointerEvents: 'none' }}>
          <div className="w-full h-full flex flex-col justify-between p-1 text-white overflow-hidden">
            <span className="text-xs font-semibold leading-tight truncate" title={name}>
              {name}
            </span>
            <span className="text-[11px] font-bold text-blue-200">
              {formatCurrency ? formatCurrency(rev) : `₱${rev.toLocaleString()}`}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function MoverTick({ x, y, payload, movers }) {
  const name = payload?.value || '';
  const item = movers?.find(m => m.name === name);

  let badgeText = '—';
  let badgeStyle = 'text-muted-foreground bg-slate-800/80 border-slate-700/50';

  if (item) {
    if (item.rankDelta === null) {
      badgeText = 'NEW';
      badgeStyle = 'text-purple-400 bg-purple-950/50 border-purple-800/40';
    } else if (item.rankDelta > 0) {
      badgeText = `▲${item.rankDelta}`;
      badgeStyle = 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40';
    } else if (item.rankDelta < 0) {
      badgeText = `▼${Math.abs(item.rankDelta)}`;
      badgeStyle = 'text-rose-400 bg-rose-950/50 border-rose-800/40';
    } else {
      badgeText = '—';
      badgeStyle = 'text-muted-foreground bg-slate-800/80 border-slate-700/50';
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x="-215" y="-18" width="210" height="36">
        <div className="flex items-center justify-end gap-1.5 w-full h-full pr-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeStyle}`}>
            {badgeText}
          </span>
          <span className="text-[11px] text-foreground font-medium truncate text-right max-w-[140px]" title={name}>
            {name}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

export default function Analytics({ parts = [], transactions = [] }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [searchInvoice, setSearchInvoice] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [zoomedChart, setZoomedChart] = useState(null); // 'trend' | 'movers' | 'treemap' | 'payments' | null
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [categories, setCategories] = useState([]);
  const [drilledCategory, setDrilledCategory] = useState(null);

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
      case 'Cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  // Computations
  const range = useMemo(() => resolvePeriod(period), [period]);
  const currentTx = useMemo(() => inRange(localTransactions, range.start, range.end), [localTransactions, range]);
  const previousTx = useMemo(() => inRange(localTransactions, range.prevStart, range.prevEnd), [localTransactions, range]);
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

  // Filtered transactions for the log
  const filteredTransactions = localTransactions.filter(tx => 
    tx.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    tx.customerName.toLowerCase().includes(searchInvoice.toLowerCase())
  ).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Stats Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold text-foreground font-display">Sales Overview</h2>
        <PeriodSelector selectedPeriod={period} onSelectPeriod={setPeriod} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiTile 
          label="Total Revenue" 
          value={formatCurrency(kpis.revenue)} 
          delta={kpis.deltas?.revenue} 
          icon={CurrencyDollar} 
          iconBgClass="bg-emerald-950/40" 
          iconColorClass="text-emerald-400" 
          iconBorderClass="border-emerald-800/35" 
        />
        <KpiTile 
          label="Total Invoices" 
          value={kpis.invoices} 
          delta={kpis.deltas?.invoices} 
          icon={FileText} 
          iconBgClass="bg-brandBlue-900/40" 
          iconColorClass="text-brandBlue-400" 
          iconBorderClass="border-brandBlue-700/30" 
        />
        <KpiTile 
          label="Average Invoice" 
          value={formatCurrency(kpis.avgInvoice)} 
          delta={kpis.deltas?.avgInvoice} 
          icon={TrendUp} 
          iconBgClass="bg-amber-950/40" 
          iconColorClass="text-amber-500" 
          iconBorderClass="border-amber-800/35" 
        />
        <KpiTile 
          label="Units per Invoice" 
          value={kpis.unitsPerInvoice.toFixed(1)} 
          delta={kpis.deltas?.unitsPerInvoice} 
          icon={ShoppingCart} 
          iconBgClass="bg-violet-950/40" 
          iconColorClass="text-violet-400" 
          iconBorderClass="border-violet-800/35" 
        />
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
            <button onClick={() => setZoomedChart('trend')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickFormatter={(val) => `₱${val.toLocaleString()}`} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value) => [formatCurrency(value), undefined]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line dataKey="revenue" name="Current Period" type="monotone" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Line dataKey="prior" name="Prior Period" type="monotone" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Movers Panel */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ChartBar weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-foreground font-display">Top Movers</h3>
            </div>
            <button onClick={() => setZoomedChart('movers')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {movers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No products sold yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={movers}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={<MoverTick movers={movers} />}
                    width={210}
                  />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value, name, item) => [`${value} units (${formatCurrency(item?.payload?.revenue || 0)})`, 'Volume']}
                  />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#94a3b8', fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Revenue Treemap */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Stack weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-base font-bold text-foreground font-display">
                {drilledCategory ? `Category Revenue: ${drilledCategory}` : 'Category Revenue Allocation'}
              </h3>
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
              <button onClick={() => setZoomedChart('treemap')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
                <ArrowsOut weight="duotone" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full min-h-[320px] h-80">
            {catRevenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No revenue data for categories.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={catRevenue}
                  dataKey="revenue"
                  aspectRatio={4 / 3}
                  stroke="#0f172a"
                  content={
                    <TreemapCell
                      maxRev={maxCatRevenue}
                      onDrill={setDrilledCategory}
                      formatCurrency={formatCurrency}
                    />
                  }
                >
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(val) => [formatCurrency(val), 'Revenue']}
                  />
                </Treemap>
              </ResponsiveContainer>
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
              className="w-full bg-background border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-red-600 transition-all text-foreground"
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
                          className="hover:bg-secondary transition-colors cursor-pointer"
                          onDoubleClick={() => setSelectedInvoice(tx)}
                          title="Double-click to view details"
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
                            {formatCurrency(tx.total)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="relative inline-flex items-center group cursor-pointer" title="Click to change order status">
                              <select 
                                value={tx.status || 'Order Placed'}
                                onChange={(e) => handleStatusUpdate(tx.id, e.target.value)}
                                className={`text-xs pl-3 pr-8 py-1.5 rounded-md border appearance-none outline-none text-left cursor-pointer font-bold transition-all shadow-sm group-hover:shadow focus-visible:ring-2 focus-visible:ring-accent
                                  ${tx.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:border-emerald-500/40' : 
                                    tx.status === 'Ready for Pickup' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 group-hover:border-blue-500/40' : 
                                    tx.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20 group-hover:border-red-500/40' : 
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
                              onClick={() => buildInvoicePdf(tx, { formatCurrency, displayCurrency, duplicate: true })}
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
                <button onClick={() => setZoomedChart(null)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-all">
                  <X weight="bold" className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-background p-8 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {zoomedChart === 'trend' && (
                    <LineChart data={trend} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₱${val.toLocaleString()}`} dx={-10} />
                      <Tooltip 
                        cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value) => [formatCurrency(value), undefined]}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Line dataKey="revenue" name="Current Period" type="monotone" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line dataKey="prior" name="Prior Period" type="monotone" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  )}

                  {zoomedChart === 'movers' && (
                    <BarChart data={movers} layout="vertical" margin={{ top: 20, right: 60, left: 40, bottom: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={<MoverTick movers={movers} />} width={220} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value, name, item) => [`${value} units (${formatCurrency(item?.payload?.revenue || 0)})`, 'Volume']}
                      />
                      <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={40} label={{ position: 'right', fill: '#f8fafc', fontSize: 14, fontWeight: 'bold' }} />
                    </BarChart>
                  )}

                  {zoomedChart === 'treemap' && (
                    <Treemap
                      data={catRevenue}
                      dataKey="revenue"
                      aspectRatio={4 / 3}
                      stroke="#0f172a"
                      content={
                        <TreemapCell
                          maxRev={maxCatRevenue}
                          onDrill={setDrilledCategory}
                          formatCurrency={formatCurrency}
                        />
                      }
                    >
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(val) => [formatCurrency(val), 'Revenue']}
                      />
                    </Treemap>
                  )}

                  {zoomedChart === 'payments' && (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Payment breakdown zoom view
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELECTED INVOICE SIDE-DRAWER */}
      <AnimatePresence>
        {selectedInvoice && (
          <motion.div
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
                          <p className="font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-secondary/50 rounded-xl p-5 border border-border/50 flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-sm">Total Amount</span>
                  <span className="text-2xl font-bold text-accent">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="p-4 border-t border-border bg-background shrink-0">
                <button 
                  onClick={() => buildInvoicePdf(selectedInvoice, { formatCurrency, displayCurrency, duplicate: true })}
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
    </div>
  );
}

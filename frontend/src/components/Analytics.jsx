import React, { useState, useMemo, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ChartBar, Download, FileText, CurrencyDollar, TrendUp, Stack, CalendarBlank, MagnifyingGlass, ShoppingCart, ArrowsOut, X, Package, CaretDown, Clock, Truck, CheckCircle, Receipt } from '@phosphor-icons/react';
import PeriodSelector from './analytics/PeriodSelector';
import KpiTile from './analytics/KpiTile';
import { resolvePeriod, inRange, computeKpis, trendSeries } from '../utils/salesAnalytics';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid, Treemap } from 'recharts';
import { getCategoryIconAndColor } from '../utils/categoryIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function Analytics({ parts, transactions }) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [searchInvoice, setSearchInvoice] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [zoomedChart, setZoomedChart] = useState(null); // 'bar' | 'pie' | null
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [period, setPeriod] = useState('30d');

  // Sync with props if transactions change from App.jsx
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

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

  const getHexForTailwindClass = (classStr) => {
    if (!classStr) return '#ef4444';
    if (classStr.includes('red') || classStr.includes('rose')) return '#ef4444';
    if (classStr.includes('orange') || classStr.includes('amber')) return '#f59e0b';
    if (classStr.includes('yellow') || classStr.includes('lime')) return '#eab308';
    if (classStr.includes('emerald') || classStr.includes('teal')) return '#10b981';
    if (classStr.includes('cyan') || classStr.includes('sky')) return '#0ea5e9';
    if (classStr.includes('blue') || classStr.includes('brandBlue')) return '#3b82f6';
    if (classStr.includes('indigo') || classStr.includes('purple') || classStr.includes('violet')) return '#8b5cf6';
    if (classStr.includes('pink')) return '#ec4899';
    return '#94a3b8'; // slate/gray fallback
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

  // Group sales quantities by part name to avoid "Unknown Part" if IDs mismatch
  const partSalesCounts = {};
  localTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const name = item.name || 'Unknown Part';
      partSalesCounts[name] = (partSalesCounts[name] || 0) + item.quantity;
    });
  });

  // Top selling parts list
  const topSellingParts = Object.entries(partSalesCounts)
    .map(([name, qty]) => {
      const partObj = parts.find(p => p.name === name || (name.endsWith('...') && p.name.startsWith(name.slice(0, -3))));
      return {
        name: name,
        fullName: name,
        category: partObj ? partObj.category : 'Uncategorized',
        quantity: qty
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const CustomYAxisTick = (props) => {
    const { x, y, payload } = props;
    const item = topSellingParts.find(d => d.name === payload.value);
    const IconProps = getCategoryIconAndColor(item?.category);
    const IconComponent = IconProps?.icon || Package;
    
    const name = payload.value || '';
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x="-220" y="-18" width="215" height="36">
          <div className="flex items-center justify-end gap-1.5 w-full h-full pr-1">
            <IconComponent weight="duotone" className={`w-3.5 h-3.5 shrink-0 ${IconProps?.color || 'text-muted-foreground'}`} />
            <div className="flex flex-col items-end leading-tight text-right w-full overflow-hidden">
              <span className="text-[11px] text-foreground font-medium break-words whitespace-normal w-full text-right" title={name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {name}
              </span>
            </div>
          </div>
        </foreignObject>
      </g>
    );
  };

  const CustomPieLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry, index) => {
          const IconProps = getCategoryIconAndColor(entry.value);
          const IconComponent = IconProps?.icon || Package;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg">
              <IconComponent weight="duotone" className={`w-3.5 h-3.5 shrink-0 ${IconProps?.color || 'text-muted-foreground'}`} />
              <span className="text-[10px] leading-tight text-foreground font-medium max-w-[120px] break-words whitespace-normal">
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Category counts
  const categoryCounts = {};
  parts.forEach(part => {
    categoryCounts[part.category] = (categoryCounts[part.category] || 0) + 1;
  });

  const categoryBreakdown = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat,
    count
  }));

  // Filtered transactions for the log
  const filteredTransactions = localTransactions.filter(tx => 
    tx.invoiceNumber.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    tx.customerName.toLowerCase().includes(searchInvoice.toLowerCase())
  ).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  // PDF Re-download handled by buildInvoicePdf

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
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <TrendUp weight="duotone" className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-foreground font-display">Revenue Trend</h3>
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

        {/* Top Products Volume (Recharts Horizontal Bar) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ChartBar weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-foreground font-display">Top-Selling Components</h3>
            </div>
            <button onClick={() => setZoomedChart('bar')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full min-h-[320px] h-80 pt-2 flex flex-col">
            {topSellingParts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No products sold yet.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSellingParts}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={<CustomYAxisTick />}
                      width={180}
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#94a3b8', fontSize: 10 }}>
                      {topSellingParts.map((entry, index) => {
                        const color = getHexForTailwindClass(getCategoryIconAndColor(entry.category)?.color);
                        return <Cell key={`cell-${index}`} fill={color || '#94a3b8'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        {/* Categories Distribution (Recharts Donut) */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Stack weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-base font-bold text-foreground font-display">Inventory Catalog Allocation</h3>
            </div>
            <button onClick={() => setZoomedChart('pie')} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all">
              <ArrowsOut weight="duotone" className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full min-h-[320px] h-80">
            {categoryBreakdown.filter(c => c.name !== 'All').length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No categories found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 0, bottom: 20, left: 0 }}>
                  <Pie
                    data={categoryBreakdown.filter(c => c.name !== 'All')}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                    stroke="none"
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {categoryBreakdown.filter(c => c.name !== 'All').map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getHexForTailwindClass(getCategoryIconAndColor(entry.name)?.color)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend content={<CustomPieLegend />} />
                </PieChart>
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
                  {zoomedChart === 'bar' ? (
                    <ChartBar weight="duotone" className="w-6 h-6 text-accent" />
                  ) : (
                    <Stack weight="duotone" className="w-6 h-6 text-brandBlue-400" />
                  )}
                  <h3 className="text-xl font-bold text-foreground font-display">
                    {zoomedChart === 'bar' ? 'Top-Selling Components' : 'Inventory Catalog Allocation'}
                  </h3>
                </div>
                <button onClick={() => setZoomedChart(null)} className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-all">
                  <X weight="bold" className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-background p-8 min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {zoomedChart === 'bar' ? (
                    <BarChart
                      data={topSellingParts}
                      layout="vertical"
                      margin={{ top: 20, right: 60, left: 40, bottom: 20 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false}
                        tick={<CustomYAxisTick />}
                        width={200}
                      />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={40} label={{ position: 'right', fill: '#f8fafc', fontSize: 14, fontWeight: 'bold' }}>
                        {topSellingParts.map((entry, index) => {
                          const color = getHexForTailwindClass(getCategoryIconAndColor(entry.category)?.color);
                          return <Cell key={`cell-${index}`} fill={color || '#94a3b8'} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={categoryBreakdown.filter(c => c.name !== 'All')}
                        cx="50%"
                        cy="50%"
                        innerRadius={130}
                        outerRadius={190}
                        paddingAngle={4}
                        dataKey="count"
                        stroke="none"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: '#94a3b8' }}
                      >
                        {categoryBreakdown.filter(c => c.name !== 'All').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getHexForTailwindClass(getCategoryIconAndColor(entry.name)?.color)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend 
                        content={<CustomPieLegend />}
                      />
                    </PieChart>
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

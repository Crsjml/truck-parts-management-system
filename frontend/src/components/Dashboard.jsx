import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Package, TrendUp, Warning, CurrencyDollar, Clock, ArrowRight, PlusCircle, FileText } from '@phosphor-icons/react';

export default function Dashboard({ parts, transactions, logs, setPage, setSelectedCategory }) {
  const { formatCurrency, formatCompactCurrency, displayCurrency } = useSettings();
  // Calculations
  const totalParts = parts.length;
  const inventoryValue = parts.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockItems = parts.filter(item => item.stock <= item.minStock);
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-accent">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-display">
            System Overview
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
            Welcome to the Tarlac Truck Pitstop Management System. Monitor warehouse inventory levels, log customer transactions, and track sales revenue here.
          </p>
        </div>
        
        {/* Quick actions panel */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <button 
            onClick={() => setPage('pos')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-300 transform hover:scale-[1.03] shadow-lg shadow-accent/20"
          >
            <PlusCircle weight="duotone" className="w-5 h-5" />
            New Transaction
          </button>
          <button 
            onClick={() => {
              setSelectedCategory('All');
              setPage('catalog');
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-secondary hover:bg-muted text-foreground border border-border font-semibold transition-all duration-300"
          >
            <Package weight="duotone" className="w-5 h-5" />
            Manage Inventory
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Catalog Items */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border hover:border-t-brandBlue-400 transition-all duration-300">
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Catalog Parts</span>
            <h3 className="text-3xl font-bold text-foreground font-display truncate">{totalParts}</h3>
            <p className="text-xs text-muted-foreground truncate">Listed components</p>
          </div>
          <div className="shrink-0 p-3 bg-brandBlue-500/10 dark:bg-brandBlue-900/40 text-brandBlue-600 dark:text-brandBlue-400 rounded-xl border border-brandBlue-500/30 dark:border-brandBlue-700/30">
            <Package weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border hover:border-t-emerald-500/30 transition-all duration-300">
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Total Asset Value</span>
            <h3 className="text-2xl xl:text-3xl font-bold tracking-tight text-foreground font-display truncate" title={formatCurrency(inventoryValue)}>
              {formatCompactCurrency(inventoryValue)}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
              <TrendUp weight="duotone" className="w-3.5 h-3.5 shrink-0" /> Stable stock
            </p>
          </div>
          <div className="shrink-0 ml-3 p-3 bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 dark:border-emerald-500/20">
            <CurrencyDollar weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`glass-panel p-5 rounded-2xl flex items-center justify-between border-t transition-all duration-300 ${lowStockItems.length > 0 ? 'border-t-accent/50' : 'border-t-border'}`}>
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Stock Warnings</span>
            <h3 className={`text-3xl font-bold font-display truncate ${lowStockItems.length > 0 ? 'text-red-500 glow-text-red' : 'text-muted-foreground'}`}>
              {lowStockItems.length}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {lowStockItems.length > 0 ? 'Requires action' : 'All well-stocked'}
            </p>
          </div>
          <div className={`shrink-0 ml-3 p-3 rounded-xl border ${lowStockItems.length > 0 ? 'bg-red-950/20 text-red-500 border-red-500/25 animate-pulse' : 'bg-secondary text-muted-foreground border-border'}`}>
            <Warning weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border hover:border-t-amber-500/30 transition-all duration-300">
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Total Invoiced Sales</span>
            <h3 className="text-2xl xl:text-3xl font-bold tracking-tight text-foreground font-display truncate" title={formatCurrency(totalRevenue)}>
              {formatCompactCurrency(totalRevenue)}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{transactions.length} invoices generated</p>
          </div>
          <div className="shrink-0 ml-3 p-3 bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 rounded-xl border border-amber-500/30 dark:border-amber-700/30">
            <FileText weight="duotone" className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Low Stock Items Table */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground font-display">Low-Stock Watchlist</h3>
              <p className="text-xs text-muted-foreground">Warehouse items falling below safety threshold levels.</p>
            </div>
            {lowStockItems.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-500/10 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-500/30 dark:border-red-800/40">
                Action Needed
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No low stock warnings. All inventory looks healthy!
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-muted-foreground text-xs font-semibold uppercase border-b border-border">
                    <th className="py-3 px-2">Part Name</th>
                    <th className="py-3 px-2">SKU</th>
                    <th className="py-3 px-2 text-center">Current</th>
                    <th className="py-3 px-2 text-center">Min Stock</th>
                    <th className="py-3 px-2 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStockItems.slice(0, 5).map((part) => (
                    <tr 
                      key={part.id} 
                      onDoubleClick={() => {
                        setSelectedCategory('All');
                        setPage('catalog');
                        setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: part.sku })), 50);
                      }}
                      className="bg-red-500/5 dark:bg-red-950/20 hover:bg-red-500/10 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                      title="Double-click to restock in Inventory"
                    >
                      <td className="py-3 px-2 font-medium text-foreground max-w-[200px] truncate">{part.name}</td>
                      <td className="py-3 px-2 text-xs font-mono text-muted-foreground">{part.sku}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 dark:bg-red-950 text-red-700 dark:text-red-400 font-bold border border-red-500/30 dark:border-red-900/40">
                          {part.stock}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-muted-foreground">{part.minStock}</td>
                      <td className="py-3 px-2 text-right font-medium text-foreground">{formatCurrency(part.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {lowStockItems.length > 5 && (
            <button 
              onClick={() => {
                setSelectedCategory('All');
                setPage('catalog');
                setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: 'low-stock' })), 50);
              }}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/10 rounded-lg transition-colors"
            >
              View all {lowStockItems.length} warnings
              <ArrowRight weight="duotone" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: System Logs / Activity Stream */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Clock weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-lg font-bold text-foreground font-display">Recent Activities</h3>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {(() => {
                const combinedLogs = [
                  ...logs,
                  ...transactions.map(tx => ({
                    id: `tx-${tx.id}`,
                    timestamp: tx.transactionDate || tx.createdAt,
                    type: 'sale',
                    message: `Sale completed for ${tx.customerName || 'Walk-in'} (${formatCurrency(tx.total)})`
                  }))
                ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

                if (combinedLogs.length === 0) {
                  return <div className="text-sm text-muted-foreground py-4 text-center">No recent activities found.</div>;
                }

                return combinedLogs.map((log) => {
                  let badgeColor = "bg-secondary text-muted-foreground border-border";
                  if (log.type === "sale") badgeColor = "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-800/35";
                  if (log.type === "stock") badgeColor = "bg-brandBlue-500/10 dark:bg-brandBlue-900/40 text-brandBlue-600 dark:text-brandBlue-400 border-brandBlue-500/30 dark:border-brandBlue-700/30";
                  if (log.type === "system") badgeColor = "bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 dark:border-indigo-800/35";

                  return (
                    <div key={log.id} className="flex gap-3 text-xs leading-relaxed group">
                      <span className={`px-2 py-0.5 rounded border self-start shrink-0 capitalize ${badgeColor}`}>
                        {log.type}
                      </span>
                      <div className="space-y-1">
                        <p className="text-muted-foreground group-hover:text-foreground transition-colors">{log.message}</p>
                        <span className="text-2xs text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          <div className="pt-2 border-t border-border">
            <div className="p-3 bg-secondary rounded-xl border border-border text-muted-foreground text-xs">
              <span className="font-bold text-muted-foreground">Quick Tip:</span> Use the <span className="font-mono text-muted-foreground">New Transaction</span> panel to generate and download customer PDF sales invoices instantly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Package, TrendUp, TrendDown, Warning, CurrencyDollar, Clock, ArrowRight, PlusCircle, FileText, CheckCircle } from '@phosphor-icons/react';
import { resolvePeriod, inRange, computeKpis } from '../utils/salesAnalytics';

export default function Dashboard({ parts, transactions, logs, setPage, setSelectedCategory }) {
  const { formatCurrency, formatCompactCurrency, displayCurrency } = useSettings();
  // Calculations
  const totalParts = parts.length;
  const inventoryValue = parts.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const lowStockItems = parts
    .filter(item => item.stock <= item.minStock)
    .map(item => ({
      ...item,
      deficit: item.minStock - item.stock,
      severity: item.stock === 0 ? 'critical' : 'warning'
    }))
    .sort((a, b) => b.deficit - a.deficit);
  const hasCriticalStock = lowStockItems.some(item => item.severity === 'critical');
  const criticalCount = lowStockItems.filter(item => item.severity === 'critical').length;
  const warningCount = lowStockItems.filter(item => item.severity === 'warning').length;

  const salesKpis = useMemo(() => {
    const range = resolvePeriod('7d');
    const current = inRange(transactions, range.start, range.end);
    const previous = inRange(transactions, range.prevStart, range.prevEnd);
    return computeKpis(current, previous);
  }, [transactions]);

  const updatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-display">
            System Overview
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
            {lowStockItems.length > 0
              ? `${criticalCount} critical · ${warningCount} low stock · updated ${updatedTime}`
              : `All systems healthy · updated ${updatedTime}`}
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedCategory('All');
            setPage('catalog');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedCategory('All');
              setPage('catalog');
            }
          }}
          className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="space-y-2 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Catalog Parts</span>
            <h3 className="text-3xl font-bold text-foreground font-display truncate">{totalParts}</h3>
            <p className="text-xs text-muted-foreground truncate">Listed components</p>
          </div>
          <div className="shrink-0 p-3 bg-secondary text-muted-foreground rounded-xl border border-border">
            <Package weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border">
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Total Asset Value</span>
            <h3 className="text-2xl xl:text-3xl font-bold tracking-tight text-foreground font-display truncate" title={formatCurrency(inventoryValue)}>
              {formatCompactCurrency(inventoryValue)}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Current snapshot
            </p>
          </div>
          <div className="shrink-0 ml-3 p-3 bg-secondary text-muted-foreground rounded-xl border border-border">
            <CurrencyDollar weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setSelectedCategory('All');
            setPage('catalog');
            setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: 'low-stock' })), 50);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedCategory('All');
              setPage('catalog');
              setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: 'low-stock' })), 50);
            }
          }}
          className={`glass-panel p-5 rounded-2xl flex items-center justify-between border-t transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${lowStockItems.length > 0 ? (hasCriticalStock ? 'border-t-destructive/50' : 'border-t-accent/50') : 'border-t-border'}`}
        >
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Stock Warnings</span>
            <h3 className={`text-3xl font-bold font-display truncate ${lowStockItems.length > 0 ? (hasCriticalStock ? 'text-destructive' : 'text-accent') : 'text-muted-foreground'}`}>
              {lowStockItems.length}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {lowStockItems.length > 0 ? 'Requires action' : 'All well-stocked'}
            </p>
          </div>
          <div className={`shrink-0 ml-3 p-3 rounded-xl border ${lowStockItems.length > 0 ? (hasCriticalStock ? 'bg-destructive/10 text-destructive border-destructive/25' : 'bg-accent/10 text-accent border-accent/25') : 'bg-secondary text-muted-foreground border-border'}`}>
            <Warning weight="duotone" className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-border">
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block truncate">Total Invoiced Sales</span>
            <h3 className="text-2xl xl:text-3xl font-bold tracking-tight text-foreground font-display truncate" title={formatCurrency(salesKpis.revenue)}>
              {formatCompactCurrency(salesKpis.revenue)}
            </h3>
            <p className="text-xs truncate">
              {salesKpis.deltas.revenue !== null ? (
                salesKpis.deltas.revenue > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendUp weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                    +{salesKpis.deltas.revenue.toFixed(1)}% vs prev 7d
                  </span>
                ) : salesKpis.deltas.revenue < 0 ? (
                  <span className="text-destructive flex items-center gap-1">
                    <TrendDown weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                    {salesKpis.deltas.revenue.toFixed(1)}% vs prev 7d
                  </span>
                ) : (
                  <span className="text-muted-foreground">0.0% vs prev 7d</span>
                )
              ) : (
                <span className="text-muted-foreground">New (last 7d)</span>
              )}
            </p>
          </div>
          <div className="shrink-0 ml-3 p-3 bg-secondary text-muted-foreground rounded-xl border border-border">
            <FileText weight="duotone" className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist Table */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground font-display">Low-Stock Watchlist</h3>
              <p className="text-xs text-muted-foreground">Warehouse items falling below safety threshold levels.</p>
            </div>
            {lowStockItems.length > 0 && (
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${hasCriticalStock ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                Action Needed
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {lowStockItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                  <CheckCircle weight="duotone" className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-foreground">Stable stock</p>
                <p className="text-xs text-muted-foreground max-w-[250px]">No low stock warnings. All warehouse inventory levels are healthy.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-muted-foreground text-xs font-semibold uppercase border-b border-border">
                    <th className="py-3 px-2">Part</th>
                    <th className="py-3 px-2 text-right">Deficit</th>
                    <th className="py-3 px-2 text-center">Stock</th>
                    <th className="py-3 px-2 text-center">Min</th>
                    <th className="py-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowStockItems.slice(0, 5).map((part) => {
                    const isCritical = part.severity === 'critical';
                    const rowBg = isCritical ? 'bg-destructive/5 dark:bg-destructive/10' : 'bg-accent/5 dark:bg-accent/10';
                    const badgeBg = isCritical ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-accent/10 text-accent border-accent/20';
                    const deficitColor = isCritical ? 'text-destructive' : 'text-accent';
                    
                    return (
                      <tr key={part.id} className={`${rowBg} transition-colors`}>
                        <td className="py-3 px-2">
                          <div className="font-medium text-foreground max-w-[250px] truncate">{part.name}</div>
                          <div className="text-xs font-mono text-muted-foreground mt-0.5">{part.sku}</div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`text-lg font-bold font-display ${deficitColor}`}>-{part.deficit}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2.5 py-0.5 rounded-md font-bold border ${badgeBg}`}>
                            {part.stock}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{part.minStock}</td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => {
                              setSelectedCategory('All');
                              setPage('catalog');
                              setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: part.sku })), 50);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary hover:bg-muted text-foreground border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            Restock <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
              className={`w-full flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg transition-colors ${hasCriticalStock ? 'text-destructive hover:bg-destructive/10' : 'text-accent hover:bg-accent/10'}`}
            >
              View all {lowStockItems.length} warnings
              <ArrowRight weight="duotone" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* System Logs / Activity Stream */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-3 flex flex-col justify-between space-y-4">
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

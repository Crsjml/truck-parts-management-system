import React from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  FileText,
  Boxes
} from 'lucide-react';

export default function Dashboard({ parts, transactions, logs, setPage, setSelectedCategory }) {
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
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-outfit">
            System Overview
          </h1>
          <p className="text-slate-400 max-w-xl text-sm md:text-base leading-relaxed">
            Welcome to the Tarlac Truck Parts Management System. Monitor warehouse inventory levels, log customer transactions, and track sales revenue here.
          </p>
        </div>
        
        {/* Quick actions panel */}
        <div className="flex flex-wrap gap-3 shrink-0">
          <button 
            onClick={() => setPage('pos')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold transition-all duration-300 transform hover:scale-[1.03] shadow-lg shadow-accent/20"
          >
            <PlusCircle className="w-5 h-5" />
            New Transaction
          </button>
          <button 
            onClick={() => {
              setSelectedCategory('All');
              setPage('catalog');
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-all duration-300"
          >
            <Package className="w-5 h-5" />
            Manage Inventory
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Catalog Items */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-brandBlue-400 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Catalog Parts</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">{totalParts}</h3>
            <p className="text-xs text-slate-500">Listed components</p>
          </div>
          <div className="p-3 bg-brandBlue-900/40 text-brandBlue-400 rounded-xl border border-brandBlue-700/30">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-emerald-500/30 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Asset Value</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">
              ₱{inventoryValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Stable stock value
            </p>
          </div>
          <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`glass-panel p-5 rounded-2xl flex items-center justify-between border-t transition-all duration-300 ${lowStockItems.length > 0 ? 'border-t-accent/50' : 'border-t-white/10'}`}>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock Warnings</span>
            <h3 className={`text-3xl font-extrabold font-outfit ${lowStockItems.length > 0 ? 'text-red-500 glow-text-red' : 'text-slate-300'}`}>
              {lowStockItems.length}
            </h3>
            <p className="text-xs text-slate-500">
              {lowStockItems.length > 0 ? 'Requires immediate action' : 'All items well-stocked'}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${lowStockItems.length > 0 ? 'bg-red-950/20 text-red-500 border-red-500/25 animate-pulse' : 'bg-slate-800 text-slate-500 border-slate-700/50'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-t border-t-white/10 hover:border-t-amber-500/30 transition-all duration-300">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoiced Sales</span>
            <h3 className="text-3xl font-extrabold text-white font-outfit">
              ₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500">{transactions.length} invoices generated</p>
          </div>
          <div className="p-3 bg-amber-950/40 text-amber-500 rounded-xl border border-amber-700/30">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Low Stock Items Table */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-outfit">Low-Stock Watchlist</h3>
              <p className="text-xs text-slate-400">Warehouse items falling below safety threshold levels.</p>
            </div>
            {lowStockItems.length > 0 && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-950 text-red-400 border border-red-800/40">
                Action Needed
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No low stock warnings. All inventory looks healthy!
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-slate-400 text-xs font-semibold uppercase border-b border-slate-800/80">
                    <th className="py-3 px-2">Part Name</th>
                    <th className="py-3 px-2">SKU</th>
                    <th className="py-3 px-2 text-center">Current</th>
                    <th className="py-3 px-2 text-center">Min Stock</th>
                    <th className="py-3 px-2 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lowStockItems.slice(0, 5).map((part) => (
                    <tr key={part.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-2 font-medium text-slate-200 max-w-[200px] truncate">{part.name}</td>
                      <td className="py-3 px-2 text-xs font-mono text-slate-400">{part.sku}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-500 font-bold border border-red-900/30">
                          {part.stock}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400">{part.minStock}</td>
                      <td className="py-3 px-2 text-right font-medium text-slate-200">₱{part.price.toLocaleString('en-PH')}</td>
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
              }}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/10 rounded-lg transition-colors"
            >
              View all {lowStockItems.length} warnings
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Side: System Logs / Activity Stream */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Clock className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-lg font-bold text-white font-outfit">Recent Activities</h3>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {logs.map((log) => {
                let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
                if (log.type === "sale") badgeColor = "bg-emerald-950/40 text-emerald-400 border-emerald-800/35";
                if (log.type === "stock") badgeColor = "bg-brandBlue-900/40 text-brandBlue-400 border-brandBlue-700/30";
                if (log.type === "system") badgeColor = "bg-indigo-950/40 text-indigo-400 border-indigo-800/35";

                return (
                  <div key={log.id} className="flex gap-3 text-xs leading-relaxed group">
                    <span className={`px-2 py-0.5 rounded border self-start shrink-0 capitalize ${badgeColor}`}>
                      {log.type}
                    </span>
                    <div className="space-y-1">
                      <p className="text-slate-300 group-hover:text-white transition-colors">{log.message}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-800">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-slate-400 text-xs">
              <span className="font-bold text-slate-300">Quick Tip:</span> Use the <span className="font-mono text-slate-300">New Transaction</span> panel to generate and download customer PDF sales invoices instantly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

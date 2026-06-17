import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Bell, 
  User2,
  CalendarDays,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

// Components
import Logo from './components/Logo';
import Dashboard from './components/Dashboard';
import PartsCatalog from './components/PartsCatalog';
import TransactionPOS from './components/TransactionPOS';
import Analytics from './components/Analytics';

// Initial Data
import { 
  INITIAL_PARTS, 
  INITIAL_CATEGORIES, 
  INITIAL_TRANSACTIONS, 
  INITIAL_LOGS 
} from './mockData';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [parts, setParts] = useState(INITIAL_PARTS);
  const [categories] = useState(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  
  // Mobile responsive sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to add activity logs
  const addLog = (type, message) => {
    const newLog = {
      id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // State manipulation handlers
  const handleAddPart = (partData) => {
    const newPart = {
      id: (parts.length + 1).toString(),
      ...partData
    };
    setParts(prev => [...prev, newPart]);
    addLog('stock', `New part catalog item '${newPart.name}' added with SKU: ${newPart.sku}.`);
  };

  const handleEditPart = (id, updatedData) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
    addLog('stock', `Part item (ID: ${id}) SKU '${updatedData.sku}' details updated.`);
  };

  const handleDeletePart = (id) => {
    const part = parts.find(p => p.id === id);
    setParts(prev => prev.filter(p => p.id !== id));
    addLog('stock', `Part item '${part ? part.name : id}' removed from catalog.`);
  };

  const handleRestockPart = (id, quantity) => {
    setParts(prev => prev.map(p => {
      if (p.id === id) {
        const newStock = p.stock + quantity;
        addLog('stock', `Restocked '${p.name}': added ${quantity} units (current stock: ${newStock}).`);
        return { ...p, stock: newStock };
      }
      return p;
    }));
  };

  const handleCheckout = (txData) => {
    // 1. Log transaction
    setTransactions(prev => [txData, ...prev]);
    
    // 2. Reduce part inventory counts
    setParts(prev => prev.map(p => {
      const purchasedItem = txData.items.find(item => item.partId === p.id);
      if (purchasedItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - purchasedItem.quantity)
        };
      }
      return p;
    }));

    // 3. Log activity
    addLog('sale', `Sale transaction completed: Invoice ${txData.invoiceNumber} processed for ${txData.customerName}.`);
  };

  // Check low stock count for notifications indicator
  const lowStockCount = parts.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="h-full flex overflow-hidden bg-slate-950 font-sans">
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 glass-panel border-r border-slate-900/60 p-5 justify-between">
        <div className="space-y-8">
          <div className="flex items-center px-2 py-4">
            <Logo className="w-14 h-14" showText={true} />
          </div>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setPage('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'dashboard' 
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5' 
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard Overview
            </button>

            <button 
              onClick={() => setPage('catalog')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'catalog' 
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5' 
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <Package className="w-5 h-5" />
              Parts Inventory
            </button>

            <button 
              onClick={() => setPage('pos')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'pos' 
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5' 
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              Sales POS Entry
            </button>

            <button 
              onClick={() => setPage('analytics')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'analytics' 
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5' 
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-l-4 border-transparent'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Sales Analytics
            </button>
          </nav>
        </div>

        {/* User context footer */}
        <div className="pt-4 border-t border-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 text-sm font-bold shadow-inner">
              <User2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-200">Cris Dela Cruz</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">System Admin</span>
            </div>
          </div>
          <div className="p-1.5 bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 rounded-lg" title="Active Connection secure">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>
      </aside>

      {/* Sidebar Navigation - Mobile Toggle Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-sm">
          <aside className="w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between animate-slideRight">
            <div className="space-y-8">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <Logo className="w-12 h-12" showText={true} />
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="space-y-1">
                <button 
                  onClick={() => { setPage('dashboard'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'dashboard' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard Overview
                </button>
                <button 
                  onClick={() => { setPage('catalog'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'catalog' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Parts Inventory
                </button>
                <button 
                  onClick={() => { setPage('pos'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'pos' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Sales POS Entry
                </button>
                <button 
                  onClick={() => { setPage('analytics'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'analytics' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Sales Analytics
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold">
                  <User2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200">Cris Dela Cruz</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">System Admin</span>
                </div>
              </div>
              <div className="p-1 px-2 bg-emerald-950 text-emerald-400 text-[10px] rounded border border-emerald-800/30">
                Secure
              </div>
            </div>
          </aside>
          
          {/* Close tap area */}
          <div className="flex-1" onClick={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* Main View Area Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-16 shrink-0 glass-panel border-b border-slate-900/60 px-6 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Live active date info */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900/50">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications/Alerts Bell */}
            <button 
              onClick={() => {
                setSelectedCategory('All');
                setPage('catalog');
              }}
              className="relative p-2 hover:bg-slate-900/60 rounded-xl border border-slate-900/60 text-slate-400 hover:text-slate-100 transition-all group"
            >
              <Bell className="w-4.5 h-4.5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-[9px] font-extrabold text-white rounded-full flex items-center justify-center animate-bounce shadow-md shadow-accent/35">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* Connection badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-slate-400 text-[10px]">TTP-SERVER: ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Scroll viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {page === 'dashboard' && (
            <Dashboard 
              parts={parts} 
              transactions={transactions} 
              logs={logs} 
              setPage={setPage}
              setSelectedCategory={setSelectedCategory}
            />
          )}

          {page === 'catalog' && (
            <PartsCatalog 
              parts={parts} 
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddPart={handleAddPart}
              onEditPart={handleEditPart}
              onDeletePart={handleDeletePart}
              onRestockPart={handleRestockPart}
            />
          )}

          {page === 'pos' && (
            <TransactionPOS 
              parts={parts} 
              onCheckout={handleCheckout} 
            />
          )}

          {page === 'analytics' && (
            <Analytics 
              parts={parts} 
              transactions={transactions} 
            />
          )}
        </main>
      </div>

    </div>
  );
}

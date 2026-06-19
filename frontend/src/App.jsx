import React, { useEffect, useState } from 'react';
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

import Logo from './components/Logo';
import Dashboard from './components/Dashboard';
import PartsCatalog from './components/PartsCatalog';
import TransactionPOS from './components/TransactionPOS';
import Analytics from './components/Analytics';
import AuthPortal from './components/AuthPortal';
import CustomerStorefront from './components/CustomerStorefront';
import CustomerDashboard from './components/CustomerDashboard';
import StatusBar from './components/StatusBar';

import {
  INITIAL_TRANSACTIONS,
  INITIAL_LOGS
} from './mockData';
import { clearSession, getActiveSession, fetchParts, fetchCategories } from './authStore';

export default function App() {
  const [activeView, setActiveView] = useState('storefront');
  const [authReady, setAuthReady] = useState(false);
  const [customerSession, setCustomerSession] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [authTab, setAuthTab] = useState('login');
  const [page, setPage] = useState('dashboard');
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const session = getActiveSession();

    if (session?.user?.role === 'admin') {
      setAdminSession(session);
      setCustomerSession(null);
      setActiveView('admin-app');
    } else {
      // Always start on the storefront for customers (even if session exists).
      // The session is available so the storefront can show them as logged in,
      // but they are NOT auto-redirected into the dashboard on page load.
      if (session?.user?.role === 'customer') {
        setCustomerSession(session);
      }
      setAdminSession(null);
      setActiveView('storefront');
    }

    const loadData = async () => {
      const fetchedParts = await fetchParts();
      const fetchedCategories = await fetchCategories();
      setParts(fetchedParts);
      setCategories(fetchedCategories);
      setAuthReady(true);
    };

    loadData();
  }, []);

  const addLog = (type, message) => {
    const newLog = {
      id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleAddPart = (partData) => {
    const newPart = {
      id: (parts.length + 1).toString(),
      ...partData
    };
    setParts((prev) => [...prev, newPart]);
    addLog('stock', `New part catalog item '${newPart.name}' added with SKU: ${newPart.sku}.`);
  };

  const handleEditPart = (id, updatedData) => {
    setParts((prev) => prev.map((part) => (part.id === id ? { ...part, ...updatedData } : part)));
    addLog('stock', `Part item (ID: ${id}) SKU '${updatedData.sku}' details updated.`);
  };

  const handleDeletePart = (id) => {
    const part = parts.find((item) => item.id === id);
    setParts((prev) => prev.filter((item) => item.id !== id));
    addLog('stock', `Part item '${part ? part.name : id}' removed from catalog.`);
  };

  const handleRestockPart = (id, quantity) => {
    setParts((prev) =>
      prev.map((part) => {
        if (part.id === id) {
          const newStock = part.stock + quantity;
          addLog('stock', `Restocked '${part.name}': added ${quantity} units (current stock: ${newStock}).`);
          return { ...part, stock: newStock };
        }

        return part;
      })
    );
  };

  const handleCheckout = (txData) => {
    setTransactions((prev) => [txData, ...prev]);

    setParts((prev) =>
      prev.map((part) => {
        const purchasedItem = txData.items.find((item) => item.partId === part.id);
        if (purchasedItem) {
          return {
            ...part,
            stock: Math.max(0, part.stock - purchasedItem.quantity)
          };
        }

        return part;
      })
    );

    addLog('sale', `Sale transaction completed: Invoice ${txData.invoiceNumber} processed for ${txData.customerName}.`);
  };

  const handleCustomerAuthenticated = (session) => {
  setCustomerSession(session);
  setAdminSession(null);
  setActiveView('customer-dashboard');
};

  const handleAdminAuthenticated = (session) => {
    setAdminSession(session);
    setCustomerSession(null);
    setActiveView('admin-app');
    setPage('dashboard');
  };

  const handleOpenCustomerAuth = (initialTab = 'login') => {
    setAuthTab(initialTab);
    setActiveView('customer-auth');
  };

  const handleOpenAdminAuth = () => {
    setAuthTab('login');
    setActiveView('admin-auth');
  };

  const handleLogout = (role) => {
    clearSession(role);

    if (role === 'admin') {
      setAdminSession(null);
      setPage('dashboard');
      setActiveView('storefront');
      return;
    }

    setCustomerSession(null);
    setActiveView('storefront');
  };

  const lowStockCount = parts.filter((part) => part.stock <= part.minStock).length;

  if (!authReady) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
          Loading storefront...
        </div>
        <StatusBar />
      </>
    );
  }

  if (activeView === 'customer-auth') {
    return (
      <>
        <AuthPortal
          mode="customer"
          initialTab={authTab}
          onBackToStore={() => setActiveView('storefront')}
          onCustomerAuthenticated={handleCustomerAuthenticated}
          onAdminAuthenticated={handleAdminAuthenticated}
        />
        <StatusBar />
      </>
    );
  }

  if (activeView === 'admin-auth') {
    return (
      <>
        <AuthPortal
          mode="admin"
          initialTab="login"
          onBackToStore={() => setActiveView('storefront')}
          onCustomerAuthenticated={handleCustomerAuthenticated}
          onAdminAuthenticated={handleAdminAuthenticated}
        />
        <StatusBar />
      </>
    );
  }


  if (activeView === 'customer-dashboard') {
    return (
      <>
        <CustomerDashboard
          customerName={customerSession?.user?.fullName || ''}
          customerContact={customerSession?.user?.contactNumber || ''}
          transactions={transactions}
          parts={parts}
          onAddLog={addLog}
          onCheckout={handleCheckout}
          onLogout={() => handleLogout('customer')}
        />
        <StatusBar />
      </>
    );
  }


  if (activeView === 'storefront') {
    return (
      <>
        <CustomerStorefront
          parts={parts}
          categories={categories}
          customerSession={customerSession}
          onOpenCustomerAuth={handleOpenCustomerAuth}
          onOpenAdminAuth={handleOpenAdminAuth}
          onLogoutCustomer={() => handleLogout('customer')}
        />
        <StatusBar />
      </>
    );
  }


  return (
    <div className="h-full flex overflow-hidden bg-slate-950 font-sans">
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

        <div className="pt-4 border-t border-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 text-sm font-bold shadow-inner">
              <User2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-200">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">System Admin</span>
            </div>
          </div>
          <div className="p-1.5 bg-emerald-950/30 border border-emerald-800/30 text-emerald-400 rounded-lg" title="Active Connection secure">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        </div>
      </aside>

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
                  onClick={() => {
                    setPage('dashboard');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'dashboard' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard Overview
                </button>
                <button
                  onClick={() => {
                    setPage('catalog');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'catalog' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  Parts Inventory
                </button>
                <button
                  onClick={() => {
                    setPage('pos');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'pos' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-slate-400'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Sales POS Entry
                </button>
                <button
                  onClick={() => {
                    setPage('analytics');
                    setIsSidebarOpen(false);
                  }}
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
                  <span className="text-xs font-bold text-slate-200">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">System Admin</span>
                </div>
              </div>
              <div className="p-1 px-2 bg-emerald-950 text-emerald-400 text-[10px] rounded border border-emerald-800/30">Secure</div>
            </div>
          </aside>

          <div className="flex-1" onClick={() => setIsSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 glass-panel border-b border-slate-900/60 px-6 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-900/50">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-slate-400 text-[10px]">TTP-SERVER: ACTIVE</span>
            </div>
            <button
              onClick={() => handleLogout('admin')}
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/60 hover:text-white"
            >
              Logout
            </button>
          </div>
        </header>

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

          {page === 'pos' && <TransactionPOS parts={parts} onCheckout={handleCheckout} />}

          {page === 'analytics' && <Analytics parts={parts} transactions={transactions} />}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

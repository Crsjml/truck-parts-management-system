import React, { useEffect, useState } from 'react';
import { SquaresFour, Package, ShoppingCart, ChartBar, Bell, User, CalendarBlank, ShieldCheck, List, X, Moon, Sun, EnvelopeOpen, CheckCircle, Tag, Buildings } from '@phosphor-icons/react';

import Logo from './components/Logo';
import Dashboard from './components/Dashboard';
import PartsCatalog from './components/PartsCatalog';
import TransactionPOS from './components/TransactionPOS';
import Analytics from './components/Analytics';
import AuthPortal from './components/AuthPortal';
import CustomerStorefront from './components/CustomerStorefront';
import CustomerDashboard from './components/CustomerDashboard';
import StatusBar from './components/StatusBar';
import Footer from './components/Footer';
import VerificationSimulator from './components/VerificationSimulator';
import CategoryManagement from './components/CategoryManagement';
import PurchasingModule from './components/PurchasingModule';
import FloatingSettingsWidget from './components/FloatingSettingsWidget';

import {
  INITIAL_TRANSACTIONS,
  INITIAL_LOGS
} from './mockData';
import { fetchParts, fetchCategories, createPart, updatePart, deletePart, deleteCategory, createTransaction, fetchTransactions } from './authStore';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [activeView, setActiveView] = useState('storefront');
  const [page, setPage] = useState('dashboard');
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return false; // Default to light mode
    }
    return false;
  });

  const [initialNotice, setInitialNotice] = useState('');

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Enforce email verification (unless it's a seed test user or admin bypass if needed)
        // For security, if they aren't verified, we don't log them in.
        if (!currentUser.emailVerified && !currentUser.email?.includes('admin') && !currentUser.email?.includes('lakers.com') && !currentUser.email?.includes('warriors.com') && !currentUser.email?.includes('suns.com') && !currentUser.email?.includes('bucks.com') && !currentUser.email?.includes('mavericks.com')) {
          // We don't call signOut() here directly to avoid infinite loops in some edge cases,
          // but we just treat them as NOT signed in for the app state.
          setFirebaseUser(null);
          setIsSignedIn(false);
          setIsLoaded(true);
          return;
        }

        setFirebaseUser(currentUser);
        setIsSignedIn(true);
        // Automatically set view based on role
        const email = currentUser.email || '';
        const role = email.includes('admin') || email.includes('tarlac') ? 'admin' : 'customer';
        if (role === 'admin') setActiveView('admin-app');
        else setActiveView('storefront');
      } else {
        setFirebaseUser(null);
        setIsSignedIn(false);
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Derive roles from Firebase user
  const role = firebaseUser?.email?.includes('admin') || firebaseUser?.email?.includes('tarlac') ? 'admin' : 'customer';
  
  const customerSession = isSignedIn && role === 'customer' ? {
    user: { fullName: firebaseUser.displayName || firebaseUser.email, role: 'customer' }
  } : null;

  const adminSession = isSignedIn && role === 'admin' ? {
    user: { fullName: firebaseUser.displayName || firebaseUser.email, role: 'admin' }
  } : null;

  useEffect(() => {
    
    const loadData = async () => {
      const fetchedParts = await fetchParts();
      const fetchedCategories = await fetchCategories();
      setParts(fetchedParts);
      setCategories(fetchedCategories);
    };

    loadData();
  }, [isLoaded, isSignedIn]);

  const addLog = (type, message) => {
    const newLog = {
      id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleAddPart = async (partData) => {
    const result = await createPart(partData);
    if (result.ok) {
      setParts((prev) => [...prev, result.part]);
      addLog('stock', `New part catalog item '${result.part.name}' added with SKU: ${result.part.sku}.`);
    } else {
      alert(`Error adding part: ${result.error}`);
    }
  };

  const handleEditPart = async (id, updatedData) => {
    const result = await updatePart(id, updatedData);
    if (result.ok) {
      setParts((prev) => prev.map((part) => (part.id === id ? result.part : part)));
      addLog('stock', `Part item (ID: ${id}) SKU '${result.part.sku}' details updated.`);
    } else {
      alert(`Error updating part: ${result.error}`);
    }
  };

  const handleDeletePart = async (id) => {
    const part = parts.find((item) => item.id === id);
    const result = await deletePart(id);
    if (result.ok) {
      setParts((prev) => prev.filter((item) => item.id !== id));
      addLog('stock', `Part item '${part ? part.name : id}' removed from catalog.`);
    } else {
      alert(`Error deleting part: ${result.error}`);
    }
  };

  const handleRestockPart = async (id, quantity) => {
    const part = parts.find(p => p.id === id);
    if (!part) return;

    const newStock = part.stock + quantity;
    // Optimistic UI update
    setParts((prev) => prev.map((p) => p.id === id ? { ...p, stock: newStock } : p));
    
    // Backend sync
    const res = await updatePart(id, { stock: newStock });
    if (res.ok) {
      addLog('stock', `Restocked '${part.name}': added ${quantity} units (current stock: ${newStock}).`);
    } else {
      addLog('system', `Error restocking: ${res.error}`);
      alert(`Restock failed: ${res.error}`);
      // Revert optimistic update
      const updatedParts = await fetchParts();
      setParts(updatedParts);
    }
  };

  const handleCheckout = async (txData) => {
    // Optimistic UI update
    setTransactions((prev) => [txData, ...prev]);

    // Backend sync
    const res = await createTransaction(txData);
    if (res.ok) {
      addLog('sales', `Processed sale: ${txData.invoiceNumber} for ${txData.total}.`);
      // Re-sync all parts from backend to ensure accurate stock
      const updatedParts = await fetchParts();
      setParts(updatedParts);
    } else {
      addLog('system', `Error processing sale: ${res.error}`);
      alert(`Transaction failed: ${res.error}`);
    }
  };

  const handleLogout = async (role) => {
    await signOut(auth);
    setActiveView('storefront');
  };

  const handleOpenCustomerAuth = () => setActiveView('customer-auth');
  const handleOpenAdminAuth = () => setActiveView('admin-auth');
  const handleAutoCustomerLogin = () => setActiveView('customer-auth');
  const handleAutoAdminLogin = () => setActiveView('admin-auth');

  const lowStockCount = parts.filter((part) => part.stock <= part.minStock).length;

  if (!isLoaded) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
          Loading storefront...
        </div>
        <StatusBar />
      </>
    );
  }

  if (activeView === 'customer-auth' || activeView === 'admin-auth' || activeView === 'signup') {
    return (
      <>
        <AuthPortal
          mode={activeView === 'admin-auth' ? 'admin' : 'customer'}
          initialTab={activeView === 'signup' ? 'register' : 'login'}
          onBackToStore={() => setActiveView('storefront')}
        />
        <FloatingSettingsWidget 
          onAdminLogin={handleAutoAdminLogin}
          onCustomerLogin={handleAutoCustomerLogin}
          onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
          isLoggedIn={!!adminSession || !!customerSession}
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
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleAutoCustomerLogin}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
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
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleAutoCustomerLogin}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
        <StatusBar />
      </>
    );
  }


  return (
    <div className={`h-full flex overflow-hidden bg-background text-foreground font-sans transition-colors duration-300 ${import.meta.env.DEV ? 'pb-8' : ''}`}>
      <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 glass-panel border-r border-border justify-between overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
          <div className="flex items-center px-2 py-4">
            <Logo className="w-14 h-14" showText={true} />
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setPage('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'dashboard'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <SquaresFour weight="duotone" className="w-5 h-5" />
              Dashboard Overview
            </button>

            <button
              onClick={() => setPage('catalog')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'catalog'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <Package weight="duotone" className="w-5 h-5" />
              Parts Inventory
            </button>

            <button
              onClick={() => setPage('pos')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'pos'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <ShoppingCart weight="duotone" className="w-5 h-5" />
              Sales POS Entry
            </button>

            <button
              onClick={() => setPage('analytics')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'analytics'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <ChartBar weight="duotone" className="w-5 h-5" />
              Sales Analytics
            </button>

            <button
              onClick={() => setPage('categories')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'categories'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <Tag weight="duotone" className="w-5 h-5" />
              Category Management
            </button>

            <button
              onClick={() => setPage('purchasing')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                page === 'purchasing'
                  ? 'bg-accent/15 text-accent border-l-4 border-accent shadow-md shadow-accent/5'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border-l-4 border-transparent'
              }`}
            >
              <Buildings weight="duotone" className="w-5 h-5" />
              Purchasing
            </button>
          </nav>
        </div>

        <div className="shrink-0 p-5 pt-4 border-t border-border flex items-center justify-between bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shadow-inner">
              <User weight="duotone" className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-foreground">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">System Admin</span>
            </div>
          </div>
          <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-lg" title="Active Connection secure">
            <ShieldCheck weight="duotone" className="w-4.5 h-4.5" />
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
          <aside className="w-72 bg-background border-r border-border flex flex-col justify-between overflow-hidden animate-slideRight">
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <Logo className="w-12 h-12" showText={true} />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                >
                  <X weight="duotone" className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setPage('dashboard');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'dashboard' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <SquaresFour weight="duotone" className="w-5 h-5" />
                  Dashboard Overview
                </button>
                <button
                  onClick={() => {
                    setPage('catalog');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'catalog' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Package weight="duotone" className="w-5 h-5" />
                  Parts Inventory
                </button>
                <button
                  onClick={() => {
                    setPage('pos');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'pos' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <ShoppingCart weight="duotone" className="w-5 h-5" />
                  Sales POS Entry
                </button>
                <button
                  onClick={() => {
                    setPage('analytics');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'analytics' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <ChartBar weight="duotone" className="w-5 h-5" />
                  Sales Analytics
                </button>
                <button
                  onClick={() => {
                    setPage('categories');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'categories' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Tag weight="duotone" className="w-5 h-5" />
                  Category Management
                </button>
                <button
                  onClick={() => {
                    setPage('purchasing');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'purchasing' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Buildings weight="duotone" className="w-5 h-5" />
                  Purchasing
                </button>
              </nav>
            </div>

            <div className="shrink-0 p-5 pt-4 border-t border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground text-xs font-bold">
                  <User weight="duotone" className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold">System Admin</span>
                </div>
              </div>
              <div className="p-1 px-2 bg-emerald-500/10 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] rounded border border-emerald-500/30 dark:border-emerald-800/30">Secure</div>
            </div>
          </aside>

          <div className="flex-1" onClick={() => setIsSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 glass-panel border-b border-border px-6 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 bg-secondary border border-border hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <List weight="duotone" className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-semibold bg-secondary px-3 py-1.5 rounded-lg border border-border">
              <CalendarBlank weight="duotone" className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedCategory('All');
                setPage('catalog');
              }}
              className="relative p-2 hover:bg-secondary rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all group"
            >
              <Bell weight="duotone" className="w-4.5 h-4.5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-[9px] font-extrabold text-white rounded-full flex items-center justify-center animate-bounce shadow-md shadow-accent/35">
                  {lowStockCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-muted-foreground text-[10px]">TTP-SERVER: ACTIVE</span>
            </div>
            
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun weight="duotone" className="w-4 h-4" /> : <Moon weight="duotone" className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleLogout('admin')}
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-y-auto px-6 pt-6 pb-2 md:px-8 md:pt-8 md:pb-2">
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
          {page === 'categories' && <CategoryManagement onAddLog={addLog} />}
          {page === 'purchasing' && (
            <PurchasingModule 
              onAddLog={addLog} 
              parts={parts} 
              onPartsUpdated={async () => {
                const updatedParts = await fetchParts();
                setParts(updatedParts);
              }} 
              transactions={transactions}
              onAddPart={handleAddPart}
              onEditPart={handleEditPart}
              onDeletePart={handleDeletePart}
              categories={categories}
            />
          )}
        </main>
      </div>
      {renderVerificationSimulator()}
      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleOpenCustomerAuth}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
      <StatusBar />
    </div>
  );
}

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { SquaresFour, Package, ShoppingCart, ChartBar, Bell, User, CalendarBlank, ShieldCheck, List, X, Moon, Sun, EnvelopeOpen, CheckCircle, Tag, Buildings, GearSix } from '@phosphor-icons/react';

import Logo from './components/Logo';
import AuthPortal from './components/AuthPortal';
import CustomerStorefront from './components/CustomerStorefront';
import CustomerDashboard from './components/CustomerDashboard';
import StatusBar from './components/StatusBar';
import Footer from './components/Footer';
import FloatingSettingsWidget from './components/FloatingSettingsWidget';
import ToastNotification, { useToast } from './components/ToastNotification';

// Lazy loaded page modules to optimize initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard'));
const PartsCatalog = lazy(() => import('./components/PartsCatalog'));
const TransactionPOS = lazy(() => import('./components/TransactionPOS'));
const Analytics = lazy(() => import('./components/Analytics'));
const CategoryManagement = lazy(() => import('./components/CategoryManagement'));
const PurchasingModule = lazy(() => import('./components/PurchasingModule'));
const MyAccount = lazy(() => import('./components/MyAccount'));

// Sleek loading fallback for Suspense
const PageLoader = () => (
  <div className="w-full h-full flex flex-col items-center justify-center min-h-[400px]">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-4 border-secondary border-t-accent animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <GearSix weight="duotone" className="w-6 h-6 text-muted-foreground animate-pulse" />
      </div>
    </div>
    <p className="mt-4 text-sm font-semibold text-muted-foreground animate-pulse">Loading Module...</p>
  </div>
);


import {
  INITIAL_TRANSACTIONS,
  INITIAL_LOGS
} from './mockData';
import { fetchParts, fetchCategories, createPart, updatePart, deletePart, deleteCategory, createTransaction, fetchTransactions, fetchPurchaseOrders, fetchPartAdjustments } from './authStore';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const { toasts, showToast, dismissToast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [activeView, setActiveView] = useState('storefront');
  const [page, setPage] = useState('dashboard');
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [myRfqStats, setMyRfqStats] = useState({ sent: 0, lateRfq: 0, notAck: 0, lateReceipt: 0 });
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
        if (!currentUser.emailVerified && !currentUser.email?.includes('admin') && !currentUser.email?.includes('lakers.com') && !currentUser.email?.includes('warriors.com') && !currentUser.email?.includes('suns.com') && !currentUser.email?.includes('bucks.com') && !currentUser.email?.includes('mavericks.com') && !currentUser.email?.includes('lionel.messi')) {
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
        const isAdmin = email.includes('admin') || email.includes('tarlac') || email === 'rbenedict.maagma@gmail.com' || email === 'azhoraaaa@gmail.com';
        const role = isAdmin ? 'admin' : 'customer';
        if (role === 'admin') setActiveView('admin-app');
        else setActiveView('customer-dashboard');
      } else {
        setFirebaseUser(null);
        setIsSignedIn(false);
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);


  // Derive roles from Firebase user
  const isAdmin = firebaseUser?.email?.includes('admin') || firebaseUser?.email?.includes('tarlac') || firebaseUser?.email === 'rbenedict.maagma@gmail.com' || firebaseUser?.email === 'azhoraaaa@gmail.com';
  const role = isAdmin ? 'admin' : 'customer';
  
  const customerSession = isSignedIn && role === 'customer' ? {
    user: { fullName: firebaseUser.displayName || firebaseUser.email, role: 'customer' }
  } : null;

  const adminSession = isSignedIn && role === 'admin' ? {
    user: { fullName: firebaseUser.displayName || firebaseUser.email, role: 'admin' }
  } : null;

  useEffect(() => {
    if (!adminSession?.user) return;
    
    const loadStats = async () => {
      try {
        const pos = await fetchPurchaseOrders();
        const today = new Date();
        const NOT_ACKNOWLEDGED_DAYS = 7;
        
        const myPos = pos.filter(p => p.createdBy === adminSession.user.fullName);
        const rfqs = myPos.filter(p => p.status === 'Draft' || p.status === 'RFQ Sent');
        const confirmedPos = myPos.filter(p => ['Confirmed', 'Received', 'Cancelled'].includes(p.status));
        
        setMyRfqStats({
          sent: rfqs.filter(r => r.status === 'RFQ Sent').length,
          lateRfq: rfqs.filter(r => r.expectedDeliveryDate && new Date(r.expectedDeliveryDate) < today && r.status !== 'Received').length,
          notAck: rfqs.filter(r => {
            if (r.status !== 'RFQ Sent') return false;
            const diff = (today - new Date(r.updatedAt || r.createdAt)) / (1000 * 60 * 60 * 24);
            return diff >= NOT_ACKNOWLEDGED_DAYS;
          }).length,
          lateReceipt: confirmedPos.filter(r => r.status === 'Confirmed' && r.expectedDeliveryDate && new Date(r.expectedDeliveryDate) < today).length,
        });
      } catch (err) {
        console.error('Failed to load my RFQ stats', err);
      }
    };
    
    loadStats();
    const handleUpdate = () => loadStats();
    window.addEventListener('purchasingUpdate', handleUpdate);
    return () => window.removeEventListener('purchasingUpdate', handleUpdate);
  }, [adminSession?.user?.fullName]);

  useEffect(() => {
    
    const loadData = async () => {
      // Parallelize data fetching to prevent sequential waterfalls
      const [fetchedParts, fetchedCategories] = await Promise.all([
        fetchParts(),
        fetchCategories()
      ]);
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
      return true;
    } else {
      addLog('system', `Error processing sale: ${res.error}`);
      alert(`Transaction failed: ${res.error}`);
      return false;
    }
  };

  const handleLogout = async (role) => {
    await signOut(auth);
    setActiveView('storefront');
  };

  const handleOpenCustomerAuth = () => setActiveView('customer-auth');
  const handleOpenAdminAuth = () => setActiveView('admin-auth');

  const handleAutoCustomerLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, 'lionel.messi@example.com', 'Player@12345');
      showToast('Auto-logged in as Lionel Messi!', 'success');
    } catch (err) {
      showToast(`Auto-login failed: ${err.message}. (Make sure you register this user first in the Auth Portal with password: Player@12345)`, 'error');
    }
  };

  const handleAutoAdminLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, 'admin@tarlactruckparts.local', 'Admin@12345');
      showToast('Auto-logged in as System Admin!', 'success');
    } catch (err) {
      showToast(`Auto-login failed: ${err.message}. (Make sure you register admin@tarlactruckparts.local first in the Auth Portal with password: Admin@12345)`, 'error');
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('All');
  const lowStockParts = parts.filter((part) => part.stock <= part.minStock);
  const lowStockCount = lowStockParts.length;

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
            {firebaseUser && (localStorage.getItem(`avatar_${firebaseUser.uid}`) || firebaseUser.photoURL) ? (
              <img 
                src={localStorage.getItem(`avatar_${firebaseUser.uid}`) || firebaseUser.photoURL} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-border object-cover shadow-inner bg-secondary"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shadow-inner">
                <User weight="duotone" className="w-5 h-5" />
              </div>
            )}
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
                <button
                  onClick={() => {
                    setPage('account');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    page === 'account' ? 'bg-accent/15 text-accent border-l-4 border-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <User weight="duotone" className="w-5 h-5" />
                  My Account
                </button>
              </nav>
            </div>

            <div className="shrink-0 p-5 pt-4 border-t border-border flex flex-col gap-3 bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {firebaseUser && (localStorage.getItem(`avatar_${firebaseUser.uid}`) || firebaseUser.photoURL) ? (
                      <img 
                        src={localStorage.getItem(`avatar_${firebaseUser.uid}`) || firebaseUser.photoURL} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full border border-border object-cover shadow-inner bg-secondary"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shadow-inner">
                        <User weight="duotone" className="w-5 h-5" />
                      </div>
                    )}
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-foreground">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">System Admin</span>
                  </div>
                </div>
                <div className="p-1 px-2 bg-emerald-500/10 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] rounded border border-emerald-500/30 dark:border-emerald-800/30">Secure</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex flex-col p-2 rounded-lg bg-background border border-border shadow-sm">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Sent RFQs</span>
                  <span className="text-sm font-black text-cyan-500">{myRfqStats.sent}</span>
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-background border border-border shadow-sm">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Late RFQs</span>
                  <span className="text-sm font-black text-orange-500">{myRfqStats.lateRfq}</span>
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-background border border-border shadow-sm">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Not Acknowledged</span>
                  <span className="text-sm font-black text-amber-500">{myRfqStats.notAck}</span>
                </div>
                <div className="flex flex-col p-2 rounded-lg bg-background border border-border shadow-sm">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Late Receipt</span>
                  <span className="text-sm font-black text-red-500">{myRfqStats.lateReceipt}</span>
                </div>
              </div>
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
              onClick={() => setIsAlertDrawerOpen(true)}
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
              onClick={() => setPage('account')}
              className={`p-2 rounded-xl border border-border transition-all ${
                page === 'account' ? 'bg-accent/15 text-accent border-accent' : 'bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              aria-label="My Account"
            >
              <User weight="duotone" className="w-4 h-4" />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              <Suspense fallback={<PageLoader />}>
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
                    onFetchPartAdjustments={fetchPartAdjustments}
                  />
                )}

                {page === 'pos' && <TransactionPOS parts={parts} onCheckout={handleCheckout} />}

                {page === 'analytics' && <Analytics parts={parts} transactions={transactions} />}
                {page === 'categories' && <CategoryManagement onAddLog={addLog} />}
                {page === 'account' && <MyAccount user={auth.currentUser} onGoBack={() => setPage('dashboard')} />}
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
                    showToast={showToast}
                  />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Alert Notification Drawer */}
      <AnimatePresence>
        {isAlertDrawerOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAlertDrawerOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm h-full bg-background border-l border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell weight="duotone" className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold text-foreground font-display">Alert Notifications</h2>
                </div>
                <button onClick={() => setIsAlertDrawerOpen(false)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {lowStockParts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <CheckCircle weight="duotone" className="w-12 h-12 mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold">All Stock is Healthy</p>
                    <p className="text-xs text-center mt-1">No parts are below their minimum threshold.</p>
                  </div>
                ) : (
                  lowStockParts.map(part => (
                    <div key={part.id} className="p-4 bg-secondary border border-border rounded-xl shadow-sm space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                      <div className="flex justify-between items-start pl-2">
                        <div className="pr-4">
                          <h3 className="text-sm font-bold text-foreground leading-tight">{part.name}</h3>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">{part.sku}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full">Low Stock</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-2">
                        <div className="p-2 bg-background rounded-lg border border-border">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current</div>
                          <div className="text-lg font-bold text-foreground">{part.stock}</div>
                        </div>
                        <div className="p-2 bg-background rounded-lg border border-border">
                          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Min Threshold</div>
                          <div className="text-lg font-bold text-foreground opacity-75">{part.minStock}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setIsAlertDrawerOpen(false);
                          setPage('purchasing');
                        }}
                        className="w-full mt-2 ml-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-foreground text-xs font-bold rounded-lg border border-border transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart weight="bold" className="w-3.5 h-3.5" />
                        Restock Now
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleOpenCustomerAuth}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
      <StatusBar />
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { SquaresFour, Package, ShoppingCart, ChartBar, Bell, User, CalendarBlank, ShieldCheck, List, X, Moon, Sun, EnvelopeOpen, CheckCircle, Tag, Buildings, GearSix, Gear, UsersThree, SignOut } from '@phosphor-icons/react';

import Logo from './components/Logo';
import AuthPortal from './components/AuthPortal';
import CustomerStorefront from './components/CustomerStorefront';
import StatusBar from './components/StatusBar';
import Footer from './components/Footer';
import FloatingSettingsWidget from './components/FloatingSettingsWidget';
import ToastNotification, { useToast } from './components/ToastNotification';
import UpdatePasswordModal from './components/UpdatePasswordModal';
import CompleteProfileModal from './components/CompleteProfileModal';
import { Drawer } from './components/ui/Drawer';

// Lazy loaded page modules to optimize initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard'));
const PartsCatalog = lazy(() => import('./components/PartsCatalog'));
const TransactionPOS = lazy(() => import('./components/TransactionPOS'));
const Analytics = lazy(() => import('./components/Analytics'));
const CategoryManagement = lazy(() => import('./components/CategoryManagement'));
const PurchasingModule = lazy(() => import('./components/PurchasingModule'));
const MyAccount = lazy(() => import('./components/MyAccount'));
const StaffManagement = lazy(() => import('./components/StaffManagement'));
const CustomerManagement = lazy(() => import('./components/CustomerManagement'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));

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


import { fetchParts, fetchCategories, createPart, updatePart, deletePart, deleteCategory, createTransaction, fetchTransactions, fetchMyTransactions, fetchPurchaseOrders, checkStaffRole, fetchCustomerProfile, fetchPartAdjustments, fetchGlobalAuditLogs, invalidateToken, setToken } from './authStore';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const { toasts, showToast, dismissToast } = useToast();

  const pageTitles = {
    dashboard: 'Dashboard Overview',
    catalog: 'Parts Inventory',
    pos: 'Sales POS Entry',
    analytics: 'Sales Analytics',
    categories: 'Category Management',
    purchasing: 'Purchasing',
    customers: 'Customer Management',
    staff: 'Staff Management',
    account: 'My Account'
  };
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);

  const [activeView, setActiveView] = useState('storefront');
  const [page, setPage] = useState('dashboard');
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [myRfqStats, setMyRfqStats] = useState({ sent: 0, lateRfq: 0, notAck: 0, lateReceipt: 0 });
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return false; // Default to light mode
    }
    return false;
  });

  const [initialNotice, setInitialNotice] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');

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
    const handleUserChange = async (currentUser, event = 'INITIAL_SESSION') => {
      invalidateToken();
      if (currentUser) {
        // Google is pre-verified by the provider — don't gate it on email_confirmed_at,
        // which can lag briefly right after the OAuth redirect and would otherwise
        // bounce a legitimate Google sign-in back to logged-out.
        const isGoogleVerified = currentUser.app_metadata?.provider === 'google';
        if (!currentUser.email_confirmed_at && !isGoogleVerified && !currentUser.email?.includes('admin') && !currentUser.email?.includes('lakers.com') && !currentUser.email?.includes('warriors.com') && !currentUser.email?.includes('suns.com') && !currentUser.email?.includes('bucks.com') && !currentUser.email?.includes('mavericks.com') && !currentUser.email?.includes('lionel.messi') && !currentUser.email?.includes('staff')) {
          setSupabaseUser(null);
          setIsSignedIn(false);
          setIsLoaded(true);
          return;
        }

        const email = currentUser.email || '';

        // Fetch RBAC staff role
        let staffData = await checkStaffRole(email);


        const isAdmin = !!staffData;

        setSupabaseUser(currentUser);
        setIsSignedIn(true);

        const userRole = isAdmin ? 'admin' : 'customer';

        // Expose staff permissions in the session for components to consume
        if (isAdmin) {
          currentUser.staffData = staffData;
        }

        if (userRole === 'admin') {
          setActiveView('admin-app');
          if (event === 'SIGNED_IN') {
             setLogs((prev) => {
               if (prev.some(l => l.type === 'auth' && l.message === `${email} logged in` && (new Date() - new Date(l.timestamp) < 2000))) {
                 return prev;
               }
               return [{
                 id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                 timestamp: new Date().toISOString(),
                 type: 'auth',
                 message: `${email} logged in`,
                 meta: null
               }, ...prev];
             });
          }
        }
        else setActiveView('storefront'); // Go directly to storefront
      } else {
        setSupabaseUser(null);
        setIsSignedIn(false);
      }
      setIsLoaded(true);
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token || null);
      handleUserChange(session?.user || null, 'INITIAL_SESSION');
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setActiveView('update-password');
      }
      setToken(session?.access_token || null);
      handleUserChange(session?.user || null, event);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Derive sessions directly from the state
  const adminSession = isSignedIn && supabaseUser?.staffData ? {
    user: {
      fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email,
      role: 'admin',
      staffData: supabaseUser.staffData
    }
  } : null;

  useEffect(() => {
    if (!adminSession) return;
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health', { headers: { 'Cache-Control': 'no-cache' } });
        if (isMounted) setServerStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (isMounted) setServerStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [adminSession]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (supabaseUser && !supabaseUser.staffData) {
        const p = await fetchCustomerProfile();
        setCustomerProfile(p);
      } else {
        setCustomerProfile(null);
      }
    };
    fetchProfile();
  }, [supabaseUser]);

  useEffect(() => {
    const handleAvatarUpdate = async () => {
      if (supabaseUser && !supabaseUser.staffData) {
        const p = await fetchCustomerProfile();
        setCustomerProfile(p);
      }
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [supabaseUser]);

  const customerSession = isSignedIn && !supabaseUser?.staffData ? {
    user: {
      fullName: customerProfile?.displayName || supabaseUser.user_metadata?.full_name || supabaseUser.email,
      email: supabaseUser.email,
      role: 'customer',
      uid: supabaseUser.id,
      photoURL: customerProfile?.photoURL || supabaseUser.user_metadata?.avatar_url
    }
  } : null;

  const needsProfileCompletion = isSignedIn && supabaseUser && !supabaseUser.staffData && !supabaseUser.user_metadata?.contact_number;

  const handleProfileComplete = async () => {
    try {
      const p = await fetchCustomerProfile();
      setCustomerProfile(p);

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.contact_number) {
        setSupabaseUser(user);
      } else if (p?.phoneNumber || p?.contact_number) {
        const contactNum = p.phoneNumber || p.contact_number;
        const { data: updated } = await supabase.auth.updateUser({
          data: { contact_number: contactNum }
        });
        if (updated?.user) {
          setSupabaseUser(updated.user);
        } else {
          setSupabaseUser(prev => prev ? {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              contact_number: contactNum
            }
          } : null);
        }
      }
    } catch (err) {
      console.error('Error updating profile complete state:', err);
    }
  };

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
      const isAdmin = Boolean(adminSession?.user?.staffData);

      // Parallelize data fetching to prevent sequential waterfalls
      const [fetchedParts, fetchedCategories, fetchedTransactions] = await Promise.all([
        fetchParts(),
        fetchCategories(),
        isAdmin ? fetchTransactions() : fetchMyTransactions()
      ]);
      setParts(fetchedParts);
      setCategories(fetchedCategories);
      setTransactions(fetchedTransactions ?? []);
    };

    loadData();

    // Listen for transaction updates from CustomerStorefront (e.g. after checkout)
    const handleTransactionUpdate = async () => {
      const isAdmin = Boolean(adminSession?.user?.staffData);
      const fetchedTransactions = isAdmin ? await fetchTransactions() : await fetchMyTransactions();
      setTransactions(fetchedTransactions ?? []);
    };

    window.addEventListener('customerTransactionsUpdate', handleTransactionUpdate);
    return () => window.removeEventListener('customerTransactionsUpdate', handleTransactionUpdate);
  }, [isLoaded, isSignedIn, adminSession?.user?.staffData]);

  // Admin Keyboard Shortcuts
  useEffect(() => {
    if (!adminSession) return;
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setPage('dashboard'); break;
          case '2': e.preventDefault(); setPage('catalog'); break;
          case '3': e.preventDefault(); setPage('pos'); break;
          case '4': e.preventDefault(); setPage('analytics'); break;
          case '5': e.preventDefault(); setPage('categories'); break;
          case '6': e.preventDefault(); setPage('purchasing'); break;
          case '7': e.preventDefault(); setPage('customers'); break;
          case '8': 
            if (adminSession?.user?.staffData?.role === 'SUPERADMIN') {
              e.preventDefault(); 
              setPage('staff'); 
            }
            break;
          case '9': 
            if (adminSession?.user?.staffData?.role === 'SUPERADMIN') {
              e.preventDefault(); 
              setIsSettingsModalOpen(true); 
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adminSession]);

  const addLog = (type, message, meta = null) => {
    const newLog = {
      id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      meta
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleAddPart = async (partData) => {
    const result = await createPart(partData);
    if (result.ok) {
      setParts((prev) => [...prev, result.part]);
      addLog('stock', `New part catalog item '${result.part.name}' added with SKU: ${result.part.sku}.`, { sku: result.part.sku });
    } else {
      alert(`Error adding part: ${result.error}`);
    }
  };

  const handleEditPart = async (id, updatedData) => {
    const partBefore = parts.find(p => p.id === id);
    const result = await updatePart(id, updatedData);
    if (result.ok) {
      setParts((prev) => prev.map((part) => (part.id === id ? result.part : part)));
      if (updatedData.adjustmentReason) {
        addLog('stock', `Stock adjusted for '${result.part.name}': ${partBefore?.stock ?? 0} → ${result.part.stock} (reason: ${updatedData.adjustmentReason})`, { sku: result.part.sku });
      } else {
        addLog('stock', `Part item (ID: ${id}) SKU '${result.part.sku}' details updated.`, { sku: result.part.sku });
      }
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
      addLog('stock', `Restocked '${part.name}': added ${quantity} units (current stock: ${newStock}).`, { sku: part.sku });
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
    if (role === 'admin' || role === 'SUPERADMIN' || role === 'STAFF') {
      addLog('auth', 'Staff logged out');
    }
    await supabase.auth.signOut();
    setActiveView('storefront');
  };

  const [authInitialTab, setAuthInitialTab] = useState('login');
  const handleOpenCustomerAuth = (tab = 'login') => {
    setAuthInitialTab(tab);
    setActiveView('customer-auth');
  };
  const handleOpenAdminAuth = () => setActiveView('admin-auth');

  const handleAutoCustomerLogin = async () => {
    try {
      const email = 'lionel.messi@example.com';
      const password = 'Password123!';
      const fullName = 'Lionel Messi';

      let { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error?.status === 429) {
        throw new Error('Too many requests. Please wait 30 seconds and try again.');
      }

      if (error?.message?.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        });

        if (signUpError?.message?.includes('already registered') || signUpError?.message?.includes('already exists')) {
          throw new Error('User exists but password mismatch. Contact admin to reset.');
        }
        if (signUpError?.status === 429) {
          throw new Error('Too many requests. Please wait 30 seconds and try again.');
        }
        if (signUpError) throw signUpError;

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError?.message?.includes('Email not confirmed')) {
          throw new Error('Account created but email not confirmed. Contact admin to confirm.');
        }
        if (signInError) throw signInError;
      } else if (error?.message?.includes('Email not confirmed')) {
        throw new Error('Account exists but email not confirmed. Contact admin.');
      } else if (error) {
        throw error;
      }

      setActiveView('storefront');
      showToast('Logged in as Lionel Messi', 'success');
    } catch (err) {
      showToast(`Auto-login failed: ${err.message}`, 'error');
    }
  };

  const handleAutoAdminLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@tarlactruckparts.local',
        password: 'admin123',
      });

      if (error?.status === 429) {
        throw new Error('Too many requests. Please wait 30 seconds and try again.');
      }
      if (error) throw error;

      setActiveView('admin-app');
      showToast('Auto-logged in as System Admin!', 'success');
    } catch (err) {
      showToast(`Auto-login failed: ${err.message}`, 'error');
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('All');
  const lowStockParts = parts.filter((part) => (part.stock - (part.reservedStock || 0)) <= part.minStock).sort((a, b) => (b.minStock - b.stock) - (a.minStock - a.stock));
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
          initialTab={activeView === 'signup' ? 'register' : authInitialTab}
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



  if (activeView === 'update-password') {
    return (
      <UpdatePasswordModal
        onComplete={() => {
          showToast('Password updated successfully!', 'success');
          setActiveView('storefront');
        }}
      />
    );
  }

  if (activeView === 'storefront') {
    return (
      <>
        <CustomerStorefront
          parts={parts}
          categories={categories}
          transactions={transactions}
          customerSession={customerSession}
          onOpenCustomerAuth={handleOpenCustomerAuth}
          onOpenAdminAuth={handleOpenAdminAuth}
          onLogoutCustomer={() => handleLogout('customer')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          showToast={showToast}
        />
        <FloatingSettingsWidget
          onAdminLogin={handleAutoAdminLogin}
          onCustomerLogin={handleAutoCustomerLogin}
          onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
          isLoggedIn={!!adminSession || !!customerSession}
        />
        <StatusBar />
        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
        {needsProfileCompletion && (
          <CompleteProfileModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }





  return (
    <div className={`h-full flex overflow-hidden bg-background text-foreground font-sans transition-colors duration-300 ${import.meta.env.DEV ? 'pb-8' : ''}`}>
      <aside className={`hidden lg:flex lg:flex-col shrink-0 glass-panel border-r border-border justify-between overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        <div className="flex-1 space-y-6 overflow-y-scroll overflow-x-hidden px-4 py-5 custom-scrollbar">
          <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-4' : 'items-center justify-between'} px-1 py-2`}>
            {!isSidebarCollapsed ? (
              <Logo className="w-14 h-14 shrink-0" showText={true} />
            ) : (
              <Logo className="w-10 h-10 shrink-0" showText={false} />
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors shrink-0"
            >
              <List weight="duotone" className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setPage('dashboard')}
              title="Dashboard Overview"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'dashboard'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <SquaresFour weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Dashboard Overview</span>}
            </button>

            <button
              onClick={() => setPage('catalog')}
              title="Parts Inventory"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'catalog'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <Package weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Parts Inventory</span>}
            </button>

            <button
              onClick={() => setPage('pos')}
              title="Sales POS Entry"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'pos'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <ShoppingCart weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Sales POS Entry</span>}
            </button>

            <button
              onClick={() => setPage('analytics')}
              title="Sales Analytics"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'analytics'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <ChartBar weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Sales Analytics</span>}
            </button>

            <button
              onClick={() => setPage('categories')}
              title="Category Management"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'categories'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <Tag weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Category Management</span>}
            </button>

            <button
              onClick={() => setPage('purchasing')}
              title="Purchasing"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'purchasing'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <Buildings weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Purchasing</span>}
            </button>

            <button
              onClick={() => setPage('customers')}
              title="Customer Management"
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'customers'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
            >
              <UsersThree weight="duotone" className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>Customer Management</span>}
            </button>

            {/* SUPER ADMIN ONLY: Staff Management & Settings */}
            {(adminSession?.user?.staffData?.role === 'SUPERADMIN') && (
              <>
                <button
                  onClick={() => setPage('staff')}
                  title="Staff Management"
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'staff'
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                    }`}
                >
                  <ShieldCheck weight="duotone" className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span>Staff Management</span>}
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  title="System Settings"
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent`}
                >
                  <Gear weight="duotone" className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span>System Settings</span>}
                </button>
              </>
            )}

          </nav>
        </div>

        <div className={`shrink-0 border-t border-border flex flex-col bg-secondary/30 transition-all duration-300 ${isSidebarCollapsed ? 'p-3 items-center' : 'p-5 pt-4 items-start'}`}>
          <div className={`flex items-center w-full ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <div 
              onClick={() => setPage('account')}
              className={`flex items-center cursor-pointer hover:opacity-80 transition-opacity ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
              title="My Account"
            >
              {supabaseUser && (customerProfile?.photoURL || supabaseUser.user_metadata?.avatar_url) ? (
                <img
                  src={customerProfile?.photoURL || supabaseUser.user_metadata?.avatar_url}
                  alt="Profile"
                  className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-full border border-border object-cover bg-secondary shrink-0`}
                />
              ) : (
                <div className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shrink-0`}>
                  <User weight="duotone" className="w-5 h-5" />
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
                  <div className="mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${adminSession?.user?.staffData?.role === 'SUPERADMIN' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>
                      {adminSession?.user?.staffData?.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'STAFF'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => handleLogout('admin')}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                title="Logout"
              >
                <SignOut weight="duotone" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
          <aside className="w-72 bg-background border-r border-border flex flex-col justify-between overflow-hidden animate-slideRight">
            <div className="flex-1 space-y-6 overflow-y-scroll px-5 py-5 custom-scrollbar">
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'dashboard' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'catalog' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'pos' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'analytics' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'categories' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'purchasing' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                >
                  <Buildings weight="duotone" className="w-5 h-5" />
                  Purchasing
                </button>
                <button
                  onClick={() => {
                    setPage('customers');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'customers' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                >
                  <UsersThree weight="duotone" className="w-5 h-5" />
                  Customer Management
                </button>
                {/* SUPER ADMIN ONLY: Staff Management & Settings */}
                {(adminSession?.user?.staffData?.role === 'SUPERADMIN') && (
                  <>
                    <button
                      onClick={() => {
                        setPage('staff');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${page === 'staff' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                    >
                      <ShieldCheck weight="duotone" className="w-5 h-5" />
                      Staff Management
                    </button>
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(true);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-muted-foreground hover:bg-secondary hover:text-foreground`}
                    >
                      <Gear weight="duotone" className="w-5 h-5" />
                      System Settings
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="shrink-0 p-5 pt-4 border-t border-border flex flex-col bg-secondary/30">
              <div className="flex items-center justify-between w-full gap-2">
                <div 
                  onClick={() => {
                    setPage('account');
                    setIsSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  title="My Account"
                >
                  {supabaseUser && (customerProfile?.photoURL || supabaseUser.user_metadata?.avatar_url) ? (
                    <img
                      src={customerProfile?.photoURL || supabaseUser.user_metadata?.avatar_url}
                      alt="Profile"
                      className="w-10 h-10 rounded-full border border-border object-cover bg-secondary shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-sm font-bold shrink-0">
                      <User weight="duotone" className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">{adminSession?.user?.fullName || 'Cris Dela Cruz'}</span>
                    <div className="mt-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${adminSession?.user?.staffData?.role === 'SUPERADMIN' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>
                        {adminSession?.user?.staffData?.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'STAFF'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleLogout('admin')}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                  title="Logout"
                >
                  <SignOut weight="duotone" className="w-5 h-5" />
                </button>
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

            <div className="flex flex-col">
              <h1 className="text-lg lg:text-xl font-bold font-display tracking-tight text-foreground leading-tight">
                {pageTitles[page] || 'Dashboard'}
              </h1>
              
              {/* Consolidated Status Cluster */}
              <div className="flex items-center gap-1.5 mt-0.5" aria-live="polite" aria-atomic="true">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  serverStatus === 'checking' ? 'bg-amber-500 animate-pulse' :
                  serverStatus === 'online' ? 'bg-emerald-500' : 'bg-destructive'
                }`} />
                <span className="font-mono text-muted-foreground text-[10px] tracking-wider uppercase">
                  {serverStatus === 'checking' ? 'Connecting...' : 
                   serverStatus === 'online' ? 'System Online' : 
                   <button onClick={() => window.location.reload()} className="hover:text-foreground transition-colors underline decoration-dotted underline-offset-2 cursor-pointer">Offline - Click to Retry</button>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">

            <button
              onClick={() => setIsAlertDrawerOpen(true)}
              className="relative p-2 hover:bg-secondary rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all group"
              aria-label="Notifications"
              aria-expanded={isAlertDrawerOpen}
            >
              <Bell weight="duotone" className="w-4.5 h-4.5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-destructive text-3xs font-extrabold text-white rounded-md flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] scale-100 group-hover:scale-110">
                  {lowStockCount > 99 ? '99+' : lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun weight="duotone" className="w-4 h-4" /> : <Moon weight="duotone" className="w-4 h-4" />}
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
                    setPage={setPage}
                    onFetchPartAdjustments={fetchPartAdjustments}
                    onFetchGlobalAuditLogs={fetchGlobalAuditLogs}
                  />
                )}

                {page === 'pos' && <TransactionPOS parts={parts} onCheckout={handleCheckout} />}

                {page === 'analytics' && <Analytics parts={parts} transactions={transactions} />}
                {page === 'categories' && <CategoryManagement onAddLog={addLog} />}
                {page === 'account' && <MyAccount user={supabaseUser} onGoBack={() => setPage('dashboard')} />}
                {(adminSession?.user?.staffData?.role === 'SUPERADMIN') && page === 'staff' && <StaffManagement currentEmail={adminSession?.user?.staffData?.email} />}
                {page === 'purchasing' && (
                  <PurchasingModule
                    onAddLog={addLog}
                    parts={parts}
                    onPartsUpdated={async () => {
                      const updatedParts = await fetchParts('', 'All', {}, true);
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
                {page === 'customers' && <CustomerManagement showToast={showToast} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Alert Notification Drawer */}
      <Drawer
        isOpen={isAlertDrawerOpen}
        onClose={() => setIsAlertDrawerOpen(false)}
        labelledBy="alert-drawer-heading"
        panelClassName="fixed top-0 right-0 w-full max-w-sm h-full bg-background border-l border-border flex flex-col"
        panelVariants={{
          initial: { x: '100%', opacity: 0.5 },
          animate: { x: 0, opacity: 1 },
          exit: { x: '100%', opacity: 0.5 },
          transition: { ease: 'easeOut', duration: 0.18 },
        }}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell weight="duotone" className="w-5 h-5 text-accent" />
            <h2 id="alert-drawer-heading" className="text-lg font-bold text-foreground font-display">Low Stock Alerts</h2>
          </div>
          <button onClick={() => setIsAlertDrawerOpen(false)} aria-label="Close notifications" className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        <ul aria-live="polite" aria-atomic="false" className="list-none flex-1 overflow-y-auto p-5 space-y-4">
          {lowStockParts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
              <CheckCircle weight="duotone" className="w-12 h-12 mb-2 text-emerald-500" />
              <p className="text-sm font-semibold">All Stock is Healthy</p>
              <p className="text-xs text-center mt-1">No parts are below their minimum threshold.</p>
            </div>
          ) : (
            lowStockParts.map(part => (
              <li key={part.id} className="p-4 bg-secondary border border-border rounded-xl space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
                <div className="flex justify-between items-start pl-2">
                  <div className="pr-4">
                    <h3 className="text-sm font-bold text-foreground leading-tight">{part.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{part.sku}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-destructive px-2 py-0.5 bg-destructive/10 rounded-md">Low Stock</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="p-2 bg-background rounded-lg border border-border">
                    <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">Current</div>
                    <div className="text-lg font-bold text-foreground">{part.stock}</div>
                  </div>
                  <div className="p-2 bg-background rounded-lg border border-border">
                    <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider">Min Threshold</div>
                    <div className="text-lg font-bold text-foreground opacity-75">{part.minStock}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAlertDrawerOpen(false);
                    setSelectedCategory('All');
                    setPage('catalog');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('catalogFilter', { detail: part.sku })), 50);
                  }}
                  className="w-full mt-2 ml-2 py-1.5 bg-foreground hover:bg-foreground/90 text-background text-xs font-bold rounded-lg border border-border transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart weight="bold" className="w-3.5 h-3.5" />
                  Restock Now
                </button>
              </li>
            ))
          )}
        </ul>
      </Drawer>

      {/* System Settings Modal */}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <AdminSettings onClose={() => setIsSettingsModalOpen(false)} onAddLog={addLog} />
        </Suspense>
      )}

      <FloatingSettingsWidget
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleAutoCustomerLogin}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
      <StatusBar />
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
      {needsProfileCompletion && (
        <CompleteProfileModal onComplete={handleProfileComplete} />
      )}
    </div>
  );
}

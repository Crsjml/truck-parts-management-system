import React, { useMemo, useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ArrowRight, SignIn, MagnifyingGlass, ShieldCheck, Sparkle, Tag, Truck, UserPlus, Moon, Sun, SquaresFour, Gear, Pulse, Lightning, Faders, ShoppingCart, Trash, Star, MapPin, Phone, Envelope, ClipboardText , UserCircle, CaretDown, House, User, CheckCircle } from '@phosphor-icons/react';
import Logo from './Logo';
import Footer from './Footer';
import { getCategoryIconAndColor, getCategoryPlaceholder } from '../utils/categoryIcons';
import { fetchCategoriesList, fetchCustomerProfile } from '../authStore';
import { supabase } from '../supabaseClient';
import CompatibilityFilter from './CompatibilityFilter';
import ReviewSection from './ReviewSection';
import CartDrawer from './CartDrawer';
import PartDetailDrawer from './PartDetailDrawer';
import ProductGrid from './ProductGrid';
import StorefrontFilters from './StorefrontFilters';
import MyOrders from './MyOrders';
import MyAccount from './MyAccount';
import ReturnPolicyModal from './ReturnPolicyModal';
import ReorderRail from './ReorderRail';
import { HeroHighlight, Highlight } from './ui/HeroHighlight';
import { motion, AnimatePresence } from 'framer-motion';
export default function CustomerStorefront({
  parts,
  categories,
  customerSession,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  onLogoutCustomer,
  isDarkMode,
  setIsDarkMode,
  transactions
}) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPart, setSelectedPart] = useState(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [storefrontTab, setStorefrontTab] = useState('home');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [compatibilityFilter, setCompatibilityFilter] = useState('All');
  const [stockStatus, setStockStatus] = useState('All');
  const [vehicleBrand, setVehicleBrand] = useState('All');
  const [vehicleSeries, setVehicleSeries] = useState('All');
  const [minRating, setMinRating] = useState(0);

  // Autocomplete, Pagination, Stock sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nestedCategories, setNestedCategories] = useState([]);
  const [activeMainCat, setActiveMainCat] = useState('');

  const itemsPerPage = 10;
  const loading = parts.length === 0 && categories.length <= 1;

  useEffect(() => {
    const fetchNested = async () => {
      const data = await fetchCategoriesList();
      setNestedCategories(data);
      const mainCats = data.filter(c => !c.parentCategory);
      if (mainCats.length > 0 && !activeMainCat) {
        setActiveMainCat(mainCats[0].name);
      }
    };
    fetchNested();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Cart States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const handleCheckoutSuccess = async () => {
      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session_id');
      const isSuccess = query.get('checkout') === 'success';
      const isCanceled = query.get('checkout') === 'canceled';

      if (!isSuccess && !isCanceled) return;

      // Immediately clear the URL so this effect cannot be re-triggered on next render
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (isSuccess && sessionId && customerSession) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          await fetch('/api/checkout/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ sessionId })
          });
          
          setCart([]);
          setShowSuccessModal(true);
          setStorefrontTab('orders'); // Redirect to orders immediately to see it
          
          // Dispatch event to force App.jsx to re-fetch the latest transactions
          window.dispatchEvent(new Event('customerTransactionsUpdate'));
        } catch (err) {
          console.error('Failed to verify session', err);
        }
      } else if (isCanceled) {
        // You can also build a custom cancel modal, but for now silent return or simple alert
        // alert('Order canceled.');
      }
    };

    handleCheckoutSuccess();
  }, [customerSession]);

  // Avatar state
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const loadAvatar = async () => {
      if (customerSession?.user) {
        try {
          const profile = await fetchCustomerProfile();
          if (profile?.photoURL) {
            setAvatar(profile.photoURL);
            return;
          }
        } catch (e) {
          console.error("Failed to load customer profile avatar", e);
        }

        // Fallback to Supabase user_metadata
        const metadataAvatar = customerSession.user.user_metadata?.avatar_url;
        if (metadataAvatar) {
          setAvatar(metadataAvatar);
          return;
        }

        // Fallback to local storage (legacy)
        const uid = customerSession.user.uid || customerSession.user.id;
        const storedAvatar = localStorage.getItem(`avatar_${uid}`);
        if (storedAvatar) setAvatar(storedAvatar);
      }
    };
    loadAvatar();
    
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [customerSession]);

  const cartTotalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotalItems = cart.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (part, quantity = 1) => {
    const availableStock = part.stock - (part.reservedStock || 0);
    const existing = cart.find(item => item.id === part.id);
    const requested = existing ? existing.quantity + quantity : quantity;

    if (requested > availableStock) {
      alert(`Cannot add more. Only ${availableStock} units of ${part.name} are available.`);
      return;
    }

    setCart(prev => {
      const found = prev.find(item => item.id === part.id);
      if (found) {
        return prev.map(item =>
          item.id === part.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...part, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (partId) => {
    setCart(prev => prev.filter(item => item.id !== partId));
  };

  const handleReorder = (transaction) => {
    setCart(prev => {
      let newCart = [...prev];
      for (const item of transaction.items) {
        const fullPart = parts.find(p => p.id === (item.partId || item.id));
        if (fullPart) {
          const availableStock = fullPart.stock - (fullPart.reservedStock || 0);
          if (availableStock <= 0) continue;
          const existingIndex = newCart.findIndex(c => c.id === fullPart.id);
          if (existingIndex >= 0) {
            newCart[existingIndex] = {
              ...newCart[existingIndex],
              quantity: Math.min(newCart[existingIndex].quantity + item.quantity, availableStock)
            };
          } else {
            newCart.push({ ...fullPart, quantity: Math.min(item.quantity, availableStock) });
          }
        }
      }
      return newCart;
    });
    setIsCartOpen(true);
  };

  const updateCartQuantity = (partId, delta, stock) => {
    setCart(prev => prev.map(item => {
      if (item.id === partId) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= stock) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (!customerSession) {
      onOpenCustomerAuth('login');
      return;
    }
    if (cart.length === 0) return;

    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/checkout/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ items: cart }),
      });
      
      const session = await response.json();
      if (session.error) throw new Error(session.error);
      if (!session.url) throw new Error('Server returned no checkout URL');

      window.location.href = session.url;
    } catch (error) {
      console.error('Checkout error:', error);
      if (error.message?.includes('checkout URL') || error.message?.includes('Failed')) {
        alert('Checkout service error. Please try again.');
      } else {
        alert('Session expired. Please log in again.');
      }
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, sortOrder, minPrice, maxPrice, stockStatus, compatibilityFilter]);

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    const candidates = new Set();
    parts.forEach(part => {
      if (part.name.toLowerCase().includes(term)) candidates.add(part.name);
      if (part.sku.toLowerCase().includes(term)) candidates.add(part.sku);
      if (part.oem.toLowerCase().includes(term)) candidates.add(part.oem);
      if (part.compatibility && part.compatibility.toLowerCase().includes(term)) {
        candidates.add(part.compatibility);
      }
    });
    return Array.from(candidates).slice(0, 6);
  }, [search, parts]);

  const [vehicleFilter, setVehicleFilter] = useState({ brand: null, series: null });

  const getCategoryStyles = (cat) => {
    const category = nestedCategories.find(c => c.name === cat);
    const { Icon, color } = getCategoryIconAndColor(cat, category?.iconName, category?.colorTheme);
    return { icon: Icon, color, bg: '' };
  };

  const filteredParts = useMemo(() => {
    let result = parts.filter((part) => {
      const searchStr = debouncedSearch.toLowerCase();
      const matchesSearch = part.name.toLowerCase().includes(searchStr) || 
                            part.sku.toLowerCase().includes(searchStr) || 
                            part.oem.toLowerCase().includes(searchStr) ||
                            (part.compatibleWith && part.compatibleWith.some(c => c.brand.toLowerCase().includes(searchStr)));
      
      let categoryMatchList = [selectedCategory];
      const mainCat = nestedCategories.find(c => c.name === selectedCategory && !c.parentCategory);
      if (mainCat) {
        const subCatNames = nestedCategories.filter(c => c.parentCategory?.name === mainCat.name).map(c => c.name);
        categoryMatchList = [...categoryMatchList, ...subCatNames];
      }
      const matchesCategory = selectedCategory === 'All' || categoryMatchList.includes(part.category);
      
      const matchesMinPrice = minPrice === '' || part.price >= parseFloat(minPrice);
      const matchesMaxPrice = maxPrice === '' || part.price <= parseFloat(maxPrice);
      
      const availableStock = part.stock - (part.reservedStock || 0);
      let matchesStock = true;
      if (stockStatus === 'In Stock') matchesStock = availableStock > 0;
      else if (stockStatus === 'Low Stock') matchesStock = availableStock > 0 && availableStock <= part.minStock;
      else if (stockStatus === 'Out of Stock') matchesStock = availableStock === 0;

      let matchesBrand = true;
      if (vehicleFilter.brand) {
        const comp = part.compatibleWith || [];
        const hasBrand = comp.some(c => c.brand === vehicleFilter.brand || c.brand === 'Universal');
        if (!hasBrand) matchesBrand = false;
        else if (vehicleFilter.series) {
          matchesBrand = comp.some(c => (c.brand === vehicleFilter.brand || c.brand === 'Universal') && (c.series === vehicleFilter.series || !c.series));
        }
      }
      
      const matchesRating = minRating === 0 || (part.reviewStats?.averageRating || 0) >= minRating;

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesStock && matchesBrand && matchesRating;
    });

    if (sortOrder === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortOrder === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortOrder === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === 'stock-desc') result.sort((a, b) => (b.stock - (b.reservedStock || 0)) - (a.stock - (a.reservedStock || 0)));
    else if (sortOrder === 'stock-asc') result.sort((a, b) => (a.stock - (a.reservedStock || 0)) - (b.stock - (b.reservedStock || 0)));

    return result;
  }, [parts, debouncedSearch, selectedCategory, sortOrder, minPrice, maxPrice, stockStatus, compatibilityFilter, vehicleFilter, minRating]);

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParts, currentPage]);



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto flex flex-1 w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-40 mb-8 rounded-[2rem] border border-border/50 bg-background/80 px-4 py-3 backdrop-blur-2xl sm:px-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Logo className="w-10 h-10" showText={true} />
              
              {/* Main Nav */}
              <nav className="hidden lg:flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border/50">
                {[
                  { id: 'home', label: 'Home', icon: House },
                  { id: 'catalog', label: 'Parts Catalog', icon: Tag }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStorefrontTab(item.id)}
                    className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      storefrontTab === item.id
                        ? 'bg-background text-foreground shadow-sm border border-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent'
                    }`}
                  >
                    <item.icon weight={storefrontTab === item.id ? "fill" : "duotone"} className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile Nav Toggle / Search could go here, but keeping simple for now */}
            <nav className="flex lg:hidden items-center justify-center gap-2 pb-2 border-b border-border/50">
               <button onClick={() => setStorefrontTab('home')} className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${storefrontTab === 'home' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}><House weight={storefrontTab === 'home' ? "fill" : "duotone"} className="w-3.5 h-3.5"/>Home</button>
               <button onClick={() => setStorefrontTab('catalog')} className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${storefrontTab === 'catalog' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}><Tag weight={storefrontTab === 'catalog' ? "fill" : "duotone"} className="w-3.5 h-3.5"/>Catalog</button>
            </nav>

            {/* User / Actions */}
            <div className="flex flex-wrap justify-center lg:justify-end items-center gap-3">
              {customerSession ? (
                <div className="relative group z-50">
                  <button className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5 bg-secondary text-sm font-semibold transition hover:border-accent/50 hover:bg-background">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <UserCircle weight="duotone" className="w-5 h-5 text-accent" />
                    )}
                    <span className="max-w-[120px] truncate text-xs">{customerSession.user.fullName}</span>
                    <CaretDown weight="bold" className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                  </button>
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border border-border bg-background shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden transform origin-top-right group-hover:scale-100 scale-95">
                    <div className="p-3 bg-secondary/30 border-b border-border/50">
                       <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Signed In As</p>
                       <p className="text-sm font-bold text-foreground truncate">{customerSession.user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button onClick={() => setStorefrontTab('orders')} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <ClipboardText weight="duotone" className="w-4 h-4 text-accent"/> My Purchases
                      </button>
                      <button onClick={() => setStorefrontTab('profile')} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <Gear weight="duotone" className="w-4 h-4 text-accent"/> My Profile
                      </button>
                    </div>
                    <div className="p-1.5 border-t border-border/50 bg-secondary/10">
                      <button onClick={() => { setCart([]); setStorefrontTab('home'); onLogoutCustomer(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition flex items-center gap-3">
                        <SignIn weight="duotone" className="w-4 h-4"/> Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-full border border-border/50">
                  <button onClick={() => onOpenCustomerAuth('login')} className="rounded-full px-4 py-1.5 text-xs font-bold hover:bg-background hover:shadow-sm hover:text-foreground text-muted-foreground transition border border-transparent hover:border-border/50">Login</button>
                  <button onClick={() => onOpenCustomerAuth('register')} className="rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-bold hover:scale-95 transition shadow-sm">Register</button>
                </div>
              )}
              
              <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>
              
              <div className="flex items-center gap-1">
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-full hover:bg-secondary transition border border-transparent hover:border-border/50">
                  <ShoppingCart weight="duotone" className="w-5 h-5 text-foreground" />
                  {cartTotalItems > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white shadow-sm ring-2 ring-background">{cartTotalItems}</span>}
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-secondary transition border border-transparent hover:border-border/50">
                  {isDarkMode ? <Sun weight="duotone" className="w-5 h-5 text-muted-foreground hover:text-foreground"/> : <Moon weight="duotone" className="w-5 h-5 text-muted-foreground hover:text-foreground"/>}
                </button>
                {!customerSession && (
                  <button
                    onClick={onOpenAdminAuth}
                    aria-label="Staff sign-in"
                    title="Staff sign-in"
                    className="p-2 rounded-full hover:bg-secondary transition border border-transparent hover:border-border/50"
                  >
                    <ShieldCheck weight="duotone" className="w-5 h-5 text-muted-foreground hover:text-brandBlue-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col space-y-8 pb-10">
          {storefrontTab === 'home' && (
            <>
              <HeroHighlight containerClassName="rounded-[3rem] border border-border/30 p-8 sm:p-12 lg:p-16 mb-8 shadow-sm">
                <div className="flex flex-col items-center text-center w-full z-10">
                <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-md mb-8 shadow-sm">
                  <Sparkle weight="duotone" className="h-4 w-4 text-accent" />
                  premium truck parts marketplace
                </span>
                
                <h1 className="relative z-10 max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-6 leading-[1.05]">
                  Find the exact part for your <Highlight>heavy fleet.</Highlight>
                </h1>
                
                <p className="relative z-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg mb-12">
                  Search OEM-compatible parts or browse our massive catalog. Create a verified customer account for wholesale pricing, real-time stock alerts, and instant purchase orders.
                </p>

                {/* Search Bar on Hero */}
                <div className="relative z-10 w-full max-w-2xl mb-16">
                  <div className="relative flex items-center w-full h-16 rounded-[2rem] border border-border/50 bg-background/80 backdrop-blur-xl shadow-xl shadow-black/5 focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10 transition-all overflow-hidden pl-6 pr-2">
                    <MagnifyingGlass weight="bold" className="w-6 h-6 text-muted-foreground shrink-0" />
                    <input 
                      type="text"
                      placeholder="Search part name, SKU, OEM..."
                      className="w-full h-full bg-transparent border-none outline-none px-4 text-base font-semibold text-foreground placeholder:text-muted-foreground/50 placeholder:font-medium"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setStorefrontTab('catalog');
                        }
                      }}
                    />
                    <button 
                      onClick={() => setStorefrontTab('catalog')}
                      className="h-12 px-8 rounded-full bg-foreground text-background font-bold text-xs uppercase tracking-[0.15em] hover:scale-95 transition-transform shadow-lg shadow-black/10 shrink-0"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Trusted Brands Marquee */}
                <div className="relative z-10 w-full max-w-4xl mb-12 overflow-hidden flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-70">Trusted by Global Fleets</p>
                  <div className="flex w-full justify-between items-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700 overflow-x-auto no-scrollbar">
                    {/* Simulated logos */}
                    <div className="text-xl font-black italic tracking-tighter">CUMMINS</div>
                    <div className="text-xl font-black tracking-widest">ISUZU</div>
                    <div className="text-xl font-bold uppercase border-2 border-current px-2">Volvo</div>
                    <div className="text-xl font-black italic">MACK</div>
                    <div className="text-xl font-bold tracking-widest">HINO</div>
                    <div className="text-xl font-bold tracking-tighter">PACCAR</div>
                  </div>
                </div>

                {/* 3-Card Value Proposition Bento */}
                <div className="relative z-10 w-full max-w-5xl mb-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="rounded-[2rem] bg-secondary/80 border border-border/50 p-6 backdrop-blur-md flex flex-col justify-center items-start gap-3 hover:border-accent/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Pulse weight="duotone" className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Live Inventory</h4>
                      <p className="text-xs text-muted-foreground mt-1">Real-time stock levels directly from our Tarlac warehouse.</p>
                    </div>
                  </div>
                  <div className="rounded-[2rem] bg-secondary/80 border border-border/50 p-6 backdrop-blur-md flex flex-col justify-center items-start gap-3 hover:border-accent/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Truck weight="duotone" className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Heavy Logistics</h4>
                      <p className="text-xs text-muted-foreground mt-1">Specialized freight handling for oversized engine blocks and chassis parts.</p>
                    </div>
                  </div>
                  <div className="rounded-[2rem] bg-secondary/80 border border-border/50 p-6 backdrop-blur-md flex flex-col justify-center items-start gap-3 hover:border-accent/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><ClipboardText weight="duotone" className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">B2B Wholesale</h4>
                      <p className="text-xs text-muted-foreground mt-1">Exclusive volume discounts and priority allocation for registered fleets.</p>
                    </div>
                  </div>
                </div>

                {/* Shop by Category Bento */}
                <div className="relative z-10 w-full max-w-5xl px-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground mb-8 text-center">Shop by Category</h3>
                  
                  {/* Main Category Tabs (Horizontal Scroll) */}
                  <div className="flex overflow-x-auto hide-scrollbar scroll-fade-edges gap-3 pb-6 w-full justify-start sm:justify-center snap-x scroll-pl-4">
                    {nestedCategories.filter(c => !c.parentCategory).map(mainCat => {
                      const { Icon: MainIcon } = getCategoryIconAndColor(mainCat.name, mainCat.iconName, mainCat.colorTheme);
                      const isActive = activeMainCat === mainCat.name;
                      
                      return (
                        <button 
                          key={mainCat.id} 
                          onClick={() => setActiveMainCat(mainCat.name)}
                          className={`flex items-center gap-2 px-6 py-3 rounded-full border whitespace-nowrap snap-center transition-all duration-300 ${
                            isActive 
                              ? 'bg-foreground text-background border-foreground shadow-lg scale-105' 
                              : 'bg-secondary/50 text-foreground border-border/40 hover:bg-secondary hover:border-border'
                          }`}
                        >
                          {MainIcon ? <MainIcon weight={isActive ? "fill" : "duotone"} className="w-5 h-5" /> : <Tag weight="duotone" className="w-5 h-5" />}
                          <span className="font-bold text-sm tracking-tight">{mainCat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub Category Grid */}
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {nestedCategories.filter(c => c.parentCategory?.name === activeMainCat).map(subCat => {
                      const { Icon: SubIcon, color: subColor } = getCategoryIconAndColor(subCat.name, subCat.iconName, subCat.colorTheme);
                      return (
                        <button 
                          key={subCat.id}
                          onClick={() => {
                            setSelectedCategory(subCat.name);
                            setStorefrontTab('catalog');
                          }}
                          className="flex-1 min-w-[140px] max-w-[180px] sm:max-w-[220px] group flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/40 bg-background/40 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-background hover:shadow-xl hover:shadow-accent/5 hover:border-accent/20"
                        >
                          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary/80 group-hover:scale-105 transition-transform duration-300 shadow-inner ${subColor}`}>
                            {SubIcon ? <SubIcon weight="duotone" className="w-6 h-6" /> : <Tag weight="duotone" className="w-6 h-6" />}
                          </div>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors text-center leading-tight">
                            {subCat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>
              </HeroHighlight>

              <ReorderRail
                transactions={transactions}
                parts={parts}
                customerSession={customerSession}
                addToCart={addToCart}
                formatCurrency={formatCurrency}
                onBrowseCatalog={() => setStorefrontTab('catalog')}
                onSignIn={() => onOpenCustomerAuth('login')}
              />
            </>
          )}

          {storefrontTab === 'catalog' && (
            <div className="flex flex-col gap-6 w-full">
              <div className="w-full relative z-20">
                <StorefrontFilters 
                  parts={parts}
                  search={search}
                  setSearch={setSearch}
                  showSuggestions={showSuggestions}
                  setShowSuggestions={setShowSuggestions}
                  suggestions={suggestions}
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                  nestedCategories={nestedCategories}
                  getCategoryStyles={getCategoryStyles}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  vehicleFilter={vehicleFilter}
                  setVehicleFilter={setVehicleFilter}
                  minPrice={minPrice}
                  setMinPrice={setMinPrice}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  stockStatus={stockStatus}
                  setStockStatus={setStockStatus}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  minRating={minRating}
                  setMinRating={setMinRating}
                />
              </div>

              <div id="parts-catalog" className="w-full">
                {loading ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="rounded-[2.5rem] bg-secondary/50 border border-border/50 h-[400px] animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <ProductGrid 
                    filteredParts={filteredParts}
                    paginatedParts={paginatedParts}
                    getCategoryStyles={getCategoryStyles}
                    getCategoryPlaceholder={getCategoryPlaceholder}
                    addToCart={addToCart}
                    setSelectedPart={setSelectedPart}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                  />
                )}
              </div>
            </div>
          )}



          {storefrontTab === 'orders' && (
            <MyOrders 
              customerName={customerSession?.user?.fullName} 
              customerEmail={customerSession?.user?.email}
              userId={customerSession?.user?.id}
              transactions={transactions} 
              onReorder={handleReorder}
            />
          )}

          {storefrontTab === 'profile' && (
            <MyAccount user={customerSession?.user} transactions={transactions} onGoBack={() => setStorefrontTab('home')} />
          )}
        </main>
      </div>

      <PartDetailDrawer
        part={selectedPart}
        nestedCategories={nestedCategories}
        customerSession={customerSession}
        transactions={transactions}
        addToCart={addToCart}
        onClose={() => setSelectedPart(null)}
      />

      {/* Global Footer */}
      <Footer
        className="mt-auto pb-14"
        onOpenPolicy={() => setPolicyModalOpen(true)}
        onGoHome={() => { setStorefrontTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onGoCatalog={() => { setStorefrontTab('catalog'); document.getElementById('parts-catalog')?.scrollIntoView({ behavior: 'smooth' }); }}
        onGoAbout={() => { setStorefrontTab('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-secondary/90 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-2xl text-center overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="mx-auto w-20 h-20 bg-background rounded-full border border-border/50 flex items-center justify-center shadow-sm mb-6 relative">
                <CheckCircle weight="fill" className="w-10 h-10 text-emerald-500 relative z-10" />
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 bg-emerald-500/20 rounded-full pointer-events-none"
                />
              </div>

              <h2 className="text-2xl font-bold font-display text-foreground mb-2">Order Confirmed!</h2>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Your order has been successfully placed. You will receive an email confirmation containing your receipt and tracking details shortly.
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 rounded-xl bg-foreground text-background font-bold hover:bg-accent hover:text-foreground hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Track My Order
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Policy Modal */}
      <ReturnPolicyModal 
        isOpen={policyModalOpen} 
        onClose={() => setPolicyModalOpen(false)} 
      />

      {/* Sliding Cart Modal */}
      <CartDrawer 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        cartTotalItems={cartTotalItems}
        cartTotalAmount={cartTotalAmount}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        handleCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />
    </div>
  );
}

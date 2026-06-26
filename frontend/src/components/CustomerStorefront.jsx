import React, { useMemo, useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ArrowRight, SignIn, MagnifyingGlass, ShieldCheck, Sparkle, Tag, Truck, UserPlus, X, Moon, Sun, SquaresFour, Gear, Pulse, Lightning, CarProfile, Faders, ShoppingCart, Plus, Minus, Trash } from '@phosphor-icons/react';
import Logo from './Logo';
import Footer from './Footer';
import { getCategoryIconAndColor, getCategoryPlaceholder } from '../utils/categoryIcons';
import { stripePromise } from '../stripe';
import { auth } from '../firebaseConfig';
export default function CustomerStorefront({
  parts,
  categories,
  customerSession,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  onLogoutCustomer,
  isDarkMode,
  setIsDarkMode
}) {
  const { formatCurrency, displayCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPart, setSelectedPart] = useState(null);
  const [storefrontTab, setStorefrontTab] = useState('home');
  const [sortOrder, setSortOrder] = useState('recommended');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [compatibilityFilter, setCompatibilityFilter] = useState('All');
  const [stockStatus, setStockStatus] = useState('All');

  // Autocomplete, Pagination, Stock sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const itemsPerPage = 12;

  // Cart States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const cartTotalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartTotalItems = cart.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (part) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === part.id);
      if (existing) {
        if (existing.quantity >= part.stock) return prev;
        return prev.map(item => item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...part, quantity: 1 }];
    });
  };

  const removeFromCart = (partId) => {
    setCart(prev => prev.filter(item => item.id !== partId));
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
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ items: cart }),
      });
      
      const session = await response.json();
      if (session.error) throw new Error(session.error);

      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to initiate checkout. Please try again.');
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

  const TRUCK_BRANDS = [
    { id: 'All', label: 'All Brands' },
    { id: 'ISZ', label: 'Isuzu' },
    { id: 'HNO', label: 'Hino' },
    { id: 'MIT', label: 'Mitsubishi Fuso' },
    { id: 'TOY', label: 'Toyota Dyna' }
  ];

  const getCategoryStyles = (cat) => {
    const { Icon, color } = getCategoryIconAndColor(cat);
    return { icon: Icon, color, bg: '' };
  };

  const filteredParts = useMemo(() => {
    let result = parts.filter((part) => {
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        part.name.toLowerCase().includes(searchValue) ||
        part.sku.toLowerCase().includes(searchValue) ||
        part.oem.toLowerCase().includes(searchValue) ||
        (part.compatibility || '').toLowerCase().includes(searchValue);
      const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
      const matchesMinPrice = minPrice === '' || part.price >= parseFloat(minPrice);
      const matchesMaxPrice = maxPrice === '' || part.price <= parseFloat(maxPrice);
      
      let matchesStock = true;
      if (stockStatus === 'In Stock') matchesStock = part.stock > 0;
      else if (stockStatus === 'Low Stock') matchesStock = part.stock > 0 && part.stock <= part.minStock;

      let matchesBrand = true;
      if (compatibilityFilter !== 'All') {
        const brandObj = TRUCK_BRANDS.find(b => b.id === compatibilityFilter);
        const brandName = brandObj ? brandObj.label.split(' ')[0].toLowerCase() : '';
        matchesBrand = (part.compatibility || '').toLowerCase().includes(brandName);
      }

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesStock && matchesBrand;
    });

    if (sortOrder === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortOrder === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortOrder === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === 'stock-desc') result.sort((a, b) => b.stock - a.stock);
    else if (sortOrder === 'stock-asc') result.sort((a, b) => a.stock - b.stock);

    return result;
  }, [parts, search, selectedCategory, sortOrder, minPrice, maxPrice, stockStatus, compatibilityFilter]);

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParts, currentPage]);

  const spotlightParts = useMemo(() => {
    return [...parts]
      .sort((left, right) => {
        const leftLowStock = left.stock <= left.minStock ? 1 : 0;
        const rightLowStock = right.stock <= right.minStock ? 1 : 0;
        return rightLowStock - leftLowStock || right.price - left.price;
      })
      .slice(0, 3);
  }, [parts]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 rounded-3xl border border-border bg-background px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Logo className="w-12 h-12" showText={true} />
              <div className="flex items-center gap-2 lg:hidden">
                <button onClick={() => onOpenCustomerAuth('login')} className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Login
                </button>
                <button onClick={() => onOpenCustomerAuth('register')} className="rounded-full border border-accent/30 bg-accent/10 dark:bg-accent/20 px-3 py-2 text-xs font-semibold text-accent dark:text-red-300 transition hover:bg-accent/20 dark:hover:bg-accent/30">
                  Register
                </button>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
              {[
                { id: 'home', label: 'Home' },
                { id: 'catalog', label: 'Parts Catalog' },
                { id: 'about', label: 'About Us' },
                { id: 'contact', label: 'Contact Us' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setStorefrontTab(item.id)}
                  className={`rounded-full border px-4 py-2 transition-all duration-250 ${
                    storefrontTab === item.id
                      ? 'border-accent/30 bg-accent/10 dark:bg-accent/20 text-accent dark:text-red-300 font-bold'
                      : 'border-border bg-background text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              {customerSession ? (
                <>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Signed in</p>
                    <p className="text-sm font-semibold text-foreground">{customerSession.user.fullName}</p>
                  </div>
                  <button
                    onClick={onLogoutCustomer}
                    className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border hover:bg-secondary"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onOpenCustomerAuth('login')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-border hover:bg-secondary"
                  >
                    <SignIn weight="duotone" className="h-4 w-4" />
                    Login
                  </button>
                  <button
                    onClick={() => onOpenCustomerAuth('register')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 dark:bg-accent/20 px-4 py-2 text-sm font-semibold text-accent dark:text-red-300 transition hover:bg-accent/20 dark:hover:bg-accent/30"
                  >
                    <UserPlus weight="duotone" className="h-4 w-4" />
                    Register
                  </button>
                </>
              )}
              
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-2xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-all ml-2"
                aria-label="View Cart"
              >
                <ShoppingCart weight="duotone" className="w-5 h-5" />
                {cartTotalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {cartTotalItems}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-2xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-all ml-2"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun weight="duotone" className="w-4 h-4" /> : <Moon weight="duotone" className="w-4 h-4" />}
              </button>

              <button
                onClick={onOpenAdminAuth}
                className="inline-flex items-center gap-2 rounded-2xl border border-brandBlue-500/30 bg-brandBlue-500/10 dark:border-brandBlue-700/40 dark:bg-brandBlue-900/30 px-4 py-2 text-sm font-semibold text-brandBlue-600 dark:text-brandBlue-200 transition hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-900/50"
              >
                <ShieldCheck weight="duotone" className="h-4 w-4" />
                Admin login
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-8 pb-10">
          {storefrontTab === 'home' && (
            <>
              <section className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-8 lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.1),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.15),_transparent_30%)]" />
                <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                  <div className="space-y-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                      <Sparkle weight="duotone" className="h-4 w-4 text-accent" />
                      premium truck parts marketplace
                    </span>
                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                        Browse truck parts like a modern retail store.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Search OEM-compatible parts, explore collections, and register a customer account with email verification when you want to keep track of your purchases.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => onOpenCustomerAuth('register')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 dark:bg-accent/20 px-5 py-3 text-sm font-bold text-accent dark:text-red-300 transition hover:bg-accent/20 dark:hover:bg-accent/30"
                      >
                        <UserPlus weight="duotone" className="h-4 w-4" />
                        Customer registration
                      </button>
                      <button
                        onClick={() => onOpenCustomerAuth('login')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-slate-600 hover:bg-secondary"
                      >
                        <SignIn weight="duotone" className="h-4 w-4" />
                        Customer login
                      </button>
                      <button
                        onClick={() => setStorefrontTab('catalog')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-brandBlue-500/30 bg-brandBlue-500/10 dark:border-brandBlue-700/40 dark:bg-brandBlue-900/30 px-5 py-3 text-sm font-semibold text-brandBlue-600 dark:text-brandBlue-200 transition hover:bg-brandBlue-500/20 dark:hover:bg-brandBlue-900/50"
                      >
                        Browse Catalog
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: 'Catalog items', value: `${parts.length}` },
                        { label: 'Collections', value: `${categories.length - 1}` },
                        { label: 'Verified access', value: customerSession ? 'Active' : 'Available' }
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border bg-background/50 px-4 py-4 backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-2xl font-black text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {spotlightParts.map((part, index) => (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelectedPart(part)}
                        className={`group rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-1 hover:border-red-500/30 flex flex-col h-full ${index === 0 ? 'border-red-500/20 bg-red-500/10' : 'border-border bg-secondary'}`}
                      >
                        {/* Label + Name — full width, no competition */}
                        <div className="space-y-1 mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brandBlue-500 dark:text-brandBlue-300">Featured</p>
                          <h3 className="text-xl font-bold leading-tight text-foreground">{part.name}</h3>
                        </div>

                        {/* Category badge */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1">
                          <Tag weight="duotone" className="h-4 w-4 text-accent" />
                          {part.category}
                        </div>

                        {/* Footer: price + stock + quick view */}
                        <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Price</p>
                            <p className="text-base font-black leading-none text-foreground">{formatCurrency(part.price)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Stock</p>
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-brandBlue-500 dark:text-brandBlue-300 transition group-hover:translate-x-1">
                              {part.stock} left <ArrowRight weight="duotone" className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Quick welcome overview */}
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-3xl border border-border bg-secondary p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-brandBlue-500/10 dark:bg-brandBlue-900/30 border border-brandBlue-500/30 dark:border-brandBlue-800/30 text-brandBlue-600 dark:text-brandBlue-400 rounded-2xl inline-block mb-4">
                      <Truck weight="duotone" className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground">Browse Full Catalog</h3>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                      Search through hundreds of parts matching various truck models. Find immediate filter controls by type and compatibility tags.
                    </p>
                  </div>
                  <button onClick={() => setStorefrontTab('catalog')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Explore catalog <ArrowRight weight="duotone" className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-secondary p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-2xl inline-block mb-4">
                      <Sparkle weight="duotone" className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground">Learn About Us</h3>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                      Tarlac Truck Pitstop delivers premium truck spares citywide. Find out more about our warranty, wholesale rates, and location details.
                    </p>
                  </div>
                  <button onClick={() => setStorefrontTab('about')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Read about us <ArrowRight weight="duotone" className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-secondary p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-secondary border border-border text-muted-foreground rounded-2xl inline-block mb-4">
                      <UserPlus weight="duotone" className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-bold text-foreground">Customer Account</h3>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                      Register a secure login to check parts inventories, save truck models, and secure priority wholesale reservations.
                    </p>
                  </div>
                  <button onClick={() => onOpenCustomerAuth('register')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Create account <ArrowRight weight="duotone" className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </>
          )}

          {storefrontTab === 'catalog' && (
            <>
              <section className="rounded-[1.75rem] border border-border bg-secondary p-4 backdrop-blur sm:p-5 space-y-4">
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                  <div className="flex items-center gap-3 w-full xl:max-w-xl">
                    <div className="relative w-full">
                      <MagnifyingGlass weight="duotone" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search by part name, SKU, OEM, or fitment"
                        className="w-full rounded-2xl border border-border bg-background py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-secondary p-2 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
                          {suggestions.map((s, idx) => (
                            <li key={idx}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearch(s);
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                              >
                                {s}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={`shrink-0 flex items-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${showFilters ? 'bg-accent/10 border-accent/30 text-accent dark:text-red-300' : 'bg-background border-border text-foreground hover:bg-background/80'}`}
                    >
                      <Faders weight="duotone" className="w-4 h-4" />
                      Filters
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {categories.map((category) => {
                      const { icon: CatIcon, color, bg } = getCategoryStyles(category);
                      return (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${selectedCategory === category ? 'border-accent/40 bg-accent/10 dark:bg-accent/20 text-accent dark:text-red-300' : 'border-border bg-background text-muted-foreground hover:border-border hover:text-foreground'}`}
                        >
                          {CatIcon && <CatIcon weight="duotone" className={`w-4 h-4 ${selectedCategory === category ? 'text-accent dark:text-red-300' : color}`} />}
                          {category}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {showFilters && (
                  <div className="flex flex-col lg:flex-row gap-6 pt-6 border-t border-border mt-4">
                    <div className="lg:w-48 shrink-0 space-y-1 mt-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-foreground">Advanced Filters</p>
                    </div>

                    <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Truck Brand</label>
                        <div className="grid grid-cols-2 gap-2">
                          {TRUCK_BRANDS.slice(1).map(brand => (
                            <button
                              key={brand.id}
                              onClick={() => setCompatibilityFilter(brand.id)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-bold transition ${compatibilityFilter === brand.id ? 'bg-accent/10 border-accent/30 text-accent dark:text-red-300' : 'bg-background border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'}`}
                            >
                              <Truck weight={compatibilityFilter === brand.id ? "fill" : "duotone"} className="w-4 h-4 mb-1" />
                              {brand.id}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price Range (₱)</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            placeholder="Min" 
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                          <span className="text-muted-foreground">-</span>
                          <input 
                            type="number" 
                            placeholder="Max" 
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Availability</label>
                        <select 
                          value={stockStatus}
                          onChange={(e) => setStockStatus(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          <option value="All">All Items</option>
                          <option value="In Stock">In Stock Only</option>
                          <option value="Low Stock">Low Stock Alert</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort By</label>
                        <select 
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          <option value="recommended">Recommended</option>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                          <option value="name-asc">Name: A to Z</option>
                          <option value="name-desc">Name: Z to A</option>
                          <option value="stock-desc">Stock: High to Low</option>
                          <option value="stock-asc">Stock: Low to High</option>
                        </select>
                      </div>

                      {(minPrice || maxPrice || stockStatus !== 'All' || sortOrder !== 'recommended' || compatibilityFilter !== 'All') && (
                        <div className="sm:col-span-2 lg:col-span-4 pt-2 flex justify-end border-t border-border mt-2">
                          <button 
                            onClick={() => { setMinPrice(''); setMaxPrice(''); setStockStatus('All'); setSortOrder('recommended'); setCompatibilityFilter('All'); }}
                            className="text-[10px] uppercase tracking-[0.1em] font-bold text-red-500 hover:text-red-400 border border-red-500/30 bg-red-500/10 px-4 py-2 rounded-xl transition"
                          >
                            Clear Filters
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section className="grid gap-5 lg:grid-cols-12">
                <div className="lg:col-span-12">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display">Shop catalog</p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground font-display">Popular parts for customer browsing</h2>
                    </div>
                    <div className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
                      {filteredParts.length} results
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedParts.map((part) => {
                      const { icon: CatIcon, color, bg } = getCategoryStyles(part.category);
                      return (
                        <article
                          key={part.id}
                          className="group overflow-hidden rounded-[1.75rem] border border-border bg-secondary transition hover:-translate-y-1 hover:border-red-500/30 flex flex-col h-full"
                        >
                          <div className="relative h-40 shrink-0 overflow-hidden bg-slate-900 border-b border-border/10 flex items-center justify-center">
                            {part.image ? (
                              <img src={part.image} alt={part.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <img src={getCategoryPlaceholder(part.category)} alt={part.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                            )}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0.4)_100%)]" />
                            <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] shadow-lg backdrop-blur-md ${bg} ${color}`}>
                              {CatIcon && <CatIcon weight="duotone" className="w-3.5 h-3.5" />}
                              {part.category}
                            </div>
                            <div className="absolute bottom-4 right-4 rounded-2xl border border-border bg-background px-3 py-2 text-right shadow-sm">
                              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Price</p>
                              <p className="text-lg font-black text-foreground">{formatCurrency(part.price)}</p>
                            </div>
                          </div>

                          <div className="flex flex-col flex-1 p-5 gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-foreground">{part.name}</h3>
                              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">SKU {part.sku}</p>
                            </div>

                            <p className="text-sm leading-6 text-muted-foreground flex-1">{part.description}</p>

                          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                            <span className="inline-flex items-center gap-1">
                              <Truck weight="duotone" className="h-4 w-4 text-brandBlue-500 dark:text-brandBlue-300" />
                              <span className="line-clamp-1">{part.compatibility}</span>
                            </span>
                            <span className={`shrink-0 ${part.stock <= part.minStock ? 'font-bold text-red-400' : 'text-muted-foreground'}`}>
                              {part.stock} available
                            </span>
                          </div>

                          <div className="mt-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addToCart(part)}
                              disabled={part.stock === 0}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brandBlue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brandBlue-500 disabled:opacity-50"
                            >
                              <ShoppingCart weight="fill" className="h-4 w-4" />
                              {part.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPart(part)}
                              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background p-3 text-foreground transition hover:bg-secondary"
                              aria-label="View details"
                            >
                              <ArrowRight weight="bold" className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {Math.ceil(filteredParts.length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-slate-200/20 dark:border-slate-800/40">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.ceil(filteredParts.length / itemsPerPage) }, (_, i) => i + 1).map(pageNumber => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                            currentPage === pageNumber
                              ? 'bg-accent text-white font-extrabold shadow-md shadow-accent/20'
                              : 'border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredParts.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredParts.length / itemsPerPage)}
                        className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {storefrontTab === 'about' && (
            <section className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.12),_transparent_30%)] pointer-events-none" />
              <div className="relative z-10 max-w-3xl space-y-6">
                <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider inline-block">
                  Premium Truck Spare Parts
                </span>
                <h2 className="text-4xl font-bold tracking-tight text-foreground font-display">
                  Tarlac Truck Pitstop
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Tarlac Truck Pitstop is the region's trusted supplier of high-quality replacement parts, accessories, and maintenance solutions for heavy commercial trucks and cargo transport fleets. Based in the heart of Tarlac City, we support individual operators and corporate logistics networks across the province and surrounding regions.
                </p>
              </div>

              <div className="relative z-10 mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="p-3 bg-brandBlue-500/10 dark:bg-brandBlue-900/30 border border-brandBlue-500/30 dark:border-brandBlue-800/30 text-brandBlue-600 dark:text-brandBlue-400 rounded-xl inline-block mb-4">
                    <Truck weight="duotone" className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">Fleet Compatibility Fits</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Our comprehensive database enables parts tracking tailored precisely for major commercial makes, including Isuzu (N-Series, F-Series), Hino, Mitsubishi Fuso, and Toyota Dyna models.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-xl inline-block mb-4">
                    <Tag weight="duotone" className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">VIP Wholesale Pricing</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    We specialize in bulk quantity contracts and retail components. Authorized customer accounts gain access to prioritized parts reservations and special fleet pricing matrices.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-6">
                  <div className="p-3 bg-secondary border border-border text-muted-foreground rounded-xl inline-block mb-4">
                    <ShieldCheck weight="duotone" className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">OEM Certified Sourcing</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    We prioritize equipment integrity and safety. Our replacement parts inventory is strictly cataloged by original manufacturer OEM part numbers, guaranteeing standard fitment and endurance.
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-12 rounded-3xl border border-border bg-secondary p-6 lg:p-8">
                <h3 className="text-xl font-bold text-foreground">Our Mission & Values</h3>
                <div className="grid gap-6 mt-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-bold text-accent text-sm uppercase tracking-wider">Unmatched Reliability</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      We know that downtime means lost revenue. That's why we maintain a high-fill stock rate of critical braking, filtration, transmission, and electrical components.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-accent text-sm uppercase tracking-wider">Logistics Integration</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Located along major regional transport arteries, we facilitate swift order preparation and delivery to keep Tarlac's trucking and cargo lines moving forward.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {storefrontTab === 'contact' && (
            <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-border bg-secondary p-6">
                  <h3 className="text-xl font-bold text-foreground">Get in Touch</h3>
                  <p className="text-xs text-muted-foreground mt-1">Have compatibility questions or wholesale catalog inquiries? Contact our team directly.</p>

                  <div className="mt-6 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border border-border text-muted-foreground rounded-lg">
                        <Truck weight="duotone" className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Store Address</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tarlac Truck Pitstop Building, McArthur Highway,<br />
                          Tarlac City, 2300 Tarlac, Philippines
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border border-border text-muted-foreground rounded-lg">
                        <SignIn weight="duotone" className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Business Hours</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Monday - Saturday: 8:00 AM - 5:00 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border border-border text-muted-foreground rounded-lg">
                        <ShieldCheck weight="duotone" className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Direct Contact</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Phone: +63 45 982 1234<br />
                          Mobile: +63 917 123 4567<br />
                          Email: info@tarlactruckparts.local
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-border bg-secondary p-6">
                  <h4 className="font-bold text-foreground text-sm">Quick Reservation Notice</h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Registered customers can view live stock figures and immediately lock prices for counter pickups. Create an account to check your pricing tier options.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-secondary p-6 sm:p-8">
                <h3 className="text-xl font-bold text-foreground">Send an Inquiry</h3>
                <p className="text-xs text-muted-foreground mt-1">Fill out the quick template below and our sales desk will email or call you back.</p>

                <form onSubmit={(e) => { e.preventDefault(); alert('Your inquiry has been sent! Our representative will contact you shortly.'); }} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Name</label>
                      <input required className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent" placeholder="Prime, Optimus" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Number</label>
                      <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent" placeholder="09-AUTOBOTS" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <input required type="email" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent" placeholder="leader@autobots.cybertron" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inquiry Subject</label>
                    <select className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground outline-none focus:border-accent">
                      <option>Product Compatibility Check</option>
                      <option>VIP Wholesale Contract Application</option>
                      <option>Specific OEM Sourcing Request</option>
                      <option>General Quotation / Feedback</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message details</label>
                    <textarea required rows={4} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent resize-none" placeholder="Do you have a replacement Matrix of Leadership in stock? It broke again..." />
                  </div>

                  <button type="submit" className="w-full py-3 rounded-xl border border-accent/30 bg-accent/10 dark:bg-accent/20 text-accent dark:text-red-300 font-bold hover:bg-accent/20 dark:hover:bg-accent/30 transition text-sm">
                    Submit Inquiry Template
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
        <Footer />
      </div>

      {selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-secondary p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brandBlue-500 dark:text-brandBlue-300">Product detail</p>
                <h3 className="mt-2 text-2xl font-bold text-foreground">{selectedPart.name}</h3>
              </div>
              <button onClick={() => setSelectedPart(null)} className="rounded-full border border-border p-2 text-muted-foreground transition hover:border-border hover:text-foreground">
                <X weight="duotone" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-background p-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Compatibility</p>
                <p className="mt-2 text-sm text-foreground">{selectedPart.compatibility}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Description</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedPart.description}</p>
              </div>

              <div className="rounded-3xl border border-border bg-background p-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Catalog info</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span>SKU</span>
                    <span className="font-mono text-foreground">{selectedPart.sku}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>OEM</span>
                    <span className="font-mono text-foreground">{selectedPart.oem}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Stock</span>
                    <span className="text-foreground">{selectedPart.stock}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Price</span>
                    <span className="text-foreground">{formatCurrency(selectedPart.price)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => { addToCart(selectedPart); setSelectedPart(null); }}
                disabled={selectedPart.stock === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brandBlue-600 px-5 py-4 text-base font-bold text-white transition hover:bg-brandBlue-500 disabled:opacity-50"
              >
                <ShoppingCart weight="fill" className="h-5 w-5" />
                {selectedPart.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sliding Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-card shadow-2xl h-full flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="text-2xl font-bold text-foreground inline-flex items-center gap-3">
                <ShoppingCart weight="duotone" className="h-7 w-7 text-brandBlue-500" />
                Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground">
                <X weight="duotone" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <ShoppingCart weight="duotone" className="h-20 w-20 text-muted-foreground" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border p-3 bg-background">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{displayCurrency} {item.price}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-1">
                      <button onClick={() => updateCartQuantity(item.id, -1, item.stock)} className="p-1 hover:bg-background rounded-lg"><Minus weight="bold" className="w-3 h-3"/></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1, item.stock)} className="p-1 hover:bg-background rounded-lg"><Plus weight="bold" className="w-3 h-3"/></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl">
                      <Trash weight="duotone" className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-border p-6 bg-secondary/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-muted-foreground">Total ({cartTotalItems} items)</span>
                  <span className="text-xl font-bold text-foreground">{formatCurrency(cartTotalAmount)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full rounded-2xl bg-brandBlue-600 px-5 py-4 text-center text-sm font-bold text-white hover:bg-brandBlue-500 disabled:opacity-50 transition"
                >
                  {isCheckingOut ? 'Loading Stripe...' : 'Checkout securely with Stripe'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { ArrowRight, SignIn, MagnifyingGlass, ShieldCheck, Sparkle, Tag, Truck, UserPlus, X, Moon, Sun, SquaresFour, Gear, Activity, Lightning, CarProfile } from '@phosphor-icons/react';
import Logo from './Logo';

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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPart, setSelectedPart] = useState(null);
  const [storefrontTab, setStorefrontTab] = useState('home');

  const getCategoryStyles = (cat) => {
    switch (cat) {
      case 'Engine': return { icon: Gear, color: 'text-red-500', bg: 'bg-red-500/10' };
      case 'Transmission': return { icon: Gear, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'Brakes': return { icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'Suspension': return { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'Electrical': return { icon: Lightning, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'Body & Exterior': return { icon: CarProfile, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'All': return { icon: SquaresFour, color: 'text-slate-500', bg: 'bg-slate-500/10' };
      default: return { icon: Tag, color: 'text-slate-500', bg: 'bg-slate-500/10' };
    }
  };

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        part.name.toLowerCase().includes(searchValue) ||
        part.sku.toLowerCase().includes(searchValue) ||
        part.oem.toLowerCase().includes(searchValue) ||
        (part.compatibility || '').toLowerCase().includes(searchValue);
      const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [parts, search, selectedCategory]);

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
                <button onClick={() => onOpenCustomerAuth('register')} className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white">
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
                      ? 'border-accent bg-accent/10 text-white font-bold'
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
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    <UserPlus weight="duotone" className="h-4 w-4" />
                    Register
                  </button>
                </>
              )}
              
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
                      <h1 className="max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                        Browse truck parts like a modern retail store.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Search OEM-compatible parts, explore collections, and register a customer account with email verification when you want to keep track of your purchases.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => onOpenCustomerAuth('register')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
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
                          <h3 className="text-xl font-extrabold leading-tight text-foreground line-clamp-2">{part.name}</h3>
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
                            <p className="text-base font-black leading-none text-foreground">₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
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
                    <h3 className="text-lg font-extrabold text-foreground">Browse Full Catalog</h3>
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
                    <h3 className="text-lg font-extrabold text-foreground">Learn About Us</h3>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">
                      Tarlac Truck Parts delivers premium truck spares citywide. Find out more about our warranty, wholesale rates, and location details.
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
                    <h3 className="text-lg font-extrabold text-foreground">Customer Account</h3>
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
              <section className="grid gap-4 rounded-[1.75rem] border border-border bg-secondary p-4 backdrop-blur sm:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="relative w-full">
                  <MagnifyingGlass weight="duotone" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by part name, SKU, OEM number, or fitment"
                    className="w-full rounded-2xl border border-border bg-background py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const { icon: CatIcon, color, bg } = getCategoryStyles(category);
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${selectedCategory === category ? `border-accent bg-accent text-white` : `border-border bg-background text-muted-foreground hover:border-border hover:text-foreground`}`}
                      >
                        {CatIcon && <CatIcon weight="duotone" className={`w-4 h-4 ${selectedCategory === category ? 'text-white' : color}`} />}
                        {category}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display">Shop catalog</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground font-display">Popular parts for customer browsing</h2>
                    </div>
                    <div className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
                      {filteredParts.length} results
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredParts.map((part) => (
                      <article
                        key={part.id}
                        className="group overflow-hidden rounded-[1.75rem] border border-border bg-secondary transition hover:-translate-y-1 hover:border-red-500/30 flex flex-col h-full"
                      >
                        <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.35),_transparent_38%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]">
                          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.08)_100%)]" />
                          <div className="absolute left-4 top-4 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-foreground">
                            {part.category}
                          </div>
                          <div className="absolute bottom-4 right-4 rounded-2xl border border-border bg-background px-3 py-2 text-right shadow-sm">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Price</p>
                            <p className="text-lg font-black text-foreground">₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 p-5 gap-4">
                          <div>
                            <h3 className="line-clamp-2 text-lg font-extrabold text-foreground">{part.name}</h3>
                            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">SKU {part.sku}</p>
                          </div>

                          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground flex-1">{part.description}</p>

                          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                            <span className="inline-flex items-center gap-1">
                              <Truck weight="duotone" className="h-4 w-4 text-brandBlue-500 dark:text-brandBlue-300" />
                              <span className="line-clamp-1">{part.compatibility}</span>
                            </span>
                            <span className={`shrink-0 ${part.stock <= part.minStock ? 'font-bold text-red-400' : 'text-muted-foreground'}`}>
                              {part.stock} available
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPart(part)}
                            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            View details
                            <ArrowRight weight="duotone" className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="space-y-4 lg:col-span-4">
                  <div className="rounded-[1.75rem] border border-border bg-secondary p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Customer access</p>
                    <h3 className="mt-2 text-2xl font-black text-foreground">Register, verify, then keep your session</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Customer registration stays on the frontend for now, but the flow already validates email, password, verification code, and remember-me sessions.
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <button onClick={() => onOpenCustomerAuth('register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent/90">
                        <UserPlus weight="duotone" className="h-4 w-4" />
                        Register or login
                      </button>
                      <button onClick={onOpenAdminAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary">
                        <ShieldCheck weight="duotone" className="h-4 w-4" />
                        Admin portal
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-border bg-secondary p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">What customers see</p>
                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <li>• Searchable parts catalog with retail-style layout</li>
                      <li>• Product cards with pricing, fitment, and stock info</li>
                      <li>• Optional customer account for verification and login</li>
                    </ul>
                  </div>
                </aside>
              </section>
            </>
          )}

          {storefrontTab === 'about' && (
            <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.12),_transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,1))] p-6 sm:p-8 lg:p-10">
              <div className="max-w-3xl space-y-6">
                <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider inline-block">
                  Premium Truck Spare Parts
                </span>
                <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-display">
                  Tarlac Truck Parts
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Tarlac Truck Parts is the region's trusted supplier of high-quality replacement parts, accessories, and maintenance solutions for heavy commercial trucks and cargo transport fleets. Based in the heart of Tarlac City, we support individual operators and corporate logistics networks across the province and surrounding regions.
                </p>
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

              <div className="mt-12 rounded-3xl border border-border bg-secondary p-6 lg:p-8">
                <h3 className="text-xl font-extrabold text-foreground">Our Mission & Values</h3>
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
                  <h3 className="text-xl font-extrabold text-foreground">Get in Touch</h3>
                  <p className="text-xs text-muted-foreground mt-1">Have compatibility questions or wholesale catalog inquiries? Contact our team directly.</p>

                  <div className="mt-6 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border border-border text-muted-foreground rounded-lg">
                        <Truck weight="duotone" className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">Store Address</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tarlac Truck Parts Building, McArthur Highway,<br />
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
                <h3 className="text-xl font-extrabold text-foreground">Send an Inquiry</h3>
                <p className="text-xs text-muted-foreground mt-1">Fill out the quick template below and our sales desk will email or call you back.</p>

                <form onSubmit={(e) => { e.preventDefault(); alert('Your inquiry has been sent! Our representative will contact you shortly.'); }} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Name</label>
                      <input required className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none focus:border-accent" placeholder="Dela Cruz, Juan" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact Number</label>
                      <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none focus:border-accent" placeholder="0917xxxxxxx" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                    <input required type="email" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none focus:border-accent" placeholder="juan.dc@domain.com" />
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
                    <textarea required rows={4} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-slate-600 outline-none focus:border-accent resize-none" placeholder="Provide part description, SKU, OEM, or compatibility question..." />
                  </div>

                  <button type="submit" className="w-full py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition text-sm">
                    Submit Inquiry Template
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>

      {selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-secondary p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brandBlue-500 dark:text-brandBlue-300">Product detail</p>
                <h3 className="mt-2 text-2xl font-black text-foreground">{selectedPart.name}</h3>
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
                    <span className="text-foreground">₱{selectedPart.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

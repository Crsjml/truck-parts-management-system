import React, { useMemo, useState } from 'react';
import { ArrowRight, LogIn, Search, ShieldCheck, Sparkles, Tag, Truck, UserPlus, X } from 'lucide-react';
import Logo from './Logo';

export default function CustomerStorefront({
  parts,
  categories,
  customerSession,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  onLogoutCustomer
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPart, setSelectedPart] = useState(null);
  const [storefrontTab, setStorefrontTab] = useState('home');

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 rounded-3xl border border-slate-800/70 bg-slate-950/80 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Logo className="w-12 h-12" showText={true} />
              <div className="flex items-center gap-2 lg:hidden">
                <button onClick={() => onOpenCustomerAuth('login')} className="rounded-full border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300">
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
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
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
                    <p className="text-sm font-semibold text-white">{customerSession.user.fullName}</p>
                  </div>
                  <button
                    onClick={onLogoutCustomer}
                    className="rounded-2xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onOpenCustomerAuth('login')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-900/60"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                  <button
                    onClick={() => onOpenCustomerAuth('register')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
                  >
                    <UserPlus className="h-4 w-4" />
                    Register
                  </button>
                </>
              )}
              <button
                onClick={onOpenAdminAuth}
                className="inline-flex items-center gap-2 rounded-2xl border border-brandBlue-700/40 bg-brandBlue-900/30 px-4 py-2 text-sm font-semibold text-brandBlue-200 transition hover:bg-brandBlue-900/50"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin login
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-8 pb-10">
          {storefrontTab === 'home' && (
            <>
              <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/70 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.22),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,1))] p-6 sm:p-8 lg:p-10">
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_22%,rgba(255,255,255,0.03)_100%)]" />
                <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                  <div className="space-y-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-300">
                      <Sparkles className="h-4 w-4 text-accent" />
                      premium truck parts marketplace
                    </span>
                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Browse truck parts like a modern retail store.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                        Search OEM-compatible parts, explore collections, and register a customer account with email verification when you want to keep track of your purchases.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => onOpenCustomerAuth('register')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
                      >
                        <UserPlus className="h-4 w-4" />
                        Customer registration
                      </button>
                      <button
                        onClick={() => onOpenCustomerAuth('login')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80"
                      >
                        <LogIn className="h-4 w-4" />
                        Customer login
                      </button>
                      <button
                        onClick={() => setStorefrontTab('catalog')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-brandBlue-700/40 bg-brandBlue-900/30 px-5 py-3 text-sm font-semibold text-brandBlue-200 transition hover:bg-brandBlue-900/50"
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
                        <div key={item.label} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 backdrop-blur">
                          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
                          <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
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
                        className={`group rounded-[1.75rem] border p-5 text-left transition hover:-translate-y-1 hover:border-red-500/30 ${index === 0 ? 'border-red-500/20 bg-red-500/10' : 'border-slate-800 bg-slate-900/70'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brandBlue-300">Featured</p>
                            <h3 className="mt-2 text-xl font-extrabold leading-tight text-white">{part.name}</h3>
                          </div>
                          <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-right shadow-lg shadow-black/20">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Price</p>
                            <p className="mt-0.5 text-lg font-black leading-none text-white">₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                          <Tag className="h-4 w-4 text-accent" />
                          {part.category}
                        </div>
                        <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
                          <span>{part.stock} in stock</span>
                          <span className="inline-flex items-center gap-1 text-brandBlue-300 transition group-hover:translate-x-1">
                            Quick view <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Quick welcome overview */}
              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-brandBlue-900/30 border border-brandBlue-800/30 text-brandBlue-400 rounded-2xl inline-block mb-4">
                      <Truck className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-extrabold text-white">Browse Full Catalog</h3>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                      Search through hundreds of parts matching various truck models. Find immediate filter controls by type and compatibility tags.
                    </p>
                  </div>
                  <button onClick={() => setStorefrontTab('catalog')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Explore catalog <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 rounded-2xl inline-block mb-4">
                      <Sparkles className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-extrabold text-white">Learn About Us</h3>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                      Tarlac Truck Parts delivers premium truck spares citywide. Find out more about our warranty, wholesale rates, and location details.
                    </p>
                  </div>
                  <button onClick={() => setStorefrontTab('about')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Read about us <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
                  <div>
                    <span className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl inline-block mb-4">
                      <UserPlus className="w-6 h-6" />
                    </span>
                    <h3 className="text-lg font-extrabold text-white">Customer Account</h3>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                      Register a secure login to check parts inventories, save truck models, and secure priority wholesale reservations.
                    </p>
                  </div>
                  <button onClick={() => onOpenCustomerAuth('register')} className="mt-6 flex items-center gap-2 text-xs font-bold text-accent hover:underline">
                    Create account <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </section>
            </>
          )}

          {storefrontTab === 'catalog' && (
            <>
              <section className="grid gap-4 rounded-[1.75rem] border border-slate-800/70 bg-slate-900/70 p-4 backdrop-blur sm:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by part name, SKU, OEM number, or fitment"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3.5 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${selectedCategory === category ? 'border-accent bg-accent text-white' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500 font-outfit">Shop catalog</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-white font-outfit">Popular parts for customer browsing</h2>
                    </div>
                    <div className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-400">
                      {filteredParts.length} results
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredParts.map((part) => (
                      <article
                        key={part.id}
                        className="group overflow-hidden rounded-[1.75rem] border border-slate-800/80 bg-slate-900/80 transition hover:-translate-y-1 hover:border-red-500/30"
                      >
                        <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.35),_transparent_38%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]">
                          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.08)_100%)]" />
                          <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                            {part.category}
                          </div>
                          <div className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-right">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Price</p>
                            <p className="text-lg font-black text-white">₱{part.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div>
                            <h3 className="line-clamp-2 text-lg font-extrabold text-white">{part.name}</h3>
                            <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">SKU {part.sku}</p>
                          </div>

                          <p className="line-clamp-2 text-sm leading-6 text-slate-300">{part.description}</p>

                          <div className="flex items-center justify-between text-sm text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Truck className="h-4 w-4 text-brandBlue-300" />
                              {part.compatibility}
                            </span>
                            <span className={part.stock <= part.minStock ? 'font-bold text-red-400' : 'text-slate-300'}>
                              {part.stock} available
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPart(part)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
                          >
                            View details
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="space-y-4 lg:col-span-4">
                  <div className="rounded-[1.75rem] border border-slate-800/70 bg-slate-900/80 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Customer access</p>
                    <h3 className="mt-2 text-2xl font-black text-white">Register, verify, then keep your session</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Customer registration stays on the frontend for now, but the flow already validates email, password, verification code, and remember-me sessions.
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <button onClick={() => onOpenCustomerAuth('register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent/90">
                        <UserPlus className="h-4 w-4" />
                        Register or login
                      </button>
                      <button onClick={onOpenAdminAuth} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-950/60">
                        <ShieldCheck className="h-4 w-4" />
                        Admin portal
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-800/70 bg-slate-900/80 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">What customers see</p>
                    <ul className="mt-4 space-y-3 text-sm text-slate-300">
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
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/70 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.12),_transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,1))] p-6 sm:p-8 lg:p-10">
              <div className="max-w-3xl space-y-6">
                <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider inline-block">
                  Premium Truck Spare Parts
                </span>
                <h2 className="text-4xl font-extrabold tracking-tight text-white font-outfit">
                  Tarlac Truck Parts
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Tarlac Truck Parts is the region's trusted supplier of high-quality replacement parts, accessories, and maintenance solutions for heavy commercial trucks and cargo transport fleets. Based in the heart of Tarlac City, we support individual operators and corporate logistics networks across the province and surrounding regions.
                </p>
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <div className="p-3 bg-brandBlue-900/30 border border-brandBlue-800/30 text-brandBlue-400 rounded-xl inline-block mb-4">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">Fleet Compatibility Fits</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Our comprehensive database enables parts tracking tailored precisely for major commercial makes, including Isuzu (N-Series, F-Series), Hino, Mitsubishi Fuso, and Toyota Dyna models.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 rounded-xl inline-block mb-4">
                    <Tag className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">VIP Wholesale Pricing</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    We specialize in bulk quantity contracts and retail components. Authorized customer accounts gain access to prioritized parts reservations and special fleet pricing matrices.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                  <div className="p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl inline-block mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">OEM Certified Sourcing</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    We prioritize equipment integrity and safety. Our replacement parts inventory is strictly cataloged by original manufacturer OEM part numbers, guaranteeing standard fitment and endurance.
                  </p>
                </div>
              </div>

              <div className="mt-12 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 lg:p-8">
                <h3 className="text-xl font-extrabold text-white">Our Mission & Values</h3>
                <div className="grid gap-6 mt-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-bold text-accent text-sm uppercase tracking-wider">Unmatched Reliability</h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      We know that downtime means lost revenue. That's why we maintain a high-fill stock rate of critical braking, filtration, transmission, and electrical components.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-accent text-sm uppercase tracking-wider">Logistics Integration</h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
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
                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
                  <h3 className="text-xl font-extrabold text-white">Get in Touch</h3>
                  <p className="text-xs text-slate-400 mt-1">Have compatibility questions or wholesale catalog inquiries? Contact our team directly.</p>

                  <div className="mt-6 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Store Address</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Tarlac Truck Parts Building, McArthur Highway,<br />
                          Tarlac City, 2300 Tarlac, Philippines
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Business Hours</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Monday - Saturday: 8:00 AM - 5:00 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">Direct Contact</h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Phone: +63 45 982 1234<br />
                          Mobile: +63 917 123 4567<br />
                          Email: info@tarlactruckparts.local
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
                  <h4 className="font-bold text-white text-sm">Quick Reservation Notice</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Registered customers can view live stock figures and immediately lock prices for counter pickups. Create an account to check your pricing tier options.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/80 p-6 sm:p-8">
                <h3 className="text-xl font-extrabold text-white">Send an Inquiry</h3>
                <p className="text-xs text-slate-400 mt-1">Fill out the quick template below and our sales desk will email or call you back.</p>

                <form onSubmit={(e) => { e.preventDefault(); alert('Your inquiry has been sent! Our representative will contact you shortly.'); }} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Your Name</label>
                      <input required className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-accent" placeholder="Dela Cruz, Juan" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Number</label>
                      <input className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-accent" placeholder="0917xxxxxxx" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                    <input required type="email" className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-accent" placeholder="juan.dc@domain.com" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Inquiry Subject</label>
                    <select className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 outline-none focus:border-accent">
                      <option>Product Compatibility Check</option>
                      <option>VIP Wholesale Contract Application</option>
                      <option>Specific OEM Sourcing Request</option>
                      <option>General Quotation / Feedback</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Message details</label>
                    <textarea required rows={4} className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-accent resize-none" placeholder="Provide part description, SKU, OEM, or compatibility question..." />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brandBlue-300">Product detail</p>
                <h3 className="mt-2 text-2xl font-black text-white">{selectedPart.name}</h3>
              </div>
              <button onClick={() => setSelectedPart(null)} className="rounded-full border border-slate-800 p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Compatibility</p>
                <p className="mt-2 text-sm text-slate-200">{selectedPart.compatibility}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Description</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{selectedPart.description}</p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Catalog info</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-4">
                    <span>SKU</span>
                    <span className="font-mono text-slate-100">{selectedPart.sku}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>OEM</span>
                    <span className="font-mono text-slate-100">{selectedPart.oem}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Stock</span>
                    <span className="text-slate-100">{selectedPart.stock}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Price</span>
                    <span className="text-slate-100">₱{selectedPart.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
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

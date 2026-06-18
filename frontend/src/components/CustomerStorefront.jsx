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

            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-slate-300">Parts Catalog</span>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2">OEM Inventory</span>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2">Customer Access</span>
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
                Admin portal
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-8 pb-10">
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
                    onClick={onOpenAdminAuth}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brandBlue-700/40 bg-brandBlue-900/30 px-5 py-3 text-sm font-semibold text-brandBlue-200 transition hover:bg-brandBlue-900/50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin login
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Shop catalog</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Popular parts for customer browsing</h2>
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

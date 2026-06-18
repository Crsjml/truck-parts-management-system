import React from 'react';
import { 
  ShieldAlert, 
  User2, 
  Building2, 
  Truck, 
  Package, 
  BadgePercent, 
  ArrowRight,
  ShieldCheck,
  Wrench,
  LineChart
} from 'lucide-react';
import Logo from './Logo';

export default function WelcomePortal({ onSelectRole }) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 font-sans text-slate-200 relative overflow-y-auto py-12 px-4 md:px-8">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Brand Header */}
      <header className="max-w-7xl w-full mx-auto flex justify-between items-center pb-6 border-b border-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <Logo className="w-12 h-12" showText={true} />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          SYSTEM: ONLINE
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-6xl w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Company Information & Highlights */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider inline-block">
              Premium Truck Spare Parts
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-outfit leading-tight">
              Tarlac Truck Parts
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              We specialize in sourcing and distributing premium grade, heavy-duty truck accessories and spare components. Offering wholesale and retail solutions across Tarlac City and regional logistics networks.
            </p>
          </div>

          {/* Key Value Highlights */}
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <div className="p-2 bg-brandBlue-900/30 border border-brandBlue-800/30 text-brandBlue-400 rounded-lg h-9 w-9 shrink-0 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Fleet Compatibility Fits</h4>
                <p className="text-xs text-slate-400">Tailored replacement components for Isuzu, Hino, Mitsubishi Fuso, and Toyota Dyna models.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 rounded-lg h-9 w-9 shrink-0 flex items-center justify-center">
                <BadgePercent className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">VIP Wholesale Pricing</h4>
                <p className="text-xs text-slate-400">Bulk volume deductibles and quotation rates directly mapped for freight operators.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 bg-slate-900/60 border border-slate-800 text-slate-400 rounded-lg h-9 w-9 shrink-0 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">OEM Certified Sourcing</h4>
                <p className="text-xs text-slate-400">All inventory matches exact manufacturer OEM specifications to guarantee reliability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Role Entry Selector Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-center lg:text-left space-y-1.5">
            <h3 className="text-xl font-bold text-white font-outfit">Choose Portal Gateway</h3>
            <p className="text-xs text-slate-400">Please select your active access gateway below to enter the system dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Portal Option Card */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border-t border-t-brandBlue-500/30 hover:border-t-brandBlue-400 transition-all duration-300 group shadow-lg text-left h-[280px]">
              <div className="space-y-3.5">
                <div className="w-10 h-10 rounded-full bg-brandBlue-900/30 border border-brandBlue-700/30 flex items-center justify-center text-brandBlue-400 font-bold group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brandBlue-400 uppercase tracking-widest block">Client Portal</span>
                  <h4 className="text-lg font-bold text-white mt-0.5 group-hover:text-brandBlue-400 transition-colors font-outfit">Customer Gateway</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    Browse components inventory, verify truck model compatibility, check price catalogs, and request custom wholesale quotes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectRole('customer')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brandBlue-900 hover:bg-brandBlue-800 text-brandBlue-200 border border-brandBlue-700/40 text-xs font-bold rounded-xl transition-all"
              >
                Enter Customer Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Portal Option Card */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border-t border-t-accent/30 hover:border-t-accent transition-all duration-300 group shadow-lg text-left h-[280px]">
              <div className="space-y-3.5">
                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold group-hover:scale-110 transition-transform">
                  <User2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest block">Staff Operations</span>
                  <h4 className="text-lg font-bold text-white mt-0.5 group-hover:text-accent transition-colors font-outfit">Administrator Gateway</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    Manage parts listings, restock quantities, run point-of-sale customer billing checkout checkouts, and view analytical stats.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectRole('admin')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-accent/10"
              >
                Enter Admin Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </main>

      {/* Footer Branding info */}
      <footer className="max-w-7xl w-full mx-auto pt-6 border-t border-slate-900/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 shrink-0 font-semibold">
        <p>© 2026 Tarlac Truck Parts. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5 text-slate-600" /> Wholesale Spare Parts</span>
          <span className="flex items-center gap-1"><LineChart className="w-3.5 h-3.5 text-slate-600" /> Logistics Intelligence</span>
        </div>
      </footer>
    </div>
  );
}

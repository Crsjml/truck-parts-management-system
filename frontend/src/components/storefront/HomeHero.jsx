import React from 'react';
import { ArrowRight, MagnifyingGlass, Truck } from '@phosphor-icons/react';
import { HeroHighlight, Highlight } from '../ui/HeroHighlight';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function HomeHero({
  search,
  setSearch,
  vehicleFilter,
  setVehicleFilter,
  onBrowseCatalog,
  onOpenCustomerAuth,
  onOpenTruckFilter,
  selectedTruckLabel,
  isLoggedIn,
  isTruckFilterOpen = false
}) {
  void vehicleFilter;
  void setVehicleFilter;
  void onOpenCustomerAuth;
  void isLoggedIn;

  const truckLabel = selectedTruckLabel?.trim() || 'Select your truck';

  const shouldReduceMotion = useReducedMotion();

  const heroContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const heroItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
  };

  return (
    <HeroHighlight containerClassName="rounded-[3rem] border border-border/30 p-8 sm:p-12 lg:p-16 shadow-sm">
      <motion.section 
        aria-label="Homepage hero" 
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center"
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={heroContainerVariants}
      >
        <motion.span variants={heroItemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
          <Truck weight="duotone" className="h-4 w-4" />
          fitment-first shopping
        </motion.span>

        <motion.h1 id="home-hero-title" variants={heroItemVariants} className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Start with your truck, then find the <Highlight>right part faster.</Highlight>
        </motion.h1>

        <motion.p variants={heroItemVariants} className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose your truck first so we can guide you to parts that match your fleet before you browse the full catalog.
        </motion.p>

        <motion.div variants={heroItemVariants} className="mt-10 flex w-full max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onOpenTruckFilter}
            aria-expanded={isTruckFilterOpen}
            aria-haspopup="dialog"
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-foreground px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-background shadow-lg shadow-black/10 transition hover:scale-[0.98]"
          >
            <Truck weight="duotone" className="h-5 w-5" />
            {truckLabel}
          </button>

          <button
            type="button"
            onClick={onBrowseCatalog}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-border/60 bg-background/80 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-foreground transition hover:border-accent/40 hover:bg-background"
          >
            Browse Catalog
            <ArrowRight weight="bold" className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div variants={heroItemVariants} className="mt-8 w-full max-w-2xl rounded-[2rem] border border-border/50 bg-background/70 px-5 py-3 shadow-lg shadow-black/5 backdrop-blur">
          <label className="mb-2 block text-left text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground" htmlFor="home-hero-search">
            Search parts
          </label>
          <div className="flex items-center gap-3">
            <MagnifyingGlass weight="bold" className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              id="home-hero-search"
              type="search"
              aria-label="Search parts"
              placeholder="Search part name, SKU, OEM..."
              className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onBrowseCatalog();
                }
              }}
            />
          </div>
        </motion.div>
      </motion.section>
    </HeroHighlight>
  );
}

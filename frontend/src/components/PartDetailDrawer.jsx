import React, { useEffect, useRef, useState } from 'react';
import { X, Tag, CarProfile, ShoppingCart, Plus, Minus, Warning, Star } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { getCategoryIconAndColor, getCategoryPlaceholder, COLOR_THEMES } from '../utils/categoryIcons';
import ReviewSection from './ReviewSection';
import { Drawer } from './ui/Drawer';
import toyotaLogo from '../assets/brands/toyota.svg';
import volvoLogo from '../assets/brands/volvo.svg';
import scaniaLogo from '../assets/brands/scania.svg';
import mitsubishiLogo from '../assets/brands/mitsubishi.svg';

// Real marks only exist for 4 of the 10 catalogue brands (checked against the
// Simple Icons CDN directly) -- Hino and Isuzu, the two most relevant to this
// catalogue, have no free source. BrandMark below falls back to a monogram
// for everything not in this map.
const BRAND_LOGOS = {
  Toyota: toyotaLogo,
  Volvo: volvoLogo,
  Scania: scaniaLogo,
  'Mitsubishi Fuso': mitsubishiLogo,
};

// Deterministic per-brand color so the monogram fallback stays visually
// consistent across renders, reusing the same tinted-chip tokens category
// badges use elsewhere in this drawer.
const BRAND_MONOGRAM_THEME = {
  Freightliner: 'blue',
  Hino: 'red',
  Isuzu: 'orange',
  Kenworth: 'indigo',
  Mack: 'emerald',
  Peterbilt: 'violet',
};

// Compatibility brand names also come from a free-text admin field
// (AddPartDrawer's "Add Row" flow), so match case/whitespace-insensitively
// rather than requiring an exact string match against the maps above.
const normalizeBrandKey = (brand) => (brand || '').trim().toLowerCase();
const BRAND_LOGOS_BY_KEY = Object.fromEntries(
  Object.entries(BRAND_LOGOS).map(([name, logo]) => [normalizeBrandKey(name), logo])
);
const BRAND_MONOGRAM_THEME_BY_KEY = Object.fromEntries(
  Object.entries(BRAND_MONOGRAM_THEME).map(([name, theme]) => [normalizeBrandKey(name), theme])
);

function BrandMark({ brand }) {
  const key = normalizeBrandKey(brand);
  const logo = BRAND_LOGOS_BY_KEY[key];
  if (logo) {
    return (
      <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center text-foreground/70">
        <img src={logo} alt="" aria-hidden="true" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  if (!key || key === 'universal') return null;
  const theme = COLOR_THEMES[BRAND_MONOGRAM_THEME_BY_KEY[key]] || COLOR_THEMES.gray;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${theme}`}
    >
      {brand.charAt(0).toUpperCase()}
    </span>
  );
}

// design-taste-frontend §9.G: em/en-dash banned from shipped UI strings.
// Compatibility year ranges come from seeded data using en-dashes; this is a
// display-only normalization, not a data change (migration stays out of scope).
const toHyphenRange = (value) => (value == null ? value : String(value).replace(/[–—]/g, '-'));

const EXIT_DURATION_MS = 400;
const panelVariants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: EXIT_DURATION_MS / 1000, ease: [0.32, 0.72, 0, 1] },
};

export default function PartDetailDrawer({ part, nestedCategories, customerSession, transactions, addToCart, onClose }) {
  const { formatCurrency } = useSettings();
  const [modalTab, setModalTab] = useState('specs');
  const [modalQuantity, setModalQuantity] = useState(1);
  const [lastPart, setLastPart] = useState(part);
  const specsTabRef = useRef(null);
  const reviewsTabRef = useRef(null);

  useEffect(() => {
    if (part) {
      setLastPart(part);
      setModalQuantity(1);
      setModalTab('specs');
      return;
    }
    // Keep rendering the last part's content through the close animation,
    // then drop it so idle re-renders of the parent (search, filters, etc.)
    // don't keep recomputing this drawer's body while it's fully closed.
    const timeout = setTimeout(() => setLastPart(null), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
    // Deliberately keyed on part?.id, not the part object: parts come from a
    // fresh array on every parent render, so keying on identity would reset
    // quantity/tab on every unrelated re-render while the drawer is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part?.id]);

  const displayPart = part || lastPart;
  if (!displayPart) {
    return <Drawer isOpen={false} onClose={onClose} />;
  }

  const headingId = `part-detail-heading-${displayPart.id}`;
  const specsTabId = `part-detail-tab-specs-${displayPart.id}`;
  const specsPanelId = `part-detail-panel-specs-${displayPart.id}`;
  const reviewsTabId = `part-detail-tab-reviews-${displayPart.id}`;
  const reviewsPanelId = `part-detail-panel-reviews-${displayPart.id}`;

  const cat = nestedCategories.find((c) => c.name === displayPart.category);
  const { Icon: CatIcon, color: catColor } = getCategoryIconAndColor(displayPart.category, cat?.iconName, cat?.colorTheme);

  const available = displayPart.stock - (displayPart.reservedStock || 0);
  const stockState = available === 0 ? 'out' : available <= displayPart.minStock ? 'low' : 'in';
  const stockPill = {
    out: { label: 'Out of stock', classes: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20' },
    low: { label: `Only ${available} left`, classes: 'text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
    in: { label: 'In stock', classes: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  }[stockState];

  const compatRows = displayPart.compatibleWith || [];
  const groupRows = compatRows.length > 5;

  const handleTabKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = modalTab === 'specs' ? 'reviews' : 'specs';
    setModalTab(next);
    (next === 'specs' ? specsTabRef : reviewsTabRef).current?.focus();
  };

  const hasReviews = (displayPart.reviewStats?.totalReviews || 0) > 0;

  return (
    <Drawer
      isOpen={!!part}
      onClose={onClose}
      labelledBy={headingId}
      wrapperClassName="flex justify-end p-4 sm:p-6 lg:p-8"
      overlayClassName="bg-black/40 backdrop-blur-sm"
      panelClassName="relative w-full max-w-3xl rounded-[2.5rem] border border-border/50 bg-secondary/95 backdrop-blur-3xl shadow-2xl flex flex-col h-full overflow-hidden"
      panelVariants={panelVariants}
    >
      {/* Header - Fixed */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-background/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 text-accent dark:bg-accent/20 dark:text-red-300 shrink-0">
            {CatIcon ? <CatIcon weight="duotone" className="w-6 h-6" /> : <Tag weight="duotone" className="w-6 h-6" />}
          </div>
          <div>
            <h3 id={headingId} className="text-xl font-bold text-foreground">{displayPart.name}</h3>
            <div className="mt-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold w-fit ${catColor}`}>
                {CatIcon && <CatIcon weight="duotone" className="w-3 h-3 shrink-0" aria-hidden="true" />}
                <span className="line-clamp-1">{displayPart.category}</span>
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close part details"
          className="rounded-full border border-border bg-background p-2 text-muted-foreground transition hover:border-border hover:text-foreground hover:bg-secondary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X weight="bold" className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs - Fixed */}
      <div role="tablist" aria-label="Part details" className="flex px-6 pt-4 border-b border-border bg-background/30 shrink-0 gap-6">
        <button
          ref={specsTabRef}
          role="tab"
          id={specsTabId}
          aria-selected={modalTab === 'specs'}
          aria-controls={specsPanelId}
          tabIndex={modalTab === 'specs' ? 0 : -1}
          onClick={() => setModalTab('specs')}
          onKeyDown={handleTabKeyDown}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t ${modalTab === 'specs' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Description & Specs
        </button>
        <button
          ref={reviewsTabRef}
          role="tab"
          id={reviewsTabId}
          aria-selected={modalTab === 'reviews'}
          aria-controls={reviewsPanelId}
          tabIndex={modalTab === 'reviews' ? 0 : -1}
          onClick={() => setModalTab('reviews')}
          onKeyDown={handleTabKeyDown}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-t ${modalTab === 'reviews' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Customer Reviews
          {hasReviews && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary border border-border text-xs font-semibold">
              <Star weight="fill" className="w-3 h-3 text-amber-400" aria-hidden="true" />
              {displayPart.reviewStats.averageRating} ({displayPart.reviewStats.totalReviews})
            </span>
          )}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-scroll flex-1 p-6 custom-scrollbar bg-background">
        {modalTab === 'specs' ? (
          <div id={specsPanelId} role="tabpanel" aria-labelledby={specsTabId}>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/50 bg-white/95 shadow-inner overflow-hidden aspect-[4/3] relative flex items-center justify-center p-4 group">
                  {displayPart.image ? (
                    <img
                      src={displayPart.image}
                      alt={displayPart.name}
                      onError={(e) => { e.target.onerror = null; e.target.src = getCategoryPlaceholder(displayPart.category); }}
                      className="object-contain w-full h-full rounded-xl"
                    />
                  ) : (
                    <img src={getCategoryPlaceholder(displayPart.category)} alt={displayPart.name} className="object-contain w-full h-full rounded-xl opacity-80" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <Tag weight="duotone" className="w-4 h-4" aria-hidden="true" /> Product Description
                  </h4>
                  <p className="text-base leading-relaxed text-foreground">{displayPart.description}</p>
                </div>
              </div>

              <div className="space-y-6 min-w-0">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Unit Price</span>
                  <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums break-words">{formatCurrency(displayPart.price)}</span>
                </div>

                <div role="status" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${stockPill.classes}`}>
                  {stockState !== 'in' && <Warning weight="fill" className="w-3.5 h-3.5" aria-hidden="true" />}
                  {stockPill.label}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground text-2xs uppercase tracking-wider block mb-1">SKU</span>
                    <span className="font-mono text-sm font-semibold text-foreground break-all">{displayPart.sku}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-2xs uppercase tracking-wider block mb-1">OEM Part No.</span>
                    <span className="font-mono text-sm font-semibold text-foreground break-all">{displayPart.oem}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                <CarProfile weight="duotone" className="w-4 h-4" aria-hidden="true" /> Vehicle Compatibility
              </h4>
              <div
                role="region"
                aria-label={`Vehicle compatibility table for ${displayPart.name}`}
                tabIndex={0}
                className="rounded-2xl border border-border bg-secondary overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <table className="w-full text-sm text-left">
                  <caption className="sr-only">Vehicle compatibility for {displayPart.name}</caption>
                  <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Make</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Model / Series</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Years</th>
                    </tr>
                  </thead>
                  <tbody className={groupRows ? '' : 'divide-y divide-border'}>
                    {compatRows.length > 0 ? (
                      compatRows.map((comp, idx) => {
                        const isGroupBoundary = groupRows && idx > 0 && comp.brand !== compatRows[idx - 1].brand;
                        return (
                          <tr key={idx} className={`hover:bg-background/50 transition-colors ${isGroupBoundary ? 'border-t border-border' : ''}`}>
                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                              <span className="inline-flex items-center gap-2">
                                <BrandMark brand={comp.brand} />
                                {comp.brand || 'Universal'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{comp.series || 'All Models'}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{toHyphenRange(comp.years || comp.year) || 'Any'}</td>
                          </tr>
                        );
                      })
                    ) : displayPart.compatibility ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-medium text-foreground text-sm leading-relaxed whitespace-pre-wrap">{displayPart.compatibility}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-medium text-foreground">Universal Fit</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div id={reviewsPanelId} role="tabpanel" aria-labelledby={reviewsTabId}>
            <ReviewSection
              partId={displayPart.id}
              currentUserId={customerSession?.user?.id || customerSession?.user?.uid}
              hasPurchased={
                !!customerSession && (transactions || []).some((tx) =>
                  (tx.userId === (customerSession.user?.id || customerSession.user?.uid) ||
                   tx.customerContact === customerSession.user?.email) &&
                  (tx.items || []).some((item) => item.partId === displayPart.id)
                )
              }
            />
          </div>
        )}
      </div>

      {/* Frosted Sticky Footer */}
      <div className="p-6 border-t border-border/50 bg-background/60 backdrop-blur-2xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center bg-secondary/80 rounded-2xl p-2 border border-border/50">
          <button
            type="button"
            onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
            disabled={modalQuantity <= 1 || available === 0}
            aria-label="Decrease quantity"
            className="p-3 bg-background hover:bg-muted rounded-xl shadow-sm transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Minus className="w-5 h-5 text-foreground" aria-hidden="true" />
          </button>
          <span aria-live="polite" className="w-12 text-center font-bold text-lg text-foreground font-display tabular-nums">
            {modalQuantity}
          </span>
          <button
            type="button"
            onClick={() => setModalQuantity((q) => Math.min(available, q + 1))}
            disabled={modalQuantity >= available}
            aria-label="Increase quantity"
            className="p-3 bg-background hover:bg-muted rounded-xl shadow-sm transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="w-5 h-5 text-foreground" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => { addToCart(displayPart, modalQuantity); onClose(); }}
          disabled={available === 0}
          className="w-full sm:flex-1 py-4 bg-accent hover:bg-accent/90 text-white font-black text-lg rounded-2xl shadow-xl shadow-accent/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ShoppingCart weight="bold" className="w-6 h-6" aria-hidden="true" />
          {available === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Drawer>
  );
}

# Landing Page Motion Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the customer storefront landing page (`storefrontTab === 'home'` in `CustomerStorefront.jsx`) the entrance motion, scroll reveals, and a real trusted-brands marquee it currently lacks, so it reads as an alive landing page instead of a static form.

**Architecture:** Additive motion layer only — no content, copy, IA, or route changes. Reuse the project's existing `framer-motion` dependency and the existing `Reveal` whileInView component (`frontend/src/components/ui/Reveal.jsx`) everywhere a scroll-reveal is needed. Add one new CSS keyframe (`marquee`) following the codebase's existing `@layer utilities` convention in `index.css`. `ReorderRail.jsx` already wraps itself in `Reveal` — no changes needed there.

**Tech Stack:** React 18, Tailwind CSS, framer-motion (already installed, no new dependency), existing `ease-out-expo` design token (`cubic-bezier(0.19, 1, 0.22, 1)`, defined in `tailwind.config.js`).

## Global Constraints

- No new npm dependencies (framer-motion already covers every requirement — Option B's GSAP path was explicitly rejected).
- Reuse `frontend/src/components/ui/Reveal.jsx` for every whileInView reveal instead of writing new IntersectionObserver/whileInView code.
- Reuse the existing `ease-out-expo` easing (`cubic-bezier(0.19, 1, 0.22, 1)`) for every new transition, expressed as the array `[0.19, 1, 0.22, 1]` in framer-motion props. Do not invent a different curve.
- Every new animation must respect `prefers-reduced-motion`: use framer-motion's `useReducedMotion()` hook to gate the hero stagger and category crossfade; gate the CSS marquee with a `@media (prefers-reduced-motion: reduce)` block that sets `animation: none`.
- No copy changes. No rewritten headline, card text, category logic, or route/IA changes.
- Animate only `transform` and `opacity` (plus the CSS-only marquee's `filter`/`grayscale` hover, which is not part of the reduced-motion-sensitive path).
- Phosphor icons only (already the case in this file — no new icon library).
- Zero em-dashes in any new or touched copy string.
- One marquee per page (design-taste-frontend §5.D cap) — the Trusted Brands strip is the only one.

## Routing Table (Step 0e, carried from design phase)

| Part | Portal tier | Skills | Why |
|------|-------------|--------|-----|
| Hero (badge/headline/search bar) | Premium | high-end-visual-design, frontend-design, emil-design-eng | Orchestrated entrance stagger |
| "Trusted by Global Fleets" strip | Premium | emil-design-eng, high-end-visual-design, design-taste-frontend | Real marquee, motivated + capped at one per page |
| Value-prop bento (3 cards) | Premium | high-end-visual-design, emil-design-eng, ui-ux-pro-max | whileInView reveal + hover lift |
| Shop-by-Category (tabs + subgrid) | Premium | high-end-visual-design, emil-design-eng | Block reveal + tab-switch crossfade |
| ReorderRail | Premium | high-end-visual-design, emil-design-eng | Already implemented via `Reveal` — no task needed |
| Header/Nav | System | web-design-guidelines, tailwind-design-system | Out of scope — untouched |

---

## File Structure

- **Modify:** `frontend/src/index.css` — add `marquee` keyframe + `.animate-marquee` utility to the existing `@layer utilities` block.
- **Modify:** `frontend/src/components/CustomerStorefront.jsx` — hero stagger, marquee markup, bento reveal, category reveal/crossfade. All within the existing `storefrontTab === 'home'` JSX block (lines ~451-596) and its imports.
- **No changes:** `frontend/src/components/ui/Reveal.jsx`, `frontend/src/components/ReorderRail.jsx` (already correct).

---

### Task 1: Marquee keyframes in `index.css`

**Files:**
- Modify: `frontend/src/index.css:138-146` (end of the existing `@layer utilities` block, right after `.animate-shake`)

**Interfaces:**
- Produces: `.animate-marquee` CSS class, consumed by Task 3 (Trusted Brands strip).

- [ ] **Step 1: Add the keyframe and utility class**

Insert immediately after the `.animate-shake { animation: shake 0.4s ease-in-out; }` block (before the closing `}` of `@layer utilities`, i.e. before line 147):

```css
  @keyframes marquee {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  .animate-marquee {
    animation: marquee 30s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-marquee {
      animation: none;
    }
  }
```

- [ ] **Step 2: Verify**

Run `npm run dev` inside `frontend/`. No build/lint errors from the CSS change (Tailwind's `@layer utilities` accepts nested `@media` blocks — this mirrors the existing `.custom-scrollbar` pattern later in the same file). Nothing visually changes yet since no JSX references `.animate-marquee` until Task 3.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(TTP-172): add marquee keyframe utility"
```
(No dedicated landing-page-motion ticket exists in `docs/jira/jira-breakdown.csv`; TTP-172 — "Migrate CartDrawer onto the shared accessible drawer primitive and improve UI" — was chosen as the closest existing storefront-UI-improvement umbrella. Confirmed with the user; do not substitute a different ID.)

---

### Task 2: Trusted Brands strip becomes a real marquee

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:1-21` (imports, add module-level data)
- Modify: `frontend/src/components/CustomerStorefront.jsx:493-505` (the "Trusted Brands Marquee" block)

**Interfaces:**
- Consumes: `.animate-marquee` from Task 1.
- Produces: `TRUSTED_BRANDS` module-level constant (used only within this file).

- [ ] **Step 1: Add the brand data as a module-level constant**

Add directly below the imports (after line 21, before `export default function CustomerStorefront`):

```jsx
const TRUSTED_BRANDS = [
  { label: 'CUMMINS', className: 'text-xl font-black italic tracking-tighter' },
  { label: 'ISUZU', className: 'text-xl font-black tracking-widest' },
  { label: 'Volvo', className: 'text-xl font-bold uppercase border-2 border-current px-2' },
  { label: 'MACK', className: 'text-xl font-black italic' },
  { label: 'HINO', className: 'text-xl font-bold tracking-widest' },
  { label: 'PACCAR', className: 'text-xl font-bold tracking-tighter' },
];
```

- [ ] **Step 2: Replace the static row with a looping marquee**

Replace this block (current lines 493-505):

```jsx
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
```

With:

```jsx
                {/* Trusted Brands Marquee */}
                <div className="relative z-10 w-full max-w-4xl mb-12 flex flex-col items-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 opacity-70">Trusted by Global Fleets</p>
                  <span className="sr-only">Trusted by Cummins, Isuzu, Volvo, Mack, Hino, and Paccar</span>
                  <div className="w-full overflow-hidden scroll-fade-edges" aria-hidden="true">
                    <div className="flex w-max animate-marquee items-center gap-16 opacity-50 grayscale transition-[filter] duration-700 hover:grayscale-0 hover:[animation-play-state:paused]">
                      {[...TRUSTED_BRANDS, ...TRUSTED_BRANDS].map((brand, i) => (
                        <span key={`${brand.label}-${i}`} className={brand.className}>{brand.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open the storefront home tab. Confirm: the brand row scrolls continuously right-to-left with no visible seam at the loop point, pauses on mouse hover, edges fade via the existing `scroll-fade-edges` mask. In OS accessibility settings, enable "reduce motion", reload — confirm the strip is now static (no scroll).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx
git commit -m "feat(TTP-172): turn trusted-brands strip into a real marquee"
```

---

### Task 3: Hero entrance stagger

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:21` (import `useReducedMotion`)
- Modify: `frontend/src/components/CustomerStorefront.jsx:22-33` (component body, add hook + variants)
- Modify: `frontend/src/components/CustomerStorefront.jsx:454-491` (badge, H1, subtext, search bar)

**Interfaces:**
- Produces: `shouldReduceMotion` boolean, consumed by Task 5's crossfade.

- [ ] **Step 1: Import `useReducedMotion`**

Change line 21 from:

```jsx
import { motion, AnimatePresence } from 'framer-motion';
```

To:

```jsx
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
```

- [ ] **Step 2: Add the hook and variants inside the component**

Directly inside `export default function CustomerStorefront({...}) {`, after the `useSettings()` line (current line 33), add:

```jsx
  const shouldReduceMotion = useReducedMotion();

  const heroContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const heroItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } },
  };
```

- [ ] **Step 3: Wrap the hero's above-fold content in the stagger**

Replace the opening of the hero content (current lines 454-467, the wrapping `div` through the closing of the search-bar `div`) — specifically change:

```jsx
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
```

To:

```jsx
                <motion.div
                  className="flex flex-col items-center text-center w-full z-10"
                  initial={shouldReduceMotion ? false : "hidden"}
                  animate="visible"
                  variants={heroContainerVariants}
                >
                <motion.span variants={heroItemVariants} className="relative z-10 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-md mb-8 shadow-sm">
                  <Sparkle weight="duotone" className="h-4 w-4 text-accent" />
                  premium truck parts marketplace
                </motion.span>
                
                <motion.h1 variants={heroItemVariants} className="relative z-10 max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl mb-6 leading-[1.05]">
                  Find the exact part for your <Highlight>heavy fleet.</Highlight>
                </motion.h1>
                
                <motion.p variants={heroItemVariants} className="relative z-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg mb-12">
                  Search OEM-compatible parts or browse our massive catalog. Create a verified customer account for wholesale pricing, real-time stock alerts, and instant purchase orders.
                </motion.p>

                {/* Search Bar on Hero */}
                <motion.div variants={heroItemVariants} className="relative z-10 w-full max-w-2xl mb-16">
```

- [ ] **Step 4: Close the new `motion.div` wrapper and the search bar's `motion.div`**

The search bar block currently ends at line 491 with a plain `</div>` closing the "Search Bar on Hero" container, immediately followed by the Trusted Brands block from Task 2. Change that one closing tag (the one that matches the `<div className="relative z-10 w-full max-w-2xl mb-16">` opened in Step 3, NOT the button/input divs inside it) from `</div>` to `</motion.div>`.

The outer hero wrapper (opened as `<motion.div className="flex flex-col items-center text-center w-full z-10" ...>` in Step 3) still closes at its original location — current line 583 (`</div>` right before `</HeroHighlight>`). Change that `</div>` to `</motion.div>` too.

- [ ] **Step 5: Verify**

Run `npm run dev`, hard-refresh the storefront home tab. Confirm: badge, headline, subtext, and search bar each fade up in sequence (~80ms apart) on page load, ending within ~1s. Enable OS "reduce motion", reload — confirm all four render immediately with no animation (no layout jump, no delay).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx
git commit -m "feat(TTP-172): stagger hero entrance on landing page"
```

---

### Task 4: Value-prop bento cards — scroll reveal + hover lift

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:1-21` (import `Reveal`)
- Modify: `frontend/src/components/CustomerStorefront.jsx` (module-level `VALUE_PROPS` constant, next to `TRUSTED_BRANDS` from Task 2)
- Modify: `frontend/src/components/CustomerStorefront.jsx:507-530` (the "3-Card Value Proposition Bento" block)

**Interfaces:**
- Consumes: `Reveal` from `frontend/src/components/ui/Reveal.jsx` (props: `children`, `delay`, `className`).

- [ ] **Step 1: Import `Reveal`**

Add near the other local component imports (after the `ReorderRail` import, current line 19):

```jsx
import Reveal from './ui/Reveal';
```

- [ ] **Step 2: Extract the three cards into data**

Add next to `TRUSTED_BRANDS` (module level, below imports):

```jsx
const VALUE_PROPS = [
  { icon: Pulse, title: 'Live Inventory', description: 'Real-time stock levels directly from our Tarlac warehouse.' },
  { icon: Truck, title: 'Heavy Logistics', description: 'Specialized freight handling for oversized engine blocks and chassis parts.' },
  { icon: ClipboardText, title: 'B2B Wholesale', description: 'Exclusive volume discounts and priority allocation for registered fleets.' },
];
```

(`Pulse`, `Truck`, `ClipboardText` are already imported from `@phosphor-icons/react` at line 3 — no new icon import needed.)

- [ ] **Step 3: Replace the hardcoded 3-card grid**

Replace this block (current lines 507-530):

```jsx
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
```

With:

```jsx
                {/* 3-Card Value Proposition Bento */}
                <div className="relative z-10 w-full max-w-5xl mb-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  {VALUE_PROPS.map((item, i) => (
                    <Reveal key={item.title} delay={i * 0.06}>
                      <div className="rounded-[2rem] bg-secondary/80 border border-border/50 p-6 backdrop-blur-md flex flex-col justify-center items-start gap-3 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><item.icon weight="duotone" className="w-5 h-5"/></div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
```

- [ ] **Step 4: Verify**

Run `npm run dev`. Since the bento sits above the fold on most desktop viewports, shrink the browser window (or check on a shorter viewport / mobile emulation) so the cards start outside the viewport, then scroll — confirm the three cards fade+lift in with a ~60ms stagger the first time they enter view, and do not re-animate on subsequent scroll past. Hover each card — confirm it lifts (`-translate-y-1`) with a soft accent-tinted shadow, not a generic dark drop shadow.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx
git commit -m "feat(TTP-172): reveal value-prop bento cards on scroll with hover lift"
```

---

### Task 5: Shop-by-Category — block reveal + tab-switch crossfade

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:533-582` (the "Shop by Category Bento" block)

**Interfaces:**
- Consumes: `Reveal` (Task 4), `shouldReduceMotion` (Task 3), `AnimatePresence`/`motion` (already imported).

- [ ] **Step 1: Wrap the whole category block in `Reveal`**

Change the opening of the block (current line 533):

```jsx
                {/* Shop by Category Bento */}
                <div className="relative z-10 w-full max-w-5xl px-4">
```

To:

```jsx
                {/* Shop by Category Bento */}
                <Reveal className="relative z-10 w-full max-w-5xl px-4">
```

And change its closing tag (current line 582, the `</div>` immediately before the outer hero `</motion.div>` from Task 3) from `</div>` to `</Reveal>`.

- [ ] **Step 2: Crossfade the subcategory grid on tab switch**

Replace this block (current lines 559-581, the "Sub Category Grid" comment through its closing `</div>`):

```jsx
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
```

With:

```jsx
                  {/* Sub Category Grid */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeMainCat}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: [0.19, 1, 0.22, 1] }}
                      className="flex flex-wrap justify-center gap-4 mt-2"
                    >
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
                    </motion.div>
                  </AnimatePresence>
```

- [ ] **Step 3: Verify**

Run `npm run dev`. Scroll to the "Shop by Category" section from outside the viewport — confirm the whole block (tabs + subgrid) fades up once as it enters view. Click between main category tabs — confirm the subcategory grid crossfades (fades out old / fades in new, ~180ms) instead of instantly swapping. Enable OS "reduce motion", reload, repeat the tab-click check — confirm the swap is instant with no fade.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx
git commit -m "feat(TTP-172): reveal category section and crossfade subcategory grid"
```

---

## Self-Review Notes

- **Spec coverage:** All 5 routed parts covered — Hero (Task 3), Trusted strip (Tasks 1-2), Bento (Task 4), Category (Task 5), ReorderRail (already done, no task, confirmed by reading `ReorderRail.jsx`). Header/Nav explicitly out of scope per routing table.
- **Placeholder scan:** No TBD/TODO; every step has full literal code.
- **Type/name consistency:** `shouldReduceMotion` defined once in Task 3, reused as-is (not redeclared) in Task 5. `Reveal` imported once in Task 4, reused as-is in Task 5. `TRUSTED_BRANDS` (Task 2) and `VALUE_PROPS` (Task 4) are independent module-level constants, no naming collision.
- **Scope:** Single subsystem (one file's motion layer + one shared CSS utility) — no decomposition needed.

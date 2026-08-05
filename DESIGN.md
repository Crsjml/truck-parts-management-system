---
name: Tarlac Truck Pitstop
description: Truck-parts fitment engine and shop-floor operations — one system, two speeds.
colors:
  fleet-navy: "hsl(221.2 83.2% 53.3%)"
  signal-red: "hsl(0 72.2% 50.6%)"
  alarm-red: "hsl(0 84.2% 60.2%)"
  paper: "hsl(210 40% 98%)"
  ink: "hsl(222 47% 11%)"
  card-white: "hsl(0 0% 100%)"
  mist: "hsl(210 40% 96.1%)"
  mist-ink: "hsl(215.4 16.3% 46.9%)"
  hairline: "hsl(214.3 31.8% 91.4%)"
  parts-blue: "#2d5382"
  parts-red: "#dc2626"
typography:
  display:
    fontFamily: "Cabinet Grotesk, Space Grotesk, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Satoshi, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "Geist Mono, JetBrains Mono, monospace"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
components:
  card-glass:
    backgroundColor: "rgba(15, 23, 42, 0.02)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  card-glass-hover:
    backgroundColor: "rgba(15, 23, 42, 0.04)"
  drawer-panel:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
---

# Design System: Tarlac Truck Pitstop

## Overview

**Creative North Star: "The Right Fit"**

Everything this system does is a fitment problem solved twice over: parts have to fit the truck, and the interface has to fit whoever's using it — a customer deciding whether a part belongs on their rig, or a staff member moving fast at the counter. The name is doing double duty on purpose: "fit" is the product's actual mechanism (the compatibility engine — this is not a generic parts catalog with a search box), and it's also the design discipline (nothing ships that doesn't fit its tier).

One visual identity, expressed at two different volumes rather than two different brands. **Fleet Navy** and **Signal Red** run through both tiers — navy for trust and structure, red as the accent that means "pay attention here" (stock alerts, destructive actions, urgency). The storefront turns the volume up: glass-panel depth, soft motion, room to breathe. The admin/POS side turns the same materials down: flat, quiet, fast — the same fabric cut for a different job. Confirmed anti-reference: neither side should read as a generic SaaS dashboard-by-numbers or a stock e-commerce template — see Do's and Don'ts.

**Key Characteristics:**
- Fitment is the story, not an afterthought — compatibility framing belongs in catalog/detail UI, not buried in a filter.
- One palette, two intensities: Persuade-mode storefront vs Operate-mode admin/POS.
- Glass-panel is the shared card primitive; its hover-glow escalation is a storefront-only privilege.
- Signal Red is reserved for real signal (alerts, destructive, urgency) — not decoration.

## Colors

Two semantic colors carry the entire system; everything else is structural (paper/ink/mist neutrals) or literal category-coding (the `parts-*` ramps).

### Primary
- **Fleet Navy** (`hsl(221.2 83.2% 53.3%)`): The trust color. Primary CTAs, active nav states, focus rings, links. Used at full saturation on the storefront; same hue, lower visual weight (borders/icons over fills) on admin/POS to stay within the flat-tier mandate.

### Secondary
- **Signal Red** (`hsl(0 72.2% 50.6%)`): The attention color. Hover-state accents, glow borders, "look here" moments — the color used in the marketing gradient wash and the `glowing-red-border` focus treatment. Reserved for genuine emphasis, not general decoration.
- **Alarm Red** (`hsl(0 84.2% 60.2%)`): Distinct from Signal Red — brighter, more saturated. Destructive actions and error states only (delete confirmations, validation failures, stock-out warnings). Don't substitute Signal Red here; the two reds mean different things.

### Neutral
- **Paper** (`hsl(210 40% 98%)`): Base background, light mode.
- **Ink** (`hsl(222 47% 11%)`): Primary text, light mode; base background in dark mode.
- **Card White** (`hsl(0 0% 100%)`): Card surfaces, light mode.
- **Mist** (`hsl(210 40% 96.1%)`): Secondary/muted surface fill (secondary buttons, muted panels).
- **Mist Ink** (`hsl(215.4 16.3% 46.9%)`): Muted/secondary text — captions, helper text, disabled states.
- **Hairline** (`hsl(214.3 31.8% 91.4%)`): Borders and input strokes. The only border color in the system — don't introduce a second gray.

### Tertiary
- **Chart Positive** (`hsl(160 84% 39%)`): Positive trend/delta indicator. Formalizes the emerald convention established in `getRankDeltaBadge` and `KpiTile`.

### Category Ramps
- **Parts Blue** (`#2d5382`) / **Parts Red** (`#dc2626`): Full 50–900 ramps (`brandBlue`, `brandRed` in `tailwind.config.js`) used for category color-coding (`categoryIcons.jsx`) and badge/icon accents across catalog, dashboard, and staff surfaces. Distinct from Fleet Navy / Signal Red — these code categories, not brand actions.

### Named Rules
**The Two-Red Rule.** Signal Red (hover/attention) and Alarm Red (destructive/error) are never interchangeable. If it can be undone with an "undo" toast, it's Signal. If it just deleted something, it's Alarm.

## Typography

**Display Font:** Cabinet Grotesk (fallback: Space Grotesk, sans-serif)
**Body Font:** Geist (fallback: Satoshi, sans-serif)
**Mono Font:** Geist Mono (fallback: JetBrains Mono)

**Character:** A grotesque pairing doing quiet, confident work rather than an editorial-serif flourish — display carries weight and `tracking-tight` on every heading level (h1–h6 apply `font-display` globally), body stays a plain, highly-legible geometric sans. No decorative or script face anywhere in the system.

### Hierarchy
Uses Tailwind's default type scale (`text-sm` through `text-6xl`) rather than a fixed named scale — sizes are chosen per-context, not off a locked ramp. The one universal rule is structural: any heading tag gets `font-display` + `tracking-tight` automatically via the base layer; body copy, labels, and UI chrome stay on `font-sans`.

### Named Rules
**The Display-Everywhere Rule.** Every `h1`–`h6`, in both tiers, renders in Cabinet Grotesk with tightened tracking — there is no "admin gets the boring font" exception. The tiers differ in motion and depth, not typeface.

## Layout

No custom spacing scale — Tailwind's default 4px base rhythm, used as-is across both tiers. Storefront layouts favor generous whitespace and asymmetric/bento composition (explicit project rule: no three-equal-card rows — break symmetry with zig-zags or bento grids). Admin/POS layouts favor density: flat bento grids, tables, and tight card grids optimized for scanability over breathing room. `darkMode: 'class'` is supported system-wide; both tiers must hold up in both themes.

## Elevation & Depth

Hybrid by tier, not a single system-wide answer.

- **Storefront (Persuade mode):** glassmorphic layering via the shared `.glass-panel` primitive — translucent fill (`rgba(15,23,42,0.02)` light / `rgba(15,23,42,0.45)` dark), `backdrop-filter: blur(16px)`, a hairline border, and a soft ambient shadow (`0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)`). Its hover escalation (`.glass-panel-hover`) adds a Signal-Red-tinted glow shadow (`0 10px 30px -10px rgba(220,38,38,0.1)`) and a 2px lift on `translateY`, eased on `cubic-bezier(0.4,0,0.2,1)`.
- **Admin/POS (Operate mode):** flat by mandate — no shadows, no gradients, no hover-lift. Depth comes from the `hairline` border and `mist` tonal fill only.

### Shadow Vocabulary
- **Ambient card** (`0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)`): resting state, storefront glass-panel only.
- **Glow-hover** (`0 10px 30px -10px rgba(220,38,38,0.1)`): storefront hover escalation, Signal-Red-tinted. Never used at rest.

### Named Rules
**The Flat-Admin Rule.** `.glass-panel` is a shared primitive both tiers may use for the card *shell* (translucency + border), but `.glass-panel-hover`'s glow/lift escalation is a storefront-only privilege. Admin/POS surfaces stop at the flat shell — no glow, no lift, no exception for "just this one card."

## Shapes

One radius scale, shared by both tiers: `0.75rem` (12px) base, with `md` (10px) and `sm` (8px) derived downward (`calc(var(--radius) - 2px/-4px)`). No sharp corners, no fully-round pill shapes as a system default — this is a rounded-rectangle system throughout, storefront and admin alike.

## Components

### Cards / Containers (`.glass-panel`)
- **Corner Style:** `rounded.lg` (12px).
- **Background:** translucent ink wash, see Elevation & Depth.
- **Shadow Strategy:** ambient at rest (storefront only); glow on hover (storefront only, see Named Rules above).
- **Border:** 1px hairline-toned, translucency-matched (`rgba(15,23,42,0.05)` light / `rgba(255,255,255,0.06)` dark).

### Drawer / Modal (`Drawer.jsx`)
Slide-in panel, shared across cart, part detail, and add-part flows in both tiers. Solid `card-white` surface (not translucent — drawers sit above the glass layer, so they stay opaque for legibility).

### Tooltip (`AnimatedTooltip.jsx`)
Motion-backed hover tooltip, storefront and admin both use it; keep animation on the storefront's easing curves (`spring-physics` / `out-expo`) rather than admin's near-static default.

### Inputs / Fields
- **Focus:** colored glow ring on focus-within — `glowing-red-border` (Signal Red) or `glowing-blue-border` (Fleet Navy) depending on context, not a generic browser outline. Global `:focus-visible` also carries a `ring-2 ring-accent` fallback for keyboard nav.
- **Error:** `alarm-red` border/text, never `signal-red`.

### Navigation / Horizontal Scroll
- `.hide-scrollbar` + `.scroll-fade-edges` (mask-gradient at 4%/96%) is the system's pattern for horizontally-scrolling chrome (category tabs, marquees) — fade the edges instead of showing a hard clip or a visible scrollbar.
- `.animate-marquee` (30s linear infinite, `prefers-reduced-motion` disables it) backs the trusted-brands strip.

### No shared Button primitive yet
Buttons are hand-styled per component on top of the tokens above rather than drawn from one source component. Worth a `$impeccable extract` pass once the pattern stabilizes — don't invent one here.

## Do's and Don'ts

### Do:
- **Do** treat Signal Red and Alarm Red as different tokens with different meanings (see The Two-Red Rule).
- **Do** keep `font-display` on every heading in both tiers — the typeface doesn't downgrade for admin, only the motion/depth around it does.
- **Do** break card-grid symmetry on the storefront (bento/zig-zag over three-equal-column rows) — existing project rule, still binding.
- **Do** respect `prefers-reduced-motion` on every custom keyframe (marquee already does; extend the same guard to new motion).

### Don't:
- **Don't** add `.glass-panel-hover`'s glow/lift escalation to an admin/POS surface — flat means flat, no exceptions for a "just this once" card.
- **Don't** introduce a second gray/border color alongside `hairline` — one neutral border color for the whole system.
- **Don't** let the storefront read as a stock e-commerce template or the admin read as a generic dashboard-by-numbers — both are confirmed anti-references.
- **Don't** invent a Button component's visual spec from scratch mid-task; none exists yet — match the nearest real sibling instead.

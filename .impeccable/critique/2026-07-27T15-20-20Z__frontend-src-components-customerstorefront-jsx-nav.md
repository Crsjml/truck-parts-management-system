---
target: the nav bar (CustomerStorefront.jsx header/nav)
total_score: 17
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
timestamp: 2026-07-27T15-20-20Z
slug: frontend-src-components-customerstorefront-jsx-nav
---
Method: dual-agent (A: a99b9f2eb900e278b · B: a4aa4564b0e8f6a20)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Active nav tab and account-menu chevron communicate state well; staff-signin icon gives no indication of what portal you're entering |
| 2 | Match System / Real World | 3 | Plain-language labels throughout; the logo isn't a link/button — clicking it does nothing, breaking the universal "logo → home" convention |
| 3 | User Control and Freedom | 2 | Escape closes the account menu and restores focus correctly; but Logout fires a cart-clear instantly with zero confirmation or undo |
| 4 | Consistency and Standards | 1 | Desktop nav and mobile nav are two independent implementations with divergent selected-state styling |
| 5 | Error Prevention | 2 | Nothing guards the silent cart-wipe on logout; no "you have items in your cart" warning |
| 6 | Recognition Rather Than Recall | 2 | Nav items are text-labeled; cart/dark-mode/staff icons are icon-only with title tooltips that don't exist for touch users |
| 7 | Flexibility and Efficiency | n/a | Persuade-mode marketing nav — keyboard shortcuts/bulk actions don't apply to a header toggle |
| 8 | Aesthetic and Minimalist Design | 2 | Restrained icon set undercut by three competing corner languages in one header (rounded-[2rem] shell, rounded-full pills, rounded-2xl dropdown) |
| 9 | Error Recovery | 2 | The one destructive-adjacent action in this region (logout cart-wipe) offers no recovery path, no toast, no restore |
| 10 | Help and Documentation | n/a | No help affordance expected inside a header on a marketing/storefront surface |
| **Total** | | **17/32** | **53% — Acceptable** |

## Design Specificity Verdict

**LLM assessment**: This nav could belong to almost any e-commerce site. The segmented pill toggle, the pill-shaped Login/Register switcher, and three circular icon buttons carry zero trace of "truck-parts fitment engine" — PRODUCT.md names compatibility-matching as the entire differentiating mechanism, yet the persistent chrome offers no truck/model context indicator anywhere. Worse, the shape language directly contradicts DESIGN.md's own stated rules: the Shapes section bans "fully-round pill shapes as a system default," and the Do's/Don'ts section names "stock e-commerce template" as a confirmed anti-reference — this header is built almost entirely from full pills and circles, which is precisely that signature.

**Deterministic scan**: Detector (`detect.mjs --json`) returned exit code 0, zero findings across the full 831-line file. This isn't a contradiction of the verdict above — the regex-based detector catches hardcoded anti-pattern signatures (overused fonts, bounce easing, generic gradients), not taste-level issues like "this shape language matches a banned category." Design-specificity and shape-language judgment are structurally outside a static regex scan's reach.

**Visual overlays**: Not available — no browser automation tool was exposed this session. No live overlay was attempted or claimed; fallback signal is static code scan only.

## Overall Impression

The header's *mechanics* are better than average — real ARIA wiring, working focus management, a genuine dark-mode toggle — but its *visual identity* reads as templated, and it has one real functional bug (silent cart loss on logout) hiding behind a well-built account menu. The biggest opportunity: this is the single most visible, always-on piece of UI in the entire storefront, and it currently says nothing about what makes this business different.

## What's Working

1. **Account menu accessibility wiring is genuinely solid** — `aria-expanded`, `aria-haspopup="menu"`, proper `role="menu"`/`role="menuitem"`, click-outside handling, and an Escape handler that closes the menu *and* returns focus to the trigger. Better than most hand-rolled dropdowns.
2. **Token discipline is correct at the CSS-variable layer** — the cart badge's `bg-accent` resolves to Signal Red per DESIGN.md's Two-Red Rule, a legitimate "look here" use, not decoration.
3. **Dark mode is a real first-class toggle**, not an afterthought — clean Sun/Moon swap, no separate light-only chrome anywhere in this region.

## Priority Issues

**[P1] Pill/circle shapes proliferate against the system's own explicit ban**
- **Why it matters**: DESIGN.md's Shapes section states no fully-round pill shapes as a system default, and separately bans reading as a stock e-commerce template. This header is built from a pill nav toggle, a pill auth switcher, and three circular icon buttons — the header is the most template-generic element on the page exactly where the system's own rules are most explicit.
- **Fix**: Convert the segmented nav, auth switcher, and icon buttons to the system's actual rounded-rectangle scale (12px/10px) to match cards and drawers elsewhere.
- **Suggested command**: `$impeccable shape`

**[P1] Logout silently discards the cart with no confirmation or undo**
- **Why it matters**: The logout handler clears the cart unconditionally with zero warning. A customer who built a cart and then logs out loses it instantly — a real, avoidable support contact.
- **Fix**: Either persist cart across the logout boundary (guest cart), or gate the clear behind a confirm/toast with an undo window.
- **Suggested command**: `$impeccable harden`

**[P2] Zero truck-fitment affordance in the persistent nav**
- **Why it matters**: PRODUCT.md names compatibility-matching as the core mechanism, not a filter buried in the catalog. The header carries no trace of it — the biggest missed differentiation opportunity and the direct driver of the "generic e-commerce" verdict above.
- **Fix**: Surface a lightweight "your truck" context chip or quick-select in the header actions cluster, even collapsed by default.
- **Suggested command**: `$impeccable adapt`

**[P2] Icon-only utility buttons are sub-44px touch targets with no visible labels**
- **Why it matters**: Cart, dark-mode, and staff-signin buttons are roughly 36×36px, under the 44×44pt minimum touch target, packed tight. Labels exist only as title/aria-label, invisible to touch users who can't hover.
- **Fix**: Bump padding to reach 44px minimum and consider visible micro-labels at larger breakpoints.
- **Suggested command**: `$impeccable polish`

**[P2] Desktop and mobile nav are duplicated, divergent implementations**
- **Why it matters**: The desktop and mobile toggles hand-roll the same Home/Catalog switch twice with different selected-state visual language — a DRY violation that also produces a visible inconsistency exactly at the breakpoint.
- **Fix**: Extract one NavToggle component parameterized by size/density, single source of truth for active-state styling.
- **Suggested command**: `$impeccable distill`

## Persona Red Flags

**Jordan (confused first-timer)**:
- The staff-signin shield icon carries a security/trust-badge metaphor, not a "sign in as staff" metaphor — no text label corrects the misread, while it actually routes to a separate portal.
- The mobile nav row has no enclosing visual frame (unlike the desktop pill container), so Jordan on a phone may not register it as primary navigation next to the glass sticky header around it.

**Riley (stress tester)**:
- Logs in, adds items to cart, logs out — cart silently empties with no warning. Will document this as a data-loss defect on the first pass.
- Resizing across the breakpoint shows the active-tab treatment visibly change shape and weight, since desktop and mobile nav are separately coded.

**Casey (distracted mobile user)**:
- The cart/dark-mode/staff cluster can wrap to a second line on a narrow phone alongside a logged-out auth pill — loses a fixed, memorized thumb position for the cart icon between visits.
- Adjacent icon buttons at ~36px with minimal gap are exactly the mis-tap scenario one-handed thumb use produces.

## Minor Observations

- A hover state on the staff icon reaches into the `parts-blue` category-coding ramp, which DESIGN.md reserves for category badges, not chrome hover states — a small token-role misuse.
- The divider between the auth cluster and utility icons is hidden below `sm:` — on the smallest phones, exactly where grouping matters most, the two clusters run together with no separator.
- Header shell radius is a raw arbitrary Tailwind value with no relationship to the declared rounded scale — a magic number outside the system.
- `role="menu"` conventionally implies ARIA APG arrow-key roving; only Escape is wired — Tab-based traversal works, but Up/Down roving isn't implemented.

## Questions to Consider

- If the nav's entire job is "get to Home or Catalog," why does it need two independently-styled implementations instead of one component that just changes size at a breakpoint?
- What would this header look like if the compatibility engine — the thing that makes this business not-generic — had to earn a pixel in it, the same way the cart icon did?
- Is the shield icon actually the right metaphor for "I work here," or was it the nearest icon that looked authoritative?

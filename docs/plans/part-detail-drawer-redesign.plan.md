# Plan: Part Detail Drawer — UI/UX Redesign

**Target**: `frontend/src/components/CustomerStorefront.jsx:696–893`
**Complexity**: Medium (Large if the shared-primitive option is taken)
**Area**: Customer Storefront → `design-system` premium token mode (`CLAUDE.md` §4 Area A)

**Status**: awaiting approval, no code written.
**Decisions locked**: shared drawer primitive adopted by both drawers; real OEM logos
with a monogram fallback (see *Brand marks*).
**Informed by**: the `design-taste-frontend` skill and an `a11y-architect` WCAG 2.2 AA
audit — findings are folded into the sections below.

---

## Context

The part detail drawer is the storefront's conversion surface. Four elements undercut it,
and in three of them the root cause is **layout, not styling**.

| # | Symptom | Actual cause |
|---|---|---|
| 1 | Compatibility table cramped, words broken mid-character | 3-column `<table>` (`:776`) sits in the **right half** of a `lg:grid-cols-2` inside a `max-w-3xl` drawer, roughly 340px usable. `break-all` (`:789`) was added to cope, and that is what shatters words |
| 2 | Long prices overflow | `text-2xl font-black` (`:810`) in a fixed half-width cell, no `min-w-0`, no fluid type, no `tabular-nums` |
| 3 | Stock status reads inconsistently | Two states rendered as **different components**: green pill with pulsing dot (`:816`) vs bare red `text-lg` text (`:821`) |
| 4 | Category box wastes space | A full `col-span-2` bordered card (`:825`) holding one small chip |

**Key insight for #1**: the table is the semantically correct primitive. Make / model /
years is genuinely tabular. Do not replace it with divs. Give it the width it needs.

Two consultations shaped this plan beyond the visual brief:

- **`design-taste-frontend` skill.** Note honestly: it declares itself out of scope for
  data tables and dense product UI (§13), so its landing-page rules are ignored here and
  only its cross-cutting consistency and anti-pattern rules are applied.
- **`a11y-architect` agent**, WCAG 2.2 AA audit of `:696–893`. It found **5 blockers**,
  one of which is a live AA violation in code we were about to carry forward, plus a
  root-cause finding that changes the plan's shape.

---

## Design read and dials

**Reading this as**: a functional e-commerce detail drawer for B2B truck-parts buyers,
with a premium-but-utilitarian language, leaning on the existing Tailwind glassmorphism
shell with restrained motion.

`DESIGN_VARIANCE: 4` · `MOTION_INTENSITY: 3` · `VISUAL_DENSITY: 5`

Lower variance and motion than the storefront's marketing surfaces: this is a decision
tool, not a hero. Buyers are checking fitment and price, so density earns its keep.

---

## Blocking accessibility findings (fix regardless of visual scope)

From the audit. These are defects in code shipping today.

| ID | Severity | Finding |
|---|---|---|
| B1 | Blocker | Panel (`:700`) has no `role="dialog"`, `aria-modal`, or `aria-labelledby`. Nothing announces that a dialog opened |
| B2 | Blocker | No focus trap, no focus restoration on close, background not `inert`. Keyboard users tab straight through into the page behind |
| B3 | Blocker | No Escape handler. The X button is the only way out |
| B4 | Blocker | Close button (`:723`) is icon-only with no accessible name. Announces as "button" |
| B5 | Blocker | Quantity stepper buttons (`:861`, `:872`) same defect |
| H1 | High | Tab strip (`:729–743`) is two plain buttons. No `role="tablist"`/`tab`, no `aria-selected`, no `aria-controls` |
| H2 | High | Table (`:776`) has no `<caption>` and no `scope="col"` on `:779–781` |
| H5 | High | **No visible focus style on any control in this block.** One `focus-visible` exists in the entire file, at `:950`, unrelated |
| **H6** | **High** | **`animate-pulse` on the stock dot (`:817`) fails WCAG 2.2.2 Pause Stop Hide.** Auto-starting, indefinite, non-essential (adjacent text already says "in stock"). This is a real AA failure, not a preference |

Also: a repo-wide grep found **zero** `prefers-reduced-motion` / `motion-reduce` /
`useReducedMotion` matches anywhere in `frontend/src`. The 500ms slide-in (`:700`) is not
itself an AA failure, but there is no reduced-motion handling to build on.

**H6 is the one to note**: my earlier draft kept that pulsing dot. It is an existing
violation and would have been carried into the new pill.

### Root-cause finding — this is not one drawer's problem

The audit checked `CartDrawer.jsx` and found the **same** missing dialog role, focus
trap, and Escape handling. Two drawers, one defect class.

Per ponytail, patching `CustomerStorefront.jsx` alone leaves the sibling broken. The
lazy fix and the correct fix are the same: extract **one** accessible drawer primitive
into the existing `frontend/src/components/ui/` directory, carrying dialog semantics,
focus trap, focus restoration, Escape, background inerting, and a `motion-reduce` entry
transition. Both drawers consume it.

**Decision: approved — shared primitive, both drawers.** Sequenced as two commits so the
visual work is not blocked behind the migration:

1. `ui/Drawer.jsx` + `PartDetailDrawer.jsx` consuming it, with the four visual fixes
2. `CartDrawer.jsx` migrated onto the same primitive

Before hand-rolling the focus trap, check `package.json` for an existing dependency that
already solves it (Radix, Headless UI, `focus-trap-react`). Focus management is subtle
and a vetted implementation beats a bespoke one — ponytail rung 5. Hand-roll only if
nothing suitable is already installed.

---

## Design-system findings from the skill

**Shape Consistency Lock (§4.4) is violated.** The drawer mixes at least five radii in
one panel: `rounded-[2.5rem]` (`:700`), `rounded-xl` (`:704`), `rounded-full` (`:723`),
`rounded-3xl` (`:750`), `rounded-2xl` (`:775`, `:808`, `:812`, `:825`), `rounded-md`
(`:714`, `:717`). Pick one documented scale, for example panel `2.5rem` / cards `1rem` /
chips and pills full-round, and apply it everywhere.

**Decorative status dots (§9.F)** are banned by default, permitted only for genuine
semantic state. Stock level *is* semantic, so the dot may stay. The infinite `animate-pulse`
may not, per H6.

**Hairline-per-row (§9.F)**: the table uses `divide-y` on every row. Acceptable at five
rows or fewer; beyond that, group rows by make with one divider per group rather than a
rule under every line.

**Em-dash ban (§9.G) applies to shipped UI strings.** Year ranges render as `2015-2020`
with a plain hyphen, never an en-dash or em-dash. This applies to compatibility rows and
any new copy.

---

## The redesign

```
HEADER
  [cat icon]  Part Name                                  [X]
              [ Category chip ]         <- moved up

TABS   Description & Specs | Customer Reviews  * 4.6 (12)

CONTENT (lg:grid-cols-2)
  [ product image ]        |  P 1,234,567.89     <- full width
                           |  [ In stock ]       <- one pill
  Product Description      |  [ SKU ]  [ OEM ]

FULL WIDTH
  Vehicle Compatibility
  | Make        | Model / Series | Years     |
  | [H] Hino    | Ranger FC      | 2015-2020 |
  | [I] Isuzu   | Forward FRR    | 2012-2018 |
```

### 1. Compatibility to full width

Move `:771–805` out of the right column into a full-width section below the grid. At
~700px the existing table works as designed.

- Delete `break-all` (`:789`)
- Add `<caption class="sr-only">` and `scope="col"` on the three `<th>` (H2)
- Wrap in `role="region"` + `aria-label` + `tabindex="0"` for horizontal scroll at 320px
  and 400% zoom, or reflow to stacked rows (M1, WCAG 1.4.10)
- Keep the three existing fallback branches (`compatibleWith` → `compatibility` string →
  "Universal Fit") inside `<tbody>` — that logic is correct, only the container changes

### Brand marks — decision: real OEM logos, with a required fallback

The compatibility data covers **ten** brands, not three
(`backend/scripts/migrate_compatibility.js`): Freightliner, Hino, Isuzu, Kenworth, Mack,
Mitsubishi Fuso, Peterbilt, Scania, Toyota, Volvo — plus a `Universal` case.

Simple Icons (the standard free source, per `design-taste-frontend` §4.8) was checked
directly against its CDN. Coverage is partial:

| Available | Missing (HTTP 404) |
|---|---|
| Toyota, Volvo, Scania, Mitsubishi *(generic, not Fuso)* | **Hino**, **Isuzu**, Mack, Peterbilt, Kenworth, Freightliner, Mitsubishi Fuso |

Six of ten have no free source, **including Hino and Isuzu** — the two most relevant to a
Tarlac truck-parts catalogue and the two named in the brief.

So the implementation is necessarily **hybrid**, not either/or:

1. **Logo when an asset exists** — `frontend/src/assets/brands/{slug}.svg`, self-hosted,
   never hot-linked to a CDN
2. **Monogram badge fallback** — brand initial in a tinted chip reusing
   `getCategoryIconAndColor`. This path gets built regardless, because six brands need it
   and any future brand starts here

Practical constraints for the logo path:

- **Optical normalisation is the real work.** These marks have wildly different aspect
  ratios — Hino and Isuzu are wordmarks, Toyota is an ellipse device. Constraining them
  to a uniform height looks broken. Normalise to a fixed **bounding box with per-logo
  scale**, not a shared `h-*` class
- **Light and dark variants**, or single-colour marks tinted via `currentColor`
- `alt` text is the brand name; if the brand name is already in the adjacent cell, the
  logo is decorative and takes `alt=""` + `aria-hidden="true"`

⚠️ **Trademark note, for you not me.** These are registered marks. Using them to indicate
*what a part fits* is normally defensible as nominative use, but that is a business
decision on a commercial storefront, not a technical one. Sourcing six marks manually
also means confirming each licence. If that friction is unwelcome, the monogram-only path
is already built and ships immediately.

### 2. Price to full width, fluid type

- Promote above the stock pill, full width
- `text-xl sm:text-2xl` instead of fixed `text-2xl`
- `tabular-nums` so digits align
- `min-w-0` + `break-words` on the wrapper
- Keep `formatCurrency` from `useSettings()` (`:30`) — currency handling is already right

### 3. Stock status to one pill, three states

Marketplace convention (Shopee / Lazada / TikTok Shop) de-emphasises raw counts and
surfaces scarcity: an exact number above the threshold is noise, "Only 3 left" drives the
decision.

Reuse the existing threshold — `part.minStock`, confirmed exposed by
`PartsService.js:104` (`minStock: part.min_stock`) and already used at
`CustomerStorefront.jsx:313` and `PartCard.jsx:22`. No schema change.

| Condition | Pill |
|---|---|
| `available === 0` | neutral/red, "Out of stock" |
| `available <= minStock` | amber, "Only N left" |
| `available > minStock` | green, "In stock" |

`available = stock - (reservedStock || 0)`, matching the existing expression.

Constraints from the audit:
- Every state carries a **text label**, never color alone (preserves current 1.4.1 pass)
- Any warning icon gets `aria-hidden="true"`; the words carry the meaning
- **No infinite pulse** (H6). One-shot on mount, or `motion-safe:` gated, or omit
- Contrast-check all three token pairs at `text-xs` — 4.5:1, none are large-text exempt
- Wrap in `role="status"` so a stock change while the drawer is open is announced

### 4. Category to header, SKU + OEM to grid

As you proposed. Category chip moves from the `col-span-2` card (`:825–837`) into the
header beneath the part name, replacing the SKU/OEM chips at `:713–720`. SKU and OEM
become the two grid cells. The `col-span-2` card is deleted.

Two audit constraints:
- The category chip must be a **sibling** of the heading used for `aria-labelledby`, not
  a child, or the dialog's accessible name becomes "Part Name Category: Brakes"
- SKU/OEM label-value pairs must keep **DOM order equal to reading order** (M3). Do not
  use CSS `order` or explicit grid placement to rearrange them visually

### 5. Reviews tab (you asked me to review it)

- **`max-w-3xl mx-auto` (`:842`) is dead code.** The drawer is itself `max-w-3xl` with
  `p-6`, so the constraint can never bind. Remove
- **The count badge renders a bare "0"** (`:741`) on parts with no reviews, which reads
  as a defect. Show `* {averageRating} ({totalReviews})` when reviews exist, hide at zero.
  `reviewStats.averageRating` already exists (`authStore.js:611`)
- Add `role="tabpanel"`, `id`, `aria-labelledby` per H1

`ReviewSection.jsx` internals stay out of scope.

---

## Files to change

| File | Action | Why |
|---|---|---|
| `frontend/src/components/ui/Drawer.jsx` | CREATE | Shared accessible drawer primitive (B1–B3). Consumed by both drawers |
| `frontend/src/components/PartDetailDrawer.jsx` | CREATE | Extract `:696–893`. `CustomerStorefront.jsx` is ~54KB, far past the 800-line ceiling |
| `frontend/src/components/CustomerStorefront.jsx` | UPDATE | Remove the drawer block, render the new component |
| `frontend/src/components/CartDrawer.jsx` | UPDATE | Adopt the shared primitive (commit 2) |
| `frontend/src/assets/brands/*.svg` | CREATE | Self-hosted OEM marks. 4 from Simple Icons, 6 sourced manually |
| `frontend/tests/pages/` | UPDATE | Page objects target current drawer DOM |

## Patterns to mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `components/PartCard.jsx` | PascalCase file, default export |
| Category theming | `getCategoryIconAndColor` (`:707`, `:829`) | Icon + color token from category. Reuse for brand badges |
| Low-stock logic | `PartCard.jsx:22` | `part.stock <= part.minStock` |
| Currency | `useSettings()` → `formatCurrency` (`:30`) | Never hand-format money |
| Image fallback | `getCategoryPlaceholder` (`:755`) | Already handled |
| Tests | `frontend/tests/*.spec.ts` + `tests/pages/` | Playwright, page-object model |

## Skills consulted

`design-taste-frontend` (applied selectively, see note above) · `high-end-visual-design` ·
`web-design-guidelines` · `tailwind-design-system` · `design-system` premium mode
Agent: **`a11y-architect`** (audit complete, findings folded in above)

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Shared drawer primitive widens scope into `CartDrawer` | High | Land the primitive + `PartDetailDrawer` first, migrate `CartDrawer` in a second commit |
| Focus-trap regressions are easy to introduce and hard to spot | Medium | Keyboard-test both drawers before and after; do not hand-roll if a vetted primitive is already a dependency |
| Prop-drilling churn from extraction | Medium | Move markup verbatim, verify parity, then restyle. Two commits |
| 6 of 10 brand logos have no free source, including Hino and Isuzu | **High** | Hybrid is mandatory: logo where available, monogram fallback otherwise. Fallback path ships first so the table is never blocked on asset sourcing |
| OEM marks are registered trademarks on a commercial storefront | Medium | Your call, not a technical one. Confirm licence per mark; monogram-only path stays available as an immediate out |
| Logos have mismatched aspect ratios and look wrong at uniform height | Medium | Fixed bounding box with per-logo scale, not a shared `h-*` class. Review all ten side by side before shipping |
| Playwright specs target current drawer DOM | Medium | Update page objects alongside |

---

## Verification

**Visual**, against `make up` (frontend `5173`):

1. Long price (≥ 1,000,000.00) — no overflow, digits aligned
2. Many compatibility rows — readable, no mid-word breaks, hyphenated year ranges
3. Compatibility fallbacks: `compatibility` string, and neither ("Universal Fit")
4. Three stock states (`0`, `<= minStock`, `> minStock`) — identical pill shape
5. Zero-review part shows no badge; reviewed part shows rating + count
6. Breakpoints 320 / 375 / 768 / 1440, plus **400% zoom** — no horizontal page overflow
7. Light and dark theme

**Accessibility** (this is the acceptance gate, given the audit):

- Screen reader announces a dialog on open, named by the part title
- Tab cycles **within** the drawer; background is not reachable
- Escape closes; focus returns to the originating part card
- Close and stepper buttons announce their purpose
- Tabs expose `aria-selected` and respond to arrow keys
- Every control has a visible focus ring (H5)
- Stock state is conveyed by text, verified at 4.5:1 in all three states
- `prefers-reduced-motion: reduce` — no pulse, no slide
- Table announces its caption; headers associate with cells

**Automated**: update page objects under `frontend/tests/pages/`, then
`npx playwright test`.

---

## Out of scope

- `ReviewSection.jsx` internals — only the tab affordance changes
- Compatibility **data** and its migration (`TTP-59`, shipped in `43dbd16`)
- Admin `AddPartDrawer.jsx` — Area B, minimalist directive, different design language
- Repo-wide `prefers-reduced-motion` adoption — flagged by the audit as a global gap,
  worth its own ticket. This plan only covers the two animations in this drawer

## Ticket

Nearest existing ticket is **`TTP-59`** (compatibility + storefront drawer redesign,
shipped in `43dbd16`), so this is follow-on work. Per `CLAUDE.md` §6 I will not invent an
ID — **create a subtask** under `TTP-59` or the storefront epic.

The accessibility blockers (B1–B5) arguably warrant their **own** ticket, since they are
existing defects affecting two drawers rather than part of this visual change.

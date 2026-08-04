---
target: AddPartDrawer 3-step Add New Part drawer
total_score: 20
max_score: 36
na_heuristics: 10
p0_count: 2
p1_count: 1
timestamp: 2026-08-03T14-44-40Z
slug: frontend-src-components-addpartdrawer-jsx
---
Method: dual-agent (A: a71458945a6be1589 · B: a9fae743f796afd11)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Progress bar + step label + submit spinner all clear |
| 2 | Match System/Real World | 2 | Jargon-correct for staff but no fitment framing anywhere |
| 3 | User Control and Freedom | 3 | Discard/overwrite confirms present; no jump-to-erroring-step |
| 4 | Consistency and Standards | 1 | Every label same weight; react-select styled totally differently from native inputs |
| 5 | Error Prevention | 2 | Zod validates on advance, no format hints/maxlength |
| 6 | Recognition Rather Than Recall | 2 | Clone-template needs extra "Apply" click instead of auto-fill |
| 7 | Flexibility and Efficiency | 3 | Enter-to-advance on steps 1/3, missing on step 2 |
| 8 | Aesthetic and Minimalist Design | 1 | Uppercase-everything + icon-per-label is noise for Operate/flat tier |
| 9 | Error Recovery | 3 | Inline red errors co-located with fields |
| 10 | Help and Documentation | n/a | Micro-form, no help expected |
| **Total** | | **20/36** | **Acceptable (56%)** |

## Design Specificity Verdict

**LLM assessment**: Generic form-wizard boilerplate wearing TTP color tokens. Icon+uppercase-label+input pattern, 3-step progress bar, right-slide drawer — all off-the-shelf. Compatibility (the product's actual "fitment" mechanism) reduced to 3 unlabeled text inputs, no product-specific framing. react-select menu in `PurchasingAtoms.jsx` is hardcoded dark slate (`#0f172a`/`#1e293b`/`#e2e8f0`) regardless of theme — breaks DESIGN.md's both-themes mandate and reads as unthemed copy-paste.

**Deterministic scan**: `detect.mjs --json` clean (exit 0, zero findings) on `AddPartDrawer.jsx`, `PurchasingAtoms.jsx`, `categoryIcons.jsx`. Detector has no rule catching label-hierarchy flattening or cross-component style drift — this run's real issues are outside its detection surface, not contradicted by it.

## Overall Impression

Functionally solid (validation, confirm dialogs, image guard) but visually flat in the wrong way — flat as in "no hierarchy," not flat as in "Operate-mode minimalist." The dropdowns are the clearest tell: `react-select` never got re-themed onto the hairline/rounded-xl/glow-focus system the native `<input>`s already use, so the same form has two different visual languages living side by side.

## What's Working
- Discard-unsaved and overwrite-template confirm dialogs (`isDirty` check, template-apply guard) — real data-loss protection most admin CRUD forms skip.
- Enter-to-advance wiring on steps 1 and 3 — a genuine speed affordance fitting Operate-mode intent.
- Image upload: 2MB client guard + instant preview, correctly scoped, no over-build.

## Priority Issues

**[P0] Uniform `text-xs uppercase` labels flatten all hierarchy** — AddPartDrawer.jsx:198,255,271,285,301,347,407,420,472,488,503. Every field label renders at identical weight; the eye has nowhere to land first, directly violating the "extreme readability" Operate-mode mandate. Fix: reserve uppercase for section-level groupings only ("Compatibility Models"); drop individual field labels to sentence case, `text-sm font-medium`. → `/impeccable quieter`

**[P0] react-select dropdowns don't match native inputs** — `PurchasingAtoms.jsx` customSelectStyles vs. AddPartDrawer.jsx:264,280,294. Native inputs: `bg-background`, `border-border`, `rounded-xl` (12px), focus→`border-brandBlue-500`. react-select control: `bg-secondary`, `borderRadius: 0.5rem` (8px), focus→boxShadow (not the `glowing-blue-border`/`glowing-red-border` token). Menu hardcoded dark palette breaks light mode. Fix: re-theme `customSelectStyles` onto the same hairline/rounded-xl/glow tokens; drop hardcoded hex. → `/impeccable extract` then `/impeccable distill`

**[P1] Compatibility grid has no column headers** — AddPartDrawer.jsx:354-401. Three unlabeled inputs per row, distinguishable only by placeholder text that disappears once typed. A user on row 3 of 6 has no persisted cue for brand/series/year. Fix: add a static header row above the list. → `/impeccable distill`

**[P2] Icon-per-label overuse** — 10 identical `brandBlue-400` duotone icons, one per label, none differentiating meaning. Contradicts "muted pastels/no visual fatigue." Fix: drop icons from field labels, keep only on section headers. → `/impeccable quieter`

**[P3] Grid pairing (SKU/OEM, Stock/MinStock) has no stated visual rationale** — AddPartDrawer.jsx:269,486. Two-up purely because fields are short; no shared bracket/border communicates the relationship. → `/impeccable document`

## Persona Red Flags

**Sam (Accessibility-Dependent)**: Category select error state wraps a `ring-1 ring-destructive` div around react-select (line 304) but no `aria-invalid`/`aria-describedby` links it to the error text (338) — screen reader won't connect them. react-select's focus indicator is a `boxShadow`, not a border+ring like native inputs; under forced-colors/high-contrast mode this can vanish entirely.

**Alex (Power User)**: Enter-to-advance works steps 1 and 3 but not step 2 — inconsistent accelerator breaks the pattern once learned. Clone-template requires select-then-separate-"Apply Template"-click instead of auto-applying on select, adding a redundant step to a recall-support feature.

## Minor Observations
- `handleFormSubmit(e)` called with a keyboard event (line 480) into a zero-arg async function — harmless but signals copy-pasted Enter-submit wiring.
- "Add Row" (compatibility) has no cap — unbounded row growth with no virtualization; low risk at real-world scale but worth noting.
- Stock vs. Min Stock Alert fields share identical icon color, no visual distinction of differing purpose beyond label text.

## Questions to Consider
- Does compatibility (the product's actual fitment mechanism) deserve a more prominent treatment than 3 plain text inputs, given it's the system's stated "Right Fit" story?
- Is uppercase-everywhere an inherited pattern from elsewhere in the codebase, or specific to this component?

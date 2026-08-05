---
target: admin Parts Inventory - Add New Part drawer (AddPartDrawer.jsx)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-03T08-31-50Z
slug: frontend-src-components-addpartdrawer-jsx
---
Method: dual-agent (A: acf319ba0e17679e6 · B: a5ec9082c1e45aceb) — static code + token analysis only, no browser (user opted out of Playwright/browser evidence).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Step label in header + progress fill + spinner on submit, but bar itself has no numeric markers, no `role="progressbar"` |
| 2 | Match System / Real World | 4 | Domain-correct fields (OEM No., SKU, Make/Model-Series/Years) — genuinely fits truck-parts inventory work |
| 3 | User Control and Freedom | 3 | Back/Cancel + removable rows, but exit/overwrite gated by blunt `window.confirm()` (lines 142, 206) |
| 4 | Consistency and Standards | 2 | Enter-to-advance wired on Steps 1 & 3 (238/254/268/453/469/484), silently missing on Step 2 (331-390) |
| 5 | Error Prevention | 3 | 2MB image guard, confirm-before-overwrite-template — reasonable guards |
| 6 | Recognition Rather Than Recall | 3 | Clone-from-template, category icons instead of bare text |
| 7 | Flexibility and Efficiency | 3 | Enter-to-advance + clone-template are real accelerators, undercut by the Step 2 gap |
| 8 | Aesthetic and Minimalist Design | 2 | Two `shadow-` usages (line 158 drawer `shadow-2xl`, line 518 button `shadow-lg shadow-accent/20`) on an Admin/Flat-tier surface |
| 9 | Error Recovery | 2 | Error copy is present and consistent everywhere, but **dark-mode contrast measured at 1.71–1.93:1** on every error message — functionally unreadable in dark mode |
| 10 | Help and Documentation | 1 | No inline help/tooltips anywhere; "OEM No." and "Min Stock Alert" assume domain fluency with zero explanation |
| **Total** | | **26/40** | **Acceptable (65%)** |

## Design Specificity Verdict

**Assessment A (LLM)**: This is a competently domain-modeled admin form — compatibility rows, template cloning, min-stock alerting are genuinely shaped around truck-parts inventory work, not a generic CRUD scaffold. It does not read as category-interchangeable. But it undercuts its own "Operate mode, flat by mandate" identity with a tier-mandate violation (glow shadow on the primary CTA) and a token-semantics violation (primary action colored with the attention token, not the trust token).

**Assessment B (deterministic scan)**: `detect.mjs` returned zero findings (exit 0, clean JSON `[]`) — the mechanical detector's pattern library doesn't catch token-semantic misuse or contrast failures, which is exactly where the real problems in this component live. Extracted CSS-variable values from `index.css` confirm `--accent` **is** `hsl(0 72.2% 50.6%)` (Signal Red) in both light and dark — not Fleet Navy — so the submit button's color is a factual token mismatch, not a stylistic reading. Computed WCAG contrast independently found `text-destructive` on `bg-destructive/10` failing in **both** modes (3.03–3.16:1 light, 1.71–1.93:1 dark) across the server-error banner and all 8 inline field-error lines, plus `text-muted-foreground` on `bg-secondary` failing at 4.34:1 in light mode. One stock-palette bypass (`text-emerald-500`, line 231) and zero `dark:` variant classes anywhere in the file — every color decision rides the CSS-variable system with no per-element dark-mode consideration, which is why the contrast failure above went unnoticed: nothing was ever checked against the `.dark` values.

No user-visible browser overlay was generated this run (browser evidence explicitly excluded by the user).

## Overall Impression

The wizard's structure and domain modeling are solid — it doesn't feel like a bolted-on generic form. But two things puncture the "impeccable" bar: the drawer quietly breaks its own tier's flat-admin rule (shadows/glow at rest, not just on hover) and its primary CTA is wearing the wrong semantic color entirely. Worse, error messaging — the one thing every heuristics table above scores well on for *presence* — is close to unreadable in dark mode by hard contrast math, which is the kind of failure a design director should never ship past.

## What's Working

1. **Domain-correct modeling**: compatibility rows (brand/series/year), OEM-vs-SKU distinction, and template-cloning are genuinely shaped around this shop's real inventory workflow, not generic form fields.
2. **Consistent error-message plumbing**: all 7 validated fields (name, sku, oem, category, price, stock, minStock) plus the image-size guard render through the same `text-destructive` pattern — the *architecture* of error display is uniform, even though its color execution fails contrast (see below).
3. **Sensible data-loss guards**: dirty-check before close, confirm-before-overwrite on template apply, 2MB image cap before commit all fire before damage is done, not after.

## Priority Issues

**[P0] Error messages are unreadable in dark mode**
- **Why it matters**: `text-destructive` on `bg-destructive/10` measures 1.71–1.93:1 contrast in dark mode (vs. the 4.5:1 WCAG AA minimum for body text) — this hits the server-error banner (line 492-495) and all 8 inline field-error lines (241, 257, 271, 313, 436, 456, 472, 487). A staff member on a dark-themed admin panel who mistypes a SKU or leaves a required field blank gets an error that is functionally invisible. This is the exact moment (validation failure, blocked task) where visibility matters most.
- **Fix**: Solidify the error text color in dark mode — don't rely on `--destructive`'s dark value (`0 62.8% 30.6%`, deliberately desaturated for backgrounds) for foreground text; use a lighter/higher-luminance error foreground token (or `text-destructive-foreground` if one exists) so field and banner error text hits 4.5:1 against its own tinted background in both themes.
- **Suggested command**: `/impeccable harden` (or `/impeccable audit` for a broader contrast sweep of the rest of the admin surface, since this token is likely reused elsewhere)

**[P1] Primary CTA uses the wrong semantic color and violates the Flat-Admin Rule**
- **Why it matters**: Line 518's `bg-accent hover:bg-accent/90 ... shadow-lg shadow-accent/20` resolves to Signal Red (`--accent`, confirmed via index.css), not Fleet Navy (`--primary`) — DESIGN.md names Fleet Navy explicitly for "primary CTAs" and reserves Signal Red for "hover-state accents... not general decoration." Separately, the resting-state colored shadow (`shadow-lg shadow-accent/20`) breaks the Flat-Admin Rule, which permits glow/lift only on the storefront's `.glass-panel-hover`, never on Admin/POS. The drawer panel itself also carries `shadow-2xl` (line 158). This is the single most-clicked button in the component wearing the wrong token and the wrong tier's depth treatment.
- **Fix**: Swap to `bg-primary hover:bg-primary/90 disabled:bg-primary/60`, drop `shadow-lg shadow-accent/20` entirely. Reconsider `shadow-2xl` on the drawer shell (line 158) too — Admin/POS depth should come from `border-border`/`hairline` only.
- **Suggested command**: `/impeccable polish`

**[P2] Clone-template block outweighs the actually-required fields**
- **Why it matters**: Lines 185-227 (tinted container, bordered box, solid `bg-brandBlue-500` "Apply Template" button) sit above Part Name/SKU/OEM/Category (229-314), which have no container at all — just bare labels and inputs. The optional convenience feature visually outranks the required task. A first-time staff member's eye lands on "clone" before "name."
- **Fix**: De-emphasize the clone box — drop the tinted border/background or shrink it to a smaller inline affordance — so the required fields read as the primary task.
- **Suggested command**: `/impeccable layout`

**[P2] Enter-to-advance is inconsistent across the wizard**
- **Why it matters**: Steps 1 and 3 wire `onKeyDown` Enter handlers on every text input (238, 254, 268, 453, 469, 484); Step 2's three compatibility-row inputs (331-363) and description textarea (384-390) have none. A user who's learned "Enter moves me forward" from Step 1 hits a dead key on Step 2 — an inconsistent interaction model inside one wizard.
- **Fix**: Either extend the same handler to Step 2's text inputs (skip the textarea, where Enter should insert a newline) or remove it everywhere for one consistent rule.
- **Suggested command**: `/impeccable polish`

**[P3] Accessibility gaps: unlabeled icon button, unassociated file input, native `confirm()` dialogs**
- **Why it matters**: The Trash button removing a compatibility row (364-374) is icon-only with no `aria-label` — a screen reader announces an unlabeled button. The "Part Image" label (394-396) isn't associated (`htmlFor`/`id`) with the `<input type="file">` (406-423) — assistive tech gets only the browser's generic "Choose File." The two `window.confirm()` calls (142 discard, 206 overwrite) are native browser dialogs with no dialog role/heading structure, dropping a user out of the drawer's otherwise custom UI at the two highest-stakes moments (discard work, overwrite data).
- **Fix**: Add `aria-label="Remove compatibility row"` to the Trash button; wrap the file input in its label or add `htmlFor`/`id`; replace both `confirm()` calls with a lightweight custom dialog reusing `Drawer.jsx`'s visual language.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Alex (Power User)**: Learns Enter-to-advance on Step 1, hits a dead key on Step 2's compatibility rows and description (P2 above) — a real speed-bump exactly where flow is expected to continue. Re-applying the clone template on a partially-filled form re-triggers the native `confirm()` overwrite prompt every time (line 206) — friction on a feature meant to save time.

**Sam (Accessibility-Dependent User)**: Hits an unlabeled Trash button (373), an unassociated file-input label (394-423), and — in dark mode specifically — cannot read any validation error at all by contrast math (1.71–1.93:1). Closing with unsaved changes or applying a clone drops Sam into an unstyled native `confirm()` with no dialog role, heading, or named actions beyond OS-default OK/Cancel.

## Minor Observations

- `text-emerald-500` (line 231, "field filled" state icon) is a hardcoded stock-Tailwind color with no corresponding token in DESIGN.md's palette — likely a reasonable ad hoc "success" signal, but it should get a named token if this pattern is meant to repeat.
- Progress bar (175-177) carries no `role="progressbar"`/`aria-valuenow` — a screen reader gets nothing from it, relying entirely on the step-label text at line 164.
- Zero `dark:` Tailwind variant classes exist anywhere in this 542-line file — every color decision rides the CSS-variable system with no per-element dark-mode consideration, which is exactly why the P0 contrast failure went unnoticed.
- `handleFormSubmit(e)` is called with an event argument at lines 453/469/484 despite the function signature taking none (line 104) — harmless today, a latent footgun if the signature changes.
- `text-muted-foreground` on `bg-secondary` measures 4.34:1 in light mode — just under the 4.5:1 AA threshold for body text (labels at lines 168, 246, etc.); dark mode is fine at 6.84:1.

## Questions to Consider

- If Fleet Navy is defined as this system's "trust/primary action" color, why does the single most consequential button in this component (Save Part) render in the attention color instead?
- Given error-message architecture is already consistent everywhere, why was contrast never checked against the `.dark` token values before shipping — and does this same `text-destructive`-on-tint pattern repeat on other admin surfaces that also need a look?
- Is the clone-template feature earning its position as the very first thing an admin sees, or would it read better as a secondary, less visually loud entry point?

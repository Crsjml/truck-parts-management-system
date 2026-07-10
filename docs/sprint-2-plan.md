# Sprint 2 Implementation Plan

## Completed (icon system fixes)

### 1. `getCategoryStyles` — Root cause fix
**Problem:** `getCategoryStyles` in `CustomerStorefront.jsx` and `PartsCatalog.jsx` only passed category **name** to `getCategoryIconAndColor()`, never the DB-stored `iconName`/`colorTheme`. Fell through to `autoSuggest()` keyword guesser → wrong/null icons.

**Fix applied:**
- `CustomerStorefront.jsx:191` — updated to look up `nestedCategories` for DB values
- `PartsCatalog.jsx:75` — updated to look up `categoriesList` for DB values
- `CustomerStorefront.jsx:606` — part detail slide-over also updated

### 2. `autoSuggest` fallback expanded
Added keyword matches for: leaf springs, axles, alternators, wiring, harness, windshields, glass, bumpers, chambers, cabins/trucks. Was returning `null` for these before.

---

## Ready to implement

### 3. CRITICAL — Stripe checkout broken
**Problem:** `stripe.redirectToCheckout` removed in Stripe.js (2025-09-30 changelog). Runtime error:
```
redirectToCheckout is no longer supported in this version of Stripe.js
```

**Fix:** Backend already returns `session.url`. Replace at `CustomerStorefront.jsx:162`:
```javascript
// BEFORE (broken)
const stripe = await stripePromise;
await stripe.redirectToCheckout({ sessionId: session.id });

// AFTER (working)
const session = await response.json();
if (session.error) throw new Error(session.error);
window.location.href = session.url;
```

Remove unused `stripePromise`/`loadStripe` import if no longer referenced elsewhere.

---

## Deferred (post-commit)
- Extract `PartFormModal`, `PartDetailModal`, `InquiryModal` from `PartsCatalog.jsx` (1000 lines)
- Extract `StorefrontHeader`, `StorefrontHero`, `ProductDetailPanel` from `CustomerStorefront.jsx` (834 lines)
- Replace emoji `⚠` with icon component in `PartsCatalog.jsx:742`
- Validate Stripe API keys at startup instead of hardcoded fallbacks
- Add 401 re-login prompt in checkout error handling

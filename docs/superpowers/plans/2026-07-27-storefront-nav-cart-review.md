# Storefront Nav Bar & Add-to-Cart Flow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three real problems found in a review of the storefront nav bar and add-to-cart/cart-popup flow: a blocking `window.alert()` on stock-limit errors, the cart drawer force-reopening on every single add, and a user-account dropdown that is completely unreachable by keyboard or touch (CSS `:hover`-only, no click, no `aria-expanded`).

**Architecture:** Reuse the `useToast`/`ToastNotification` infrastructure that already exists in `App.jsx` but isn't wired into the storefront view. Replace the account dropdown's hover-only interaction with a click-toggled, keyboard-accessible menu using existing React state (no new dependency — none of Radix/Headless UI/focus-trap-react are installed). No new components, no new dependencies, no visual redesign.

**Tech Stack:** React 18, Vite, Tailwind, Framer Motion (existing `Drawer` primitive), Vitest + React Testing Library.

## Global Constraints

- Jira ticket: **TTP-172** ("Migrate CartDrawer onto the shared accessible drawer primitive and improve UI") — see Task 4 note; confirm scope covers Tasks 1-3 too before committing (flagged for user decision).
- Commit format: `type(TTP-172): description`. Never push (local commits only).
- No new npm dependencies.
- Surgical diffs only — do not touch styling/behavior not named in a task.
- Phosphor Icons only (already satisfied by existing imports).
- Relative `/api/*` paths only — not applicable, no API calls added in this plan.
- Every non-trivial change gets a runnable check (RTL test) per task, per ponytail's "lazy code without its check is unfinished" rule.

## Routing Table (from ui-change Step 0e)

| Part | Portal tier | Skills | Why |
|------|-------------|--------|-----|
| Nav bar / header | Premium (Shared Primitive) | `web-design-guidelines`, `tailwind-design-system`, `frontend-patterns` | Header is a shared primitive per CLAUDE.md §4 Tier 3 — spacing/interaction/a11y + token consistency, not aesthetic overhaul |
| Add-to-cart interaction | Premium (Card CTA) | `high-end-visual-design`, `emil-design-eng`, `accessibility` | CTA micro-interaction + motion polish; blocking `alert()` breaks keyboard/screen-reader flow |
| Cart popup | Trust (Cart & Checkout) | `web-design-guidelines`, `kpi-dashboard-design` | Trust-tier per Tier 2 table — price/subtotal clarity + interaction correctness over decoration |

---

### Task 1: Wire toast notifications into the storefront view

**Files:**
- Modify: `frontend/src/App.jsx:483-493` (storefront early-return branch)
- Modify: `frontend/src/components/CustomerStorefront.jsx:1` (imports), `:22-32` (props signature)

**Interfaces:**
- Consumes: `useToast()` hook already defined in `App.jsx:44` — produces `{ toasts, showToast, dismissToast }`. `showToast(message: string, type?: 'success' | 'error' | 'info')`.
- Produces: `showToast` prop available inside `CustomerStorefront` for Task 2 to call.

- [ ] **Step 1: Add `showToast` prop and render `<ToastNotification />` in the storefront branch**

In `frontend/src/App.jsx`, the storefront early return currently reads:

```jsx
  if (activeView === 'storefront') {
    return (
      <>
        <CustomerStorefront
          parts={parts}
          categories={categories}
          transactions={transactions}
          customerSession={customerSession}
          onOpenCustomerAuth={handleOpenCustomerAuth}
          onOpenAdminAuth={handleOpenAdminAuth}
          onLogoutCustomer={() => handleLogout('customer')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleAutoCustomerLogin}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
        <StatusBar />
        {needsProfileCompletion && (
          <CompleteProfileModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }
```

Change it to (add `showToast` prop and the `<ToastNotification />` render — this component currently only renders in the non-storefront return path at the bottom of the file, so toasts silently never appear while browsing the storefront):

```jsx
  if (activeView === 'storefront') {
    return (
      <>
        <CustomerStorefront
          parts={parts}
          categories={categories}
          transactions={transactions}
          customerSession={customerSession}
          onOpenCustomerAuth={handleOpenCustomerAuth}
          onOpenAdminAuth={handleOpenAdminAuth}
          onLogoutCustomer={() => handleLogout('customer')}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          showToast={showToast}
        />
      <FloatingSettingsWidget 
        onAdminLogin={handleAutoAdminLogin}
        onCustomerLogin={handleAutoCustomerLogin}
        onLogout={() => handleLogout(adminSession ? 'admin' : 'customer')}
        isLoggedIn={!!adminSession || !!customerSession}
      />
        <StatusBar />
        <ToastNotification toasts={toasts} onDismiss={dismissToast} />
        {needsProfileCompletion && (
          <CompleteProfileModal onComplete={handleProfileComplete} />
        )}
      </>
    );
  }
```

- [ ] **Step 2: Accept the `showToast` prop in `CustomerStorefront`**

In `frontend/src/components/CustomerStorefront.jsx`, change the props destructure (currently lines 22-32):

```jsx
export default function CustomerStorefront({
  parts,
  categories,
  customerSession,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  onLogoutCustomer,
  isDarkMode,
  setIsDarkMode,
  transactions
}) {
```

to:

```jsx
export default function CustomerStorefront({
  parts,
  categories,
  customerSession,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  onLogoutCustomer,
  isDarkMode,
  setIsDarkMode,
  transactions,
  showToast
}) {
```

- [ ] **Step 3: Manual verification (no App.jsx test harness exists in this repo — don't introduce one for a single prop-wire)**

Run the frontend dev server (`npm run dev` in `/frontend`), open the storefront, open React DevTools on the `CustomerStorefront` element, confirm the `showToast` prop is a function (not `undefined`).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/CustomerStorefront.jsx
git commit -m "fix(TTP-172): wire toast notifications into storefront view"
```

---

### Task 2: Replace `alert()` and forced drawer-reopen in `addToCart`

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:167-187`
- Test: `frontend/src/tests/CustomerStorefront.test.jsx`

**Interfaces:**
- Consumes: `showToast` prop from Task 1 (`showToast(message: string, type?: 'success' | 'error' | 'info')`).
- Produces: no new exports — behavioral fix only, internal to `addToCart`.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/tests/CustomerStorefront.test.jsx` (inside the existing `describe('CustomerStorefront Component Tests', ...)` block, after the last `it`):

```jsx
  it('opens the cart drawer on the first add but not on subsequent adds', async () => {
    const showToast = vi.fn();
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    const addButtons = await screen.findAllByRole('button', { name: /^add$/i });
    fireEvent.click(addButtons[0]); // Brake Pad Set

    expect(await screen.findByRole('heading', { name: /your cart/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /minimize cart/i }));
    expect(screen.queryByRole('heading', { name: /your cart/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^add$/i })[1]); // Oil Filter
    expect(screen.queryByRole('heading', { name: /your cart/i })).not.toBeInTheDocument();

    expect(showToast).toHaveBeenCalledWith('Brake Pad Set added to cart', 'success');
    expect(showToast).toHaveBeenCalledWith('Oil Filter added to cart', 'success');
  });

  it('shows a toast instead of a blocking alert when stock is exceeded', async () => {
    const showToast = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const lowStockPart = { ...mockParts[0], id: '3', name: 'Rare Bolt', stock: 1 };

    render(<CustomerStorefront parts={[lowStockPart]} categories={['Brakes']} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    const addButton = await screen.findByRole('button', { name: /^add$/i });
    fireEvent.click(addButton); // fills the only unit in stock
    fireEvent.click(addButton); // requests a 2nd unit — exceeds stock

    expect(showToast).toHaveBeenCalledWith(
      'Cannot add more. Only 1 units of Rare Bolt are available.',
      'error'
    );
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- CustomerStorefront` (from `/frontend`)
Expected: FAIL — `showToast` is never called (current code calls `window.alert` and always calls `setIsCartOpen(true)`).

- [ ] **Step 3: Fix `addToCart`**

In `frontend/src/components/CustomerStorefront.jsx`, replace the current `addToCart` (lines 167-187):

```jsx
  const addToCart = (part, quantity = 1) => {
    const availableStock = part.stock - (part.reservedStock || 0);
    const existing = cart.find(item => item.id === part.id);
    const requested = existing ? existing.quantity + quantity : quantity;

    if (requested > availableStock) {
      alert(`Cannot add more. Only ${availableStock} units of ${part.name} are available.`);
      return;
    }

    setCart(prev => {
      const found = prev.find(item => item.id === part.id);
      if (found) {
        return prev.map(item =>
          item.id === part.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...part, quantity }];
    });
    setIsCartOpen(true);
  };
```

with:

```jsx
  const addToCart = (part, quantity = 1) => {
    const availableStock = part.stock - (part.reservedStock || 0);
    const existing = cart.find(item => item.id === part.id);
    const requested = existing ? existing.quantity + quantity : quantity;

    if (requested > availableStock) {
      showToast(`Cannot add more. Only ${availableStock} units of ${part.name} are available.`, 'error');
      return;
    }

    if (cart.length === 0) {
      setIsCartOpen(true);
    }
    setCart(prev => {
      const found = prev.find(item => item.id === part.id);
      if (found) {
        return prev.map(item =>
          item.id === part.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...part, quantity }];
    });
    showToast(`${part.name} added to cart`, 'success');
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- CustomerStorefront` (from `/frontend`)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx frontend/src/tests/CustomerStorefront.test.jsx
git commit -m "fix(TTP-172): replace blocking alert with toast, stop force-reopening cart on every add"
```

---

### Task 3: Make the account dropdown keyboard- and touch-accessible

**Files:**
- Modify: `frontend/src/components/CustomerStorefront.jsx:1` (add `useRef` import), `:80` (add state/ref/effect), `:387-418` (dropdown markup)
- Test: `frontend/src/tests/CustomerStorefront.test.jsx`

**Interfaces:**
- Consumes: none new.
- Produces: no new exports — internal interaction fix only.

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/tests/CustomerStorefront.test.jsx`:

```jsx
  it('opens and closes the account menu by click and keyboard, not hover', async () => {
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com', fullName: 'Test Customer' } };
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={mockSession} />);

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: /my profile/i })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: /my profile/i })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes the account menu on outside click', async () => {
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com', fullName: 'Test Customer' } };
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={mockSession} />);

    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-expanded', 'false');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- CustomerStorefront` (from `/frontend`)
Expected: FAIL — no `aria-expanded` attribute exists yet, trigger has no accessible name matching `/account menu/i`.

- [ ] **Step 3: Add `useRef` import**

In `frontend/src/components/CustomerStorefront.jsx:1`, change:

```jsx
import React, { useMemo, useState, useEffect } from 'react';
```

to:

```jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
```

- [ ] **Step 4: Add menu state, ref, and outside-click/Escape handling**

Immediately after `const [isCartOpen, setIsCartOpen] = useState(false);` (line 80), insert:

```jsx
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handlePointerDown = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
        accountMenuRef.current?.querySelector('#account-menu-trigger')?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);
```

- [ ] **Step 5: Replace the dropdown markup**

Replace the current block (originally lines 387-418):

```jsx
              {customerSession ? (
                <div className="relative group z-50">
                  <button className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5 bg-secondary text-sm font-semibold transition hover:border-accent/50 hover:bg-background">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <UserCircle weight="duotone" className="w-5 h-5 text-accent" />
                    )}
                    <span className="max-w-[120px] truncate text-xs">{customerSession.user.fullName}</span>
                    <CaretDown weight="bold" className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                  </button>
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border border-border bg-background shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden transform origin-top-right group-hover:scale-100 scale-95">
                    <div className="p-3 bg-secondary/30 border-b border-border/50">
                       <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Signed In As</p>
                       <p className="text-sm font-bold text-foreground truncate">{customerSession.user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button onClick={() => setStorefrontTab('orders')} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <ClipboardText weight="duotone" className="w-4 h-4 text-accent"/> My Purchases
                      </button>
                      <button onClick={() => setStorefrontTab('profile')} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <Gear weight="duotone" className="w-4 h-4 text-accent"/> My Profile
                      </button>
                    </div>
                    <div className="p-1.5 border-t border-border/50 bg-secondary/10">
                      <button onClick={() => { setCart([]); setStorefrontTab('home'); onLogoutCustomer(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition flex items-center gap-3">
                        <SignIn weight="duotone" className="w-4 h-4"/> Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
```

with:

```jsx
              {customerSession ? (
                <div className="relative z-50" ref={accountMenuRef}>
                  <button
                    id="account-menu-trigger"
                    type="button"
                    aria-expanded={isAccountMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    onClick={() => setIsAccountMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5 bg-secondary text-sm font-semibold transition hover:border-accent/50 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {avatar ? (
                      <img src={avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <UserCircle weight="duotone" className="w-5 h-5 text-accent" />
                    )}
                    <span className="max-w-[120px] truncate text-xs">{customerSession.user.fullName}</span>
                    <CaretDown weight="bold" className={`w-3 h-3 text-muted-foreground transition-transform ${isAccountMenuOpen ? 'rotate-180 text-foreground' : ''}`} />
                  </button>
                  <div
                    role="menu"
                    aria-labelledby="account-menu-trigger"
                    className={`absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200 overflow-hidden transform origin-top-right ${isAccountMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}
                  >
                    <div className="p-3 bg-secondary/30 border-b border-border/50">
                       <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Signed In As</p>
                       <p className="text-sm font-bold text-foreground truncate">{customerSession.user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <button role="menuitem" onClick={() => { setStorefrontTab('orders'); setIsAccountMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <ClipboardText weight="duotone" className="w-4 h-4 text-accent"/> My Purchases
                      </button>
                      <button role="menuitem" onClick={() => { setStorefrontTab('profile'); setIsAccountMenuOpen(false); }} className="w-full text-left px-3 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition flex items-center gap-3">
                        <Gear weight="duotone" className="w-4 h-4 text-accent"/> My Profile
                      </button>
                    </div>
                    <div className="p-1.5 border-t border-border/50 bg-secondary/10">
                      <button role="menuitem" onClick={() => { setIsAccountMenuOpen(false); setCart([]); setStorefrontTab('home'); onLogoutCustomer(); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition flex items-center gap-3">
                        <SignIn weight="duotone" className="w-4 h-4"/> Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- CustomerStorefront` (from `/frontend`)
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CustomerStorefront.jsx frontend/src/tests/CustomerStorefront.test.jsx
git commit -m "fix(TTP-172): make account dropdown keyboard and touch accessible"
```

---

### Task 4: Announce cart subtotal changes to screen readers

**Files:**
- Modify: `frontend/src/components/CartDrawer.jsx:96-100`
- Test: `frontend/src/tests/CartDrawer.test.jsx`

**Interfaces:**
- Consumes: none new.
- Produces: none new.

- [ ] **Step 1: Write the failing test**

Append to the `describe('CartDrawer pricing', ...)` block in `frontend/src/tests/CartDrawer.test.jsx`:

```jsx
  it('marks the subtotal as a live region so screen readers announce changes', () => {
    renderCart();
    const matches = screen.getAllByText(/PHP 2,?300\.00/);
    const liveMatch = matches.find((el) => el.getAttribute('aria-live') === 'polite');
    expect(liveMatch).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CartDrawer` (from `/frontend`)
Expected: FAIL — no element has `aria-live="polite"`.

- [ ] **Step 3: Add `aria-live` to the subtotal**

In `frontend/src/components/CartDrawer.jsx`, change (currently lines 96-100):

```jsx
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtotal</span>
            <span className="text-xl font-black text-foreground font-mono tabular-nums">{formatCurrency(cartTotalAmount)}</span>
          </div>
```

to:

```jsx
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtotal</span>
            <span aria-live="polite" className="text-xl font-black text-foreground font-mono tabular-nums">{formatCurrency(cartTotalAmount)}</span>
          </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CartDrawer` (from `/frontend`)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CartDrawer.jsx frontend/src/tests/CartDrawer.test.jsx
git commit -m "fix(TTP-172): announce cart subtotal changes to screen readers"
```

---

## Final Verification (after all 4 tasks)

- [ ] Run the full frontend test suite: `npm test` (from `/frontend`) — all pass.
- [ ] Manual browser check: add 3 different items to cart in a row — drawer opens once (on the first add), stays closed after being minimized, a success toast fires per add, badge count is correct.
- [ ] Manual browser check: reduce a part's available stock to 0 in dev tools / seed data, attempt to add it — an error toast appears, no native `alert()` dialog.
- [ ] Manual browser check: Tab to the account menu trigger (signed-in session), press Enter/Space to open, Tab through menu items, press Escape — focus returns to the trigger, menu closes. Repeat with mouse-only (click open, click elsewhere to close).

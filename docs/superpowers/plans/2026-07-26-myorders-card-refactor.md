# MyOrders Card Layout Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Refactor MyOrders from expandable rows to card-based layout matching Shopee/Nike style.

**Architecture:** Extract OrderCard as a reusable presentational component. MyOrders parent remains data owner—handles filtering, state, and modals. Card displays order info (header: status/date, body: items, footer: bold total + actions).

**Tech Stack:** React, Tailwind CSS, Framer Motion, jsPDF (existing)

## Global Constraints
- No API changes (transactions array format stays same)
- All existing functionality preserved: PDF download, review modal, status badges, tab filters
- React 18+, Tailwind CSS, Framer Motion for animations
- Mobile-first responsive design
- Accessibility: aria labels, keyboard nav, semantic HTML

---

## File Structure

**Create:**
- `frontend/src/components/OrderCard.jsx` — Presentational card component for single order

**Modify:**
- `frontend/src/components/MyOrders.jsx` — Refactor to card grid, preserve filtering/state/modals

**Test:**
- `frontend/src/components/__tests__/OrderCard.test.jsx` — Card rendering, layout

---

### Task 1: Create OrderCard Component (Presentation Only)

**Files:**
- Create: `frontend/src/components/OrderCard.jsx`
- Test: `frontend/src/components/__tests__/OrderCard.test.jsx`

**Interfaces:**
- Consumes: `transaction` object (shape: `{ id, invoiceNumber, transactionDate, status, items[], total, subtotal, taxAmount, discount, customerName, customerContact }`)
- Consumes: `displayCurrency` string (e.g., "$" or "₱")
- Consumes: `formatCurrency(amount)` function
- Consumes: callback props: `onDownloadPDF(transaction)`, `onReview(partId, partName)`, `onReorder()`
- Produces: Rendered card JSX element (no state management)

- [ ] **Step 1: Write failing test for OrderCard rendering**

```javascript
// frontend/src/components/__tests__/OrderCard.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import OrderCard from '../OrderCard';

describe('OrderCard', () => {
  const mockTransaction = {
    id: '1',
    invoiceNumber: 'INV-001',
    transactionDate: '2026-07-26T10:00:00Z',
    status: 'READY_FOR_PICKUP',
    items: [
      { id: '1', name: 'Brake Pads', price: 500, quantity: 2 }
    ],
    total: 1120,
    subtotal: 1000,
    taxAmount: 120,
    discount: 0,
    customerName: 'John Doe',
    customerContact: '09171234567'
  };

  const mockHandlers = {
    onDownloadPDF: jest.fn(),
    onReview: jest.fn(),
    onReorder: jest.fn()
  };

  it('renders order card with header, body, footer', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    // Header assertions
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText(/Ready for Pickup/i)).toBeInTheDocument();
    
    // Body assertions
    expect(screen.getByText('Brake Pads')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // quantity
    
    // Footer assertions
    expect(screen.getByText(/₱ 1120/)).toBeInTheDocument(); // total (bold)
  });

  it('renders action buttons (PDF, Reorder, Review)', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reorder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
  });

  it('calls onDownloadPDF when PDF button clicked', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    screen.getByRole('button', { name: /download/i }).click();
    expect(mockHandlers.onDownloadPDF).toHaveBeenCalledWith(mockTransaction);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- OrderCard.test.jsx
```

Expected: FAIL — `OrderCard` component does not exist.

- [ ] **Step 3: Create minimal OrderCard component**

```javascript
// frontend/src/components/OrderCard.jsx
import React from 'react';
import { Download, ArrowClockwise, Star, X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const getStatusColor = (status) => {
  switch(status) {
    case 'COMPLETED': return { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Completed' };
    case 'READY_FOR_PICKUP': return { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Ready for Pickup' };
    case 'ORDER_PLACED': return { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Order Placed' };
    default: return { badge: 'bg-secondary text-muted-foreground border-border', label: status };
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function OrderCard({
  transaction,
  displayCurrency,
  formatCurrency,
  onDownloadPDF,
  onReview,
  onReorder
}) {
  const statusInfo = getStatusColor(transaction.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header: Status badge, Date, Invoice number */}
      <div className="border-b border-border/30 p-4 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Order #{transaction.invoiceNumber}</p>
          <p className="text-sm text-muted-foreground">{formatDate(transaction.transactionDate)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ml-2 ${statusInfo.badge}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Body: Items list */}
      <div className="p-4 border-b border-border/30 space-y-2">
        {transaction.items && transaction.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{displayCurrency} {item.price} × {item.quantity}</p>
            </div>
            <p className="text-sm font-mono text-foreground ml-2">{displayCurrency} {(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Footer: Bold total, Action buttons */}
      <div className="p-4 bg-secondary/40 space-y-4">
        <div className="flex items-center justify-between border-t border-border/30 pt-3">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-xl font-black text-foreground">{formatCurrency(transaction.total)}</span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onDownloadPDF(transaction)}
            className="flex-1 py-2 px-3 rounded-lg border border-border/60 bg-background hover:bg-secondary text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-2"
            aria-label="Download PDF invoice"
          >
            <Download weight="bold" className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => onReorder && onReorder(transaction.items)}
            className="flex-1 py-2 px-3 rounded-lg border border-border/60 bg-background hover:bg-secondary text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-2"
            aria-label="Reorder items"
          >
            <ArrowClockwise weight="bold" className="w-4 h-4" />
            Reorder
          </button>
          <button
            onClick={() => onReview && onReview(transaction.items[0]?.id, transaction.items[0]?.name)}
            className="flex-1 py-2 px-3 rounded-lg border border-border/60 bg-background hover:bg-secondary text-sm font-bold text-foreground transition-colors flex items-center justify-center gap-2"
            aria-label="Leave review"
          >
            <Star weight="bold" className="w-4 h-4" />
            Review
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- OrderCard.test.jsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/OrderCard.jsx src/components/__tests__/OrderCard.test.jsx && git commit -m "feat(TTP-XXX): create OrderCard presentational component"
```

---

### Task 2: Refactor MyOrders to Use OrderCard Grid

**Files:**
- Modify: `frontend/src/components/MyOrders.jsx:1-300` (refactor layout, reuse existing logic)

**Interfaces:**
- Consumes: Same props as current MyOrders (transactions, customerName, customerEmail, userId, onReorder)
- Produces: Card-based grid layout (uses OrderCard component from Task 1)
- Preserves: Tab filters, PDF download, review modal, all existing state

- [ ] **Step 1: Read existing MyOrders structure**

Understand current state management:
- `activeTab`, `expandedRow`, `reviewModal`, `newRating`, `newReviewBody`
- Functions: `handleSubmitReview`, `handleDownloadPDF`, `formatStatus`, `getStatusColor`
- Tab list and filtering logic

All this logic is **preserved** — only the JSX layout changes from expandable rows → card grid.

- [ ] **Step 2: Update MyOrders JSX to card grid layout**

Replace the render section (approximately lines 150-250) with card grid:

```javascript
// Keep all state and helper functions EXACTLY the same
// Only replace the JSX return block starting after `const tabs = [...]`

// In the render JSX, replace the table/expandable rows section with:

{/* Tab Filters - SAME AS BEFORE */}
<div className="flex gap-2 mb-6 overflow-x-auto pb-2">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
        activeTab === tab.id
          ? 'bg-foreground text-background'
          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <tab.icon weight="bold" className="w-4 h-4 inline-block mr-2" />
      {tab.label}
    </button>
  ))}
</div>

{/* Card Grid - NEW */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredTx.length === 0 ? (
    <div className="col-span-full text-center py-12 opacity-60">
      <ShoppingCart weight="duotone" className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-bold text-muted-foreground">No orders in this category</p>
    </div>
  ) : (
    filteredTx.map(tx => (
      <OrderCard
        key={tx.id}
        transaction={tx}
        displayCurrency={displayCurrency}
        formatCurrency={formatCurrency}
        onDownloadPDF={(txn) => handleDownloadPDF(txn, null)}
        onReview={(partId, partName) => {
          setReviewModal({ isOpen: true, partId, partName });
        }}
        onReorder={(items) => {
          if (onReorder) onReorder(items);
        }}
      />
    ))
  )}
</div>

{/* Review Modal - SAME AS BEFORE (no changes) */}
{reviewModal.isOpen && (
  // ... existing review modal code
)}
```

- [ ] **Step 3: Add OrderCard import at top**

```javascript
import OrderCard from './OrderCard';
```

- [ ] **Step 4: Run the app and test the layout**

```bash
cd frontend && npm run dev
```

Navigate to My Account → My Orders. Verify:
- Tab filters work (clicking changes displayed cards)
- Cards display correctly with header (status, date, invoice#), body (items), footer (bold total, buttons)
- PDF button downloads invoice
- Review button opens modal
- Reorder button works (if implemented)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/MyOrders.jsx && git commit -m "refactor(TTP-XXX): convert MyOrders to card-based layout"
```

---

### Task 3: Test Card Styling & Responsive Behavior

**Files:**
- Modify: `frontend/src/components/OrderCard.jsx` (fine-tune styles if needed)

**Interfaces:**
- No code changes — visual polish only

- [ ] **Step 1: Test on mobile (320px) and desktop (1440px)**

Use browser DevTools to check:
- Mobile (320px): Cards stack, text readable, buttons accessible
- Tablet (768px): 2-column grid
- Desktop (1440px): 3-column grid
- Hover states work on cards and buttons

- [ ] **Step 2: Test accessibility**

Run in browser console:
```javascript
// Check for aria labels and semantic HTML
document.querySelectorAll('button').forEach(btn => console.log(btn.getAttribute('aria-label')));
```

Verify:
- All buttons have aria-labels
- Status badges have correct colors
- Bold total is visually distinct (font-weight: 900)

- [ ] **Step 3: Test dark mode (if app supports it)**

Toggle dark theme. Verify:
- Card backgrounds contrast against page background
- Text remains readable
- Status badge colors visible in both light/dark

- [ ] **Step 4: Commit (if changes made)**

```bash
cd frontend && git add src/components/OrderCard.jsx && git commit -m "style(TTP-XXX): polish OrderCard styling and responsive behavior"
```

---

## Completion

Plan file: `docs/superpowers/plans/2026-07-26-myorders-card-refactor.md`

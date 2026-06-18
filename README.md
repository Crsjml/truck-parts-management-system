# Tarlac Truck Parts - Management System

A web-based Truck Parts Management System designed to streamline inventory tracking, parts catalog management, customer transactions, and sales monitoring for truck parts businesses.

---

## ⚡ Tech Stack

- **Frontend Core**: React 18, Vite (for lightning-fast builds)
- **Styling**: Tailwind CSS v3 (using customized HSL design tokens matching the brand logo)
- **Icons**: Lucide React
- **Document Compiling**: jsPDF & jsPDF-AutoTable (client-side PDF sales invoice engine)

---

---

## 🚀 How to Run the Application

To run the local development server and preview the frontend design:

### Step 1: Open Terminal
Open your terminal (Command Prompt, PowerShell, or Bash) and navigate to the `frontend` folder:
```bash
cd frontend
```

### Step 2: Install Dependencies
Download the React, Tailwind CSS, and PDF packages:
```bash
npm install
```

### Step 3: Launch Dev Server
Start the local server:
```bash
npm run dev
```

### Step 4: Preview in Browser
Open the URL printed in your terminal (usually **`http://localhost:5173`**) in your web browser.

---

## 🛠️ Main Features in the UI

1. **Dashboard Overview**: Track inventory valuation totals, checkout sales numbers, and live low-stock notices.
2. **Interactive Parts Catalog**:
   - Filter items by category tabs.
   - Live query search by part name, SKU, or OEM numbers.
   - Technical detail modals with vehicle compatibility details.
   - Inline quantity restocking counters.
   - Add new items or edit existing fields via dialog forms.
3. **Point of Sale (POS) Billing**:
   - Add parts to a transaction cart with active stock checks.
   - Auto-calculate subtotal, custom discounts, 12% VAT, and net totals.
   - Checkout to update warehouse counts and log transaction activity.
4. **PDF Sales Invoicing**: High-fidelity PDF compiling. Generate and download clean invoices instantly upon checkout.
5. **Sales Analytics & Ledger**: Visual horizontal charts detailing top-selling parts and stock allocations, and a transaction history grid to re-download copy receipts.

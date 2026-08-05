import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../Dashboard';
import Analytics from '../Analytics';

vi.mock('../../api/apiClient', () => ({
  apiGet: vi.fn().mockResolvedValue([])
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: 15 },
    formatCurrency: (val) => `${(val * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (MARKUP)`,
    formatBaseCurrency: (val) => `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (BASE)`,
    formatCompactCurrency: (val) => `${(val * 1.15).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (COMPACT-MARKUP)`,
    formatCompactBaseCurrency: (val) => `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (COMPACT-BASE)`
  })
}));

const mockTransaction = {
  id: 'tx1',
  invoiceNumber: 'INV-1234',
  transactionDate: new Date().toISOString(),
  customerName: 'Test Customer',
  items: [{ name: 'Brake Pad', sku: 'BP-100', price: 1000, quantity: 1 }],
  total: 94193.91
};

describe('Double Markup Regression', () => {
  it('Dashboard Recent Activities and Revenue KPI show unmarked-up transaction total', () => {
    render(<Dashboard parts={[]} transactions={[mockTransaction]} logs={[]} setPage={vi.fn()} setSelectedCategory={vi.fn()} />);
    
    // Recent activities (94,193.91)
    expect(screen.getByText(/Sale completed for Test Customer.*94,193\.91 \(BASE\)/i)).toBeInTheDocument();
    
    // The Revenue KPI should use formatCompactBaseCurrency which outputs (COMPACT-BASE)
    // and its title should use formatBaseCurrency (BASE)
    const revenueKpiTitle = screen.getByTitle(/94,193\.91 \(BASE\)/i);
    expect(revenueKpiTitle).toBeInTheDocument();
    expect(revenueKpiTitle).toHaveTextContent(/94,193\.91 \(COMPACT-BASE\)/i);
  });

  it('Analytics revenue tiles and list show unmarked-up transaction total', () => {
    render(<Analytics parts={[]} transactions={[mockTransaction]} />);
    
    // The "Total Revenue" KPI tile (should be (BASE))
    expect(screen.getAllByText(/94,193\.91 \(BASE\)/i).length).toBeGreaterThan(0);
    
    // Inside the ledger table
    const tdElements = screen.getAllByText(/94,193\.91 \(BASE\)/i, { selector: 'td' });
    expect(tdElements.length).toBeGreaterThan(0);
  });
});

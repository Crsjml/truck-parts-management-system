import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Analytics from '../Analytics';

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: 15 },
    formatCurrency: (val) => `$${val}`,
    formatBaseCurrency: (val) => `$${val}`,
    formatCompactCurrency: (val) => `$${val}`,
    formatCompactBaseCurrency: (val) => `$${val}`
  })
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Analytics Channel Filter', () => {
  const mockTransactions = [
    {
      id: 'tx1',
      invoiceNumber: 'INV-1',
      customerName: 'Cust A',
      transactionDate: new Date().toISOString(),
      stripeSessionId: 'sess_123',
      total: 100,
      items: [{ quantity: 1, price: 100 }]
    },
    {
      id: 'tx2',
      invoiceNumber: 'INV-2',
      customerName: 'Cust B',
      transactionDate: new Date().toISOString(),
      stripeSessionId: null,
      total: 50,
      items: [{ quantity: 1, price: 50 }]
    }
  ];

  it('filters KPIs and degrades Payment Mix card when Online is selected', () => {
    render(<Analytics parts={[]} transactions={mockTransactions} />);
    
    // Default 'all' - Revenue should be 150
    expect(screen.getAllByText('$150').length).toBeGreaterThan(0);
    
    // Switch to 'online'
    fireEvent.click(screen.getByRole('button', { name: /Online/i }));
    
    // Revenue should now be 100
    expect(screen.getAllByText('$100').length).toBeGreaterThan(0);
    
    // Payment Mix should show degenerate card "100% Card"
    expect(screen.getByText('100% Card')).toBeInTheDocument();
    expect(screen.getByText('1 orders · $100')).toBeInTheDocument();
  });
  
  it('filters KPIs when In-Store is selected', () => {
    render(<Analytics parts={[]} transactions={mockTransactions} />);
    
    // Switch to 'store'
    fireEvent.click(screen.getByRole('button', { name: /In-Store/i }));
    
    // Revenue should now be 50
    expect(screen.getAllByText('$50').length).toBeGreaterThan(0);
  });
});

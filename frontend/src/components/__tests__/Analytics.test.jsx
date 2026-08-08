import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import Analytics from '../Analytics';

const fetchCategoriesList = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: 15 },
    formatCurrency: (val) => `$${val}`,
    formatBaseCurrency: (val) => `$${val}`,
    formatCompactCurrency: (val) => `$${val}`,
    formatCompactBaseCurrency: (val) => `$${val}`
  })
}));

vi.mock('../../authStore', () => ({
  fetchCategoriesList: (...args) => fetchCategoriesList(...args)
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args) => getSession(...args)
    }
  }
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

  beforeEach(() => {
    fetchCategoriesList.mockReset();
    fetchCategoriesList.mockResolvedValue([]);
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

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

  it('surfaces an attention summary for pending orders and slow-moving stocked parts', () => {
    render(
      <Analytics
        parts={[
          { id: 'p1', name: 'Clutch Disc', sku: 'CD-100', stock: 4, category: 'Transmission' },
          { id: 'p2', name: 'Brake Pad', sku: 'BP-100', stock: 0, category: 'Brake' }
        ]}
        transactions={[
          {
            ...mockTransactions[0],
            status: 'Ready for Pickup',
            items: [{ partId: 'p2', name: 'Brake Pad', quantity: 1, price: 100 }]
          }
        ]}
      />
    );

    expect(screen.getByText(/Needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/1 pickup\/order pending/i)).toBeInTheDocument();
    expect(screen.getByText(/1 stocked part has no sales/i)).toBeInTheDocument();
  });

  it('updates order status from the invoice drawer with explicit feedback', async () => {
    render(<Analytics parts={[]} transactions={[{ ...mockTransactions[0], status: 'Order Placed' }]} />);

    expect(screen.queryByLabelText(/Change order status/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View Invoice Details/i }));

    const statusSelect = screen.getByLabelText(/New order status/i);
    fireEvent.change(statusSelect, { target: { value: 'Ready for Pickup' } });
    fireEvent.click(screen.getByRole('button', { name: /Update status/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/transactions/tx1/status', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'Ready for Pickup' })
      }));
    });

    expect(await screen.findByText(/Status updated to Ready for Pickup/i)).toBeInTheDocument();
  });

  it('mounts the invoice drawer at body level so it stays viewport-fixed', () => {
    const { container } = render(
      <div className="translate-y-8">
        <Analytics parts={[]} transactions={[{ ...mockTransactions[0], status: 'Completed' }]} />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /View Invoice Details/i }));

    const dialog = screen.getByRole('dialog', { name: /Invoice INV-1 details/i });
    expect(dialog.parentElement).toBe(document.body);
    expect(container).not.toContainElement(dialog);
    expect(dialog).toHaveClass('fixed');
    expect(dialog).toHaveClass('inset-0');
    expect(dialog).toHaveClass('z-[320]');
    expect(document.body.style.overflow).toBe('hidden');
  });
});

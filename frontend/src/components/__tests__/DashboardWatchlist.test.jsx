import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/apiClient', () => ({
  apiGet: vi.fn().mockResolvedValue({ ok: true, data: [] })
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    channel: () => ({
      on: () => ({
        subscribe: () => ({})
      })
    }),
    removeChannel: vi.fn()
  }
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`,
    formatCompactCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`,
    displayCurrency: 'PHP',
    formatBaseCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`,
    formatCompactBaseCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`
  })
}));

vi.mock('../ui/ToggleChip', () => ({
  default: ({ active, onClick, children }) => (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}));

vi.mock('../../utils/lowStockReportPdf', () => ({
  buildLowStockReportPdf: vi.fn()
}));

const Dashboard = (await import('../Dashboard')).default;

const sixLowStockParts = [
  { id: 'p1', name: 'Part 1', sku: 'SKU-1', price: 100, stock: 0, minStock: 5, category: 'Engine' },
  { id: 'p2', name: 'Part 2', sku: 'SKU-2', price: 100, stock: 1, minStock: 5, category: 'Engine' },
  { id: 'p3', name: 'Part 3', sku: 'SKU-3', price: 100, stock: 2, minStock: 5, category: 'Brakes' },
  { id: 'p4', name: 'Part 4', sku: 'SKU-4', price: 100, stock: 3, minStock: 5, category: 'Brakes' },
  { id: 'p5', name: 'Part 5', sku: 'SKU-5', price: 100, stock: 4, minStock: 5, category: 'Engine' },
  { id: 'p6', name: 'Part 6', sku: 'SKU-6', price: 100, stock: 2, minStock: 6, category: 'Engine' }
];

describe('Dashboard watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first low-stock page with pagination controls', () => {
    render(
      <Dashboard
        parts={sixLowStockParts}
        transactions={[]}
        logs={[]}
        setPage={vi.fn()}
        setSelectedCategory={vi.fn()}
      />
    );

    expect(screen.getByText(/low-stock watchlist/i)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('Showing 1 to 5 of 6 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
  });
});

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasingModule from '../PurchasingModule';
import { fetchPurchaseOrders, fetchSuppliers } from '../../authStore';

vi.mock('../../authStore', () => ({
  fetchSuppliers: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  archiveSupplier: vi.fn(),
  restoreSupplier: vi.fn(),
  fetchPurchaseOrders: vi.fn(),
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrderStatus: vi.fn(),
  updatePoBillingStatus: vi.fn(),
  togglePartPublished: vi.fn(),
  updatePoPayment: vi.fn(),
  updatePoItemPrices: vi.fn(),
  updatePurchaseOrderDetails: vi.fn(),
  fetchParts: vi.fn().mockResolvedValue([]),
  fetchCategoriesList: vi.fn().mockResolvedValue([]),
  fetchNextSku: vi.fn().mockResolvedValue({ ok: false })
}));

// Mirrors SettingsContext: a part's markupOverride wins over the 20% global rate.
const GLOBAL_MARKUP = 20;
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: GLOBAL_MARKUP },
    formatCurrency: (value, part) => {
      const override = part?.markupOverride;
      const pct = override !== undefined && override !== null ? override : GLOBAL_MARKUP;
      return `₱${(Number(value || 0) * (1 + pct / 100)).toFixed(2)}`;
    },
    formatBaseCurrency: (value) => `₱${Number(value || 0).toFixed(2)}`
  })
}));

vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'admin@example.com' } } }) } }
}));

const parts = [
  { id: 'p1', sku: 'BRK-001', name: 'Brake Pad', category: 'Brakes', oem: '', price: 100, markupOverride: 50, stock: 6, reservedStock: 4, minStock: 3, archived: false, published: true },
  { id: 'p2', sku: 'FLT-002', name: 'Oil Filter', category: 'Filters', oem: '', price: 450, stock: 10, reservedStock: 0, minStock: 2, archived: false, published: true },
  { id: 'p3', sku: 'BLT-003', name: 'Fan Belt', category: 'Belts', oem: '', price: 200, stock: 0, reservedStock: 0, minStock: 0, archived: false, published: true }
];

const sales = [
  { id: 't1', transactionDate: '2026-10-01', invoiceNumber: 'INV-1', customerName: 'Juan', items: [{ partId: 'p1', name: 'Brake Pad', quantity: 3, price: 150 }] }
];

const renderProducts = async (props = {}) => {
  const utils = render(
    <PurchasingModule parts={parts} categories={['All', 'Brakes', 'Filters', 'Belts']} transactions={sales} onAddLog={vi.fn()} showToast={vi.fn()} {...props} />
  );
  fireEvent.click(await screen.findByRole('button', { name: /^Products$/i }));
  return utils;
};

const openPart = (name) => {
  fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
  return screen.getByRole('dialog', { name });
};

describe('Purchasing product numbers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('shows skeleton tiles while sales are loading, then the real numbers', async () => {
    const { rerender } = await renderProducts({ transactions: [], transactionsLoading: true });
    const dialog = openPart('Brake Pad');

    const sold = within(dialog).getByRole('group', { name: 'Units Sold' });
    const revenue = within(dialog).getByRole('group', { name: 'Revenue' });
    expect(sold).toHaveAttribute('aria-busy', 'true');
    expect(revenue).toHaveAttribute('aria-busy', 'true');
    expect(sold).not.toHaveTextContent('0');
    expect(revenue).not.toHaveTextContent('₱');

    rerender(
      <PurchasingModule parts={parts} categories={['All', 'Brakes', 'Filters', 'Belts']} transactions={sales} transactionsLoading={false} onAddLog={vi.fn()} showToast={vi.fn()} />
    );
    const soldAfter = within(screen.getByRole('dialog')).getByRole('group', { name: 'Units Sold' });
    expect(soldAfter).toHaveAttribute('aria-busy', 'false');
    expect(soldAfter).toHaveTextContent('3');
    // Sale prices are already marked up; revenue must not be marked up again.
    expect(within(screen.getByRole('dialog')).getByRole('group', { name: 'Revenue' })).toHaveTextContent('₱450.00');
  });

  it('shows 0 once loaded when a part genuinely has no sales', async () => {
    await renderProducts({ transactions: [], transactionsLoading: false });
    const dialog = openPart('Oil Filter');
    const sold = within(dialog).getByRole('group', { name: 'Units Sold' });
    expect(sold).toHaveAttribute('aria-busy', 'false');
    expect(sold).toHaveTextContent('0');
  });

  it('replaces In Stock and Reserved with one Available tile flagged against min stock', async () => {
    await renderProducts();
    const dialog = openPart('Brake Pad');
    expect(within(dialog).queryByRole('group', { name: 'In Stock' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('group', { name: 'Reserved' })).not.toBeInTheDocument();

    const available = within(dialog).getByRole('group', { name: 'Available' });
    expect(available).toHaveTextContent('2');
    expect(available).toHaveTextContent('6 in stock · 4 reserved');
    expect(available).toHaveTextContent('min 3');
    expect(available).toHaveAttribute('data-low-stock', 'true');
    expect(within(dialog).getAllByRole('group').map(g => g.getAttribute('aria-label')))
      .toEqual(['Units Sold', 'Revenue', 'Available', 'On Order']);
  });

  it('the Low Stock filter and card indicators use available stock', async () => {
    await renderProducts();
    // Brake Pad: 6 on hand but 4 reserved -> 2 available <= min 3 -> low.
    expect(screen.getByRole('button', { name: 'Brake Pad' })).toHaveTextContent('2 / 3 min');
    expect(within(screen.getByRole('button', { name: 'Brake Pad' })).getByTitle('Low Stock')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Low Stock' }));
    expect(screen.getByRole('button', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oil Filter' })).not.toBeInTheDocument();
  });

  it('list and grid show the same selling price for a part with a markup override', async () => {
    await renderProducts();
    expect(within(screen.getByRole('button', { name: 'Brake Pad' })).getByText('₱150.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    const row = screen.getByText('Brake Pad').closest('tr');
    expect(within(row).getByText('₱150.00')).toBeInTheDocument();
    expect(within(row).queryByText('₱120.00')).not.toBeInTheDocument();
    expect(within(row).getByText('2')).toHaveClass('text-alarm-text');
  });

  it('labels the base price as Cost and previews the selling price live', async () => {
    await renderProducts();
    const dialog = openPart('Brake Pad');
    expect(within(dialog).getByLabelText('Cost (₱) *')).toHaveValue(100);
    expect(within(dialog).getByText('Sells at ₱150.00')).toBeInTheDocument();

    const markup = within(dialog).getByLabelText('Markup Override % (optional)');
    expect(markup).toHaveAttribute('placeholder', `Global rate (${GLOBAL_MARKUP}%)`);
    fireEvent.change(markup, { target: { value: '10' } });
    expect(within(dialog).getByText('Sells at ₱110.00')).toBeInTheDocument();
    fireEvent.change(markup, { target: { value: '' } });
    expect(within(dialog).getByText('Sells at ₱120.00')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Cost (₱) *'), { target: { value: '200' } });
    expect(within(dialog).getByText('Sells at ₱240.00')).toBeInTheDocument();
  });

  it('shows a stock of 0 as "0", not blank', async () => {
    await renderProducts();
    const dialog = openPart('Fan Belt');
    expect(within(dialog).getByLabelText('Current Stock *')).toHaveValue(0);
    expect(within(dialog).getByLabelText('Min Safety Stock')).toHaveValue(0);
  });
});

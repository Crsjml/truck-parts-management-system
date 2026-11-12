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

const renderProducts = async (props = {}) => {
  const utils = render(
    <PurchasingModule parts={parts} categories={['All', 'Brakes', 'Filters', 'Belts']} transactions={sales} onAddLog={vi.fn()} showToast={vi.fn()} {...props} />
  );
  fireEvent.click(await screen.findByRole('button', { name: /^Products$/i }));
  return utils;
};

const parts = [
  { id: 'p1', sku: 'BRK-001', name: 'Brake Pad', category: 'Brakes', oem: 'OEM-LONG-MPN-123456', price: 100, stock: 6, reservedStock: 0, minStock: 3, archived: false, published: true },
  { id: 'p2', sku: 'FLT-002', name: 'Oil Filter', category: 'Filters', oem: '', price: 450, stock: 10, reservedStock: 0, minStock: 2, archived: false, published: false }
];
const sales = [];

const toggleFilter = (label) => {
  fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: label }));
};

describe('Purchasing products: search, status filter and empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('labels the products search box for assistive tech', async () => {
    await renderProducts();
    expect(screen.getByRole('textbox', { name: 'Search products' })).toBeInTheDocument();
  });

  it('Published or Unpublished alone narrows the list', async () => {
    await renderProducts();
    toggleFilter('Published');
    expect(screen.getByRole('button', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oil Filter' })).not.toBeInTheDocument();
  });

  it('Published and Unpublished together mean either status, not zero results', async () => {
    await renderProducts();
    toggleFilter('Published');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unpublished' }));
    expect(screen.getByRole('button', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oil Filter' })).toBeInTheDocument();
    expect(screen.queryByText(/No products match/)).not.toBeInTheDocument();
  });

  it('says when search and filters hide everything, and Clear filters brings products back', async () => {
    await renderProducts();
    toggleFilter('Low Stock');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'zzz-no-match' } });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No products match your search or filters.');
    fireEvent.click(within(status).getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByRole('button', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oil Filter' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('');
    expect(screen.getByRole('button', { name: /^Filters$/ })).toBeInTheDocument();
  });

  it('keeps the full OEM value available when the card truncates it', async () => {
    await renderProducts();
    expect(screen.getByTitle('OEM / MPN: OEM-LONG-MPN-123456')).toBeInTheDocument();
  });

  it('grid cards stay flat: no shadow, lift or pulsing glow', async () => {
    await renderProducts();
    const card = screen.getByRole('button', { name: 'Brake Pad' });
    expect(card.className).not.toMatch(/shadow|translate-y/);
    expect(card.innerHTML).not.toMatch(/animate-pulse|shadow-\[/);
  });
});

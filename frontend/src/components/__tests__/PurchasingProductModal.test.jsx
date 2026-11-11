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
  fetchParts: vi.fn().mockResolvedValue([])
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatCurrency: (value) => `₱${Number(value || 0).toFixed(2)}` })
}));

vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'admin@example.com' } } }) } }
}));

const parts = [
  { id: 'p1', sku: 'BRK-001', name: 'Brake Pad', category: 'Brakes', oem: '', price: 1200, stock: 10, minStock: 2, archived: false, published: true },
  { id: 'p2', sku: 'FLT-002', name: 'Oil Filter', category: 'Filters', oem: '', price: 450, stock: 10, minStock: 2, archived: false, published: false }
];

const renderProducts = async () => {
  render(
    <PurchasingModule parts={parts} categories={['All', 'Brakes', 'Filters']} transactions={[]} onAddLog={vi.fn()} showToast={vi.fn()} />
  );
  fireEvent.click(await screen.findByRole('button', { name: /^Products$/i }));
};

const openBrakePad = () => {
  const card = screen.getByRole('button', { name: 'Brake Pad' });
  card.focus();
  fireEvent.keyDown(card, { key: 'Enter' });
  return card;
};

describe('Purchasing product modal keyboard safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('opens a product from its grid card with Enter and Space', async () => {
    await renderProducts();
    openBrakePad();
    expect(screen.getByRole('dialog', { name: 'Brake Pad' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Oil Filter' }), { key: ' ' });
    expect(screen.getByRole('dialog', { name: 'Oil Filter' })).toBeInTheDocument();
  });

  it('closes a clean modal on Escape and returns focus to the card', async () => {
    await renderProducts();
    const card = openBrakePad();
    const dialog = screen.getByRole('dialog', { name: 'Brake Pad' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(card);
  });

  it('asks before discarding unsaved changes, and Keep editing keeps the draft', async () => {
    await renderProducts();
    openBrakePad();
    fireEvent.change(screen.getByLabelText('Product Name *'), { target: { value: 'Brake Pad XL' } });
    fireEvent.keyDown(document, { key: 'Escape' });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name *')).toHaveValue('Brake Pad XL');
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('Discard closes a dirty modal; the Close button and backdrop also guard', async () => {
    await renderProducts();
    openBrakePad();
    fireEvent.change(screen.getByLabelText('Product Name *'), { target: { value: 'Changed' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close product' }));
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a product from a list row with Enter', async () => {
    await renderProducts();
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    const row = screen.getByText('Oil Filter').closest('tr');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Oil Filter' })).toBeInTheDocument();
  });

  it('labels icon-only controls', async () => {
    await renderProducts();
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'brake' } });
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasingModule from '../PurchasingModule';
import SectionErrorBoundary from '../ui/SectionErrorBoundary';
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
  { id: 'p1', sku: 'BRK-001', name: 'Brake (Rear) Pad', category: 'Brakes', oem: '8-97123-456', price: 1200, stock: 10, minStock: 2, archived: false },
  { id: 'p2', sku: 'FLT-002', name: 'Oil Filter', category: 'Filters', oem: 'ME-215002', price: 450, stock: 10, minStock: 2, archived: false }
];

const renderProducts = async () => {
  render(
    <PurchasingModule parts={parts} categories={[]} transactions={[]} onAddLog={vi.fn()} showToast={vi.fn()} />
  );
  fireEvent.click(await screen.findByRole('button', { name: /^Products$/i }));
  return screen.getByPlaceholderText('Search...');
};

describe('Purchasing product search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('does not throw when the search contains regex characters', async () => {
    const input = await renderProducts();
    for (const term of ['(', '[', '+', '*', '?', '\\']) {
      expect(() => fireEvent.change(input, { target: { value: term } })).not.toThrow();
    }
  });

  it('matches brackets literally, case-insensitively', async () => {
    const input = await renderProducts();
    fireEvent.change(input, { target: { value: '  brake (rear ' } });
    expect(screen.getAllByText('Brake (Rear) Pad').length).toBeGreaterThan(0);
    expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument();
  });

  it('matches OEM numbers', async () => {
    const input = await renderProducts();
    fireEvent.change(input, { target: { value: 'me-215' } });
    expect(screen.getAllByText('Oil Filter').length).toBeGreaterThan(0);
    expect(screen.queryByText('Brake (Rear) Pad')).not.toBeInTheDocument();
  });
});

describe('SectionErrorBoundary', () => {
  it('shows a plain message and a Reload button instead of a blank screen', () => {
    const Boom = () => { throw new Error('kaboom'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<SectionErrorBoundary><Boom /></SectionErrorBoundary>);
    spy.mockRestore();
    expect(screen.getByText('This section hit a problem. Reload to try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload/i })).toBeInTheDocument();
  });

  it('renders children when nothing throws', () => {
    render(<SectionErrorBoundary><p>fine</p></SectionErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});

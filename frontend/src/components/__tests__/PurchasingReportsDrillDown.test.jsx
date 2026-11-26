import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  fetchNextSku: vi.fn().mockResolvedValue({ ok: false }),
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatCurrency: (v) => `₱${Number(v || 0).toLocaleString('en-PH')}` }),
}));

vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'admin@example.com' } } }) } },
}));

const supplier = { id: 'supplier-1', name: 'Isuzu Supplier', archived: false };
const problemPo = {
  id: 'po-9', poNumber: 'PO-PROBLEM-1', status: 'Problem Reported', billingStatus: 'Waiting Bills',
  totalAmount: 50000, createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-06T00:00:00.000Z',
  expectedDeliveryDate: '2026-09-15T00:00:00.000Z', createdBy: 'Admin', supplier,
  items: [{ id: 'i1', partId: 'part-1', name: 'Air Compressor', quantity: 2, unitPrice: 25000, subtotal: 50000 }],
};

const renderPurchasing = () => render(
  <PurchasingModule parts={[]} categories={[]} transactions={[]} onAddLog={vi.fn()} showToast={vi.fn()} />,
);

describe('Reports drill-down in the Purchasing shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([supplier]);
    fetchPurchaseOrders.mockResolvedValue([problemPo]);
  });

  it('opens the filtered order list, says it came from Reports, and returns on request', async () => {
    renderPurchasing();
    fireEvent.click(await screen.findByRole('button', { name: /^Reports$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /problem orders: 1/i }));

    const banner = await screen.findByText('Showing problem orders, from Reports.');
    expect(banner).toBeInTheDocument();
    // Focus moves to the banner so keyboard and screen-reader users land on the context.
    expect(banner.closest('[role="status"]')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /back to reports/i }));
    const title = await screen.findByRole('heading', { name: 'Purchasing Reports' });
    expect(title).toBeInTheDocument();
    expect(screen.queryByText('Showing problem orders, from Reports.')).not.toBeInTheDocument();
    // Focus lands on the report title, not <body>, after the banner unmounts.
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('drops the banner when the user switches section by hand', async () => {
    renderPurchasing();
    fireEvent.click(await screen.findByRole('button', { name: /^Reports$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /problem orders: 1/i }));
    expect(await screen.findByText(/from Reports/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Products$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Orders$/i }));
    expect(screen.queryByText('Showing problem orders, from Reports.')).not.toBeInTheDocument();
  });

  it('clears the drill-down filter when the user leaves via a tab', async () => {
    renderPurchasing();
    fireEvent.click(await screen.findByRole('button', { name: /^Reports$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /problem orders: 1/i }));
    await screen.findByText(/from Reports/i);

    fireEvent.click(screen.getByRole('button', { name: /^Products$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Orders$/i }));
    // Orders shows no leftover Problems filter once the user navigated away by hand.
    const problemsChip = await screen.findByRole('button', { name: /^Problems/i });
    expect(problemsChip).not.toHaveAttribute('aria-pressed', 'true');
  });
});

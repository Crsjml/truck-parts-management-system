import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasingModule from '../PurchasingModule';
import {
  fetchPurchaseOrders,
  fetchSuppliers,
  updatePoPayment,
  updatePoItemPrices
} from '../../authStore';

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
  updatePoItemPrices: vi.fn()
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatCurrency: (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  })
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'admin@example.com' } } })
    }
  }
}));

const supplier = {
  id: 'supplier-1',
  name: 'Isuzu Supplier',
  archived: false
};

const parts = [
  {
    id: 'part-1',
    sku: 'AC-001',
    name: 'Air Compressor',
    price: 25000,
    stock: 4,
    archived: false
  }
];

const confirmedPo = {
  id: 'po-1',
  poNumber: 'PO-20260805-0001',
  status: 'Confirmed',
  billingStatus: 'Waiting Bills',
  totalAmount: 75000,
  expectedDeliveryDate: '2026-09-15T00:00:00.000Z',
  paymentDueDate: '2026-09-20T00:00:00.000Z',
  confirmationDate: '2026-08-05T00:00:00.000Z',
  createdAt: '2026-08-05T00:00:00.000Z',
  updatedAt: '2026-08-05T00:00:00.000Z',
  createdBy: 'Admin',
  sourceRfq: '',
  notes: '',
  supplier,
  items: [
    {
      id: 'item-1',
      partId: 'part-1',
      sku: 'AC-001',
      name: 'Air Compressor',
      quantity: 3,
      unitPrice: 25000,
      subtotal: 75000
    }
  ]
};

const renderPurchasing = () => render(
  <PurchasingModule
    parts={parts}
    categories={[]}
    transactions={[]}
    onAddLog={vi.fn()}
    showToast={vi.fn()}
  />
);

describe('PurchasingModule RFQ and PO behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([supplier]);
    fetchPurchaseOrders.mockResolvedValue([confirmedPo]);
    updatePoItemPrices.mockResolvedValue({
      ok: true,
      purchaseOrder: {
        ...confirmedPo,
        totalAmount: 90000,
        items: [{ ...confirmedPo.items[0], unitPrice: 30000, subtotal: 90000 }]
      }
    });
    updatePoPayment.mockResolvedValue({
      ok: true,
      purchaseOrder: {
        ...confirmedPo,
        paidAt: '2026-08-05T00:00:00.000Z',
        paymentStatus: 'Paid'
      }
    });
  });

  it('updates confirmed PO line subtotal and visible total from edited quoted price before saving', async () => {
    renderPurchasing();

    fireEvent.click(await screen.findByRole('button', { name: /^Purchase Orders$/i }));
    fireEvent.click(await screen.findByText('PO-20260805-0001'));

    const modal = screen.getByText('Confirmed order awaiting bills and receipt checks.').closest('.fixed');
    const modalQueries = within(modal);
    fireEvent.change(modalQueries.getByDisplayValue('25000'), { target: { value: '30000' } });

    expect(modalQueries.getAllByText('₱90,000.00')).toHaveLength(2);
  });

  it('shows a separate payment deadline date input when creating an RFQ draft', async () => {
    renderPurchasing();

    await waitFor(() => {
      expect(fetchPurchaseOrders).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole('button', { name: /New PO/i }));

    const deadlineInput = screen.getByLabelText(/Payment Deadline/i);
    expect(deadlineInput).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/Expected Arrival/i)).not.toBe(deadlineInput);
  });

  it('sends saved quoted prices through the existing explicit save action', async () => {
    renderPurchasing();

    fireEvent.click(await screen.findByRole('button', { name: /^Purchase Orders$/i }));
    fireEvent.click(await screen.findByText('PO-20260805-0001'));

    const modal = screen.getByText('Confirmed order awaiting bills and receipt checks.').closest('.fixed');
    const modalQueries = within(modal);
    fireEvent.change(modalQueries.getByDisplayValue('25000'), { target: { value: '30000' } });
    fireEvent.click(modalQueries.getByRole('button', { name: /Save Quoted Prices/i }));

    await waitFor(() => {
      expect(updatePoItemPrices).toHaveBeenCalledWith('po-1', [
        { id: 'item-1', unitPrice: 30000 }
      ]);
    });
  });

  it('lets admins mark a payable as paid from the Payables table', async () => {
    renderPurchasing();

    fireEvent.click(await screen.findByText('Payables'));

    const paidToggle = await screen.findByRole('switch', { name: /Mark PO-20260805-0001 as paid/i });
    expect(paidToggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(paidToggle);

    await waitFor(() => {
      expect(updatePoPayment).toHaveBeenCalledWith('po-1', expect.objectContaining({
        paidAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      }));
    });

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /Mark PO-20260805-0001 as unpaid/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
      expect(screen.getByText('8/5/2026')).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasingModule from '../PurchasingModule';
import { fetchPurchaseOrders, fetchSuppliers, togglePartPublished } from '../../authStore';


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

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({ formatCurrency: (value) => `₱${Number(value || 0).toFixed(2)}` })
}));

vi.mock('../../supabaseClient', () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'admin@example.com' } } }) } }
}));

const parts = [
  {
    id: 'p1', sku: 'BRK-001', name: 'Brake Pad', category: 'Brakes', oem: '', oemNumbers: ['S4510-E0050'],
    price: 1200, stock: 10, minStock: 2, archived: false, published: true,
    description: 'Front axle pad set',
    compatibility: 'Hino 500 Series 2010-2018, Isuzu ELF NPR',
    compatibleWith: [
      { brand: 'Hino', series: '500 Series', year: '2010-2018' },
      { brand: 'Isuzu', series: 'ELF NPR', year: '' }
    ]
  },
  { id: 'p2', sku: 'FLT-002', name: 'Oil Filter', category: 'Filters', oem: '', price: 450, stock: 10, minStock: 2, archived: false, published: false, compatibleWith: [] }
];

const renderProducts = async (onEditPart = vi.fn().mockResolvedValue({ ok: true })) => {
  render(
    <PurchasingModule parts={parts} categories={['All', 'Brakes', 'Filters']} transactions={[]} onAddLog={vi.fn()} showToast={vi.fn()} onEditPart={onEditPart} />
  );
  fireEvent.click(await screen.findByRole('button', { name: /^Products$/i }));
  return onEditPart;
};

const openBrakePad = () => {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Brake Pad' }), { key: 'Enter' });
  return screen.getByRole('dialog', { name: 'Brake Pad' });
};

describe('Purchasing product publish switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('has one publish control: no header Publish/Unpublish button', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    expect(within(dialog).queryByRole('button', { name: /^(un)?publish$/i })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('switch')).toHaveLength(1);
  });

  it('is an accessible switch with a name and aria-checked state', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    const sw = within(dialog).getByRole('switch', { name: /published/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('toggling keeps the modal open, keeps other edits, and calls no API', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Edited copy' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: /published/i }));
    expect(screen.getByRole('dialog', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Edited copy');
    expect(togglePartPublished).not.toHaveBeenCalled();
  });

  it('toggling marks the form dirty so closing asks before discarding', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    fireEvent.click(within(dialog).getByRole('switch', { name: /published/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Brake Pad' })).toBeInTheDocument();
  });

  it('Save sends the new published state with the other edits', async () => {
    const onEditPart = await renderProducts();
    const dialog = openBrakePad();
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Edited copy' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: /published/i }));
    fireEvent.click(within(dialog).getByRole('button', { name: /^save/i }));
    await waitFor(() => expect(onEditPart).toHaveBeenCalledTimes(1));
    const [id, payload] = onEditPart.mock.calls[0];
    expect(id).toBe('p1');
    expect(payload.published).toBe(false);
    expect(payload.description).toBe('Edited copy');
    expect(togglePartPublished).not.toHaveBeenCalled();
  });

  it('header status shows the pending state and marks it unsaved', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    const status = within(dialog).getByTestId('product-publish-status');
    expect(status).toHaveTextContent(/^Published$/);
    fireEvent.click(within(dialog).getByRole('switch', { name: /published/i }));
    expect(status).toHaveTextContent(/Unpublished.*unsaved/i);
  });
});

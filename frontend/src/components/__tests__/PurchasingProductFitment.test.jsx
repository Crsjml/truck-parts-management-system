import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Purchasing product fitment and description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it('exposes the product tabs as a tablist with a Fitment tab', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    const tablist = within(dialog).getByRole('tablist', { name: /product details/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['General Information', 'Fitment', 'Sales Analytics', 'Purchase History']);
    const general = within(tablist).getByRole('tab', { name: 'General Information' });
    expect(general).toHaveAttribute('aria-selected', 'true');
    const panel = within(dialog).getByRole('tabpanel');
    expect(general).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', general.id);

    const fitment = within(tablist).getByRole('tab', { name: 'Fitment' });
    fireEvent.click(fitment);
    expect(fitment).toHaveAttribute('aria-selected', 'true');
    expect(general).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the part\'s existing fitment rows on the Fitment tab', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Fitment' }));
    const brands = within(dialog).getAllByLabelText('Brand').map(i => i.value);
    const series = within(dialog).getAllByLabelText('Series / Model').map(i => i.value);
    expect(brands).toEqual(['Hino', 'Isuzu']);
    expect(series).toEqual(['500 Series', 'ELF NPR']);
    expect(within(dialog).getAllByLabelText('Years')[0]).toHaveValue('2010-2018');
  });

  it('editing fitment trips the discard guard', async () => {
    await renderProducts();
    const dialog = openBrakePad();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Fitment' }));
    fireEvent.change(within(dialog).getAllByLabelText('Series / Model')[1], { target: { value: 'ELF NKR' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
  });

  it('saves edited fitment as rows plus a matching summary', async () => {
    const onEditPart = await renderProducts();
    const dialog = openBrakePad();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Fitment' }));
    fireEvent.change(within(dialog).getAllByLabelText('Series / Model')[1], { target: { value: 'ELF NKR' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^save/i }));
    await waitFor(() => expect(onEditPart).toHaveBeenCalledTimes(1));
    const [id, payload] = onEditPart.mock.calls[0];
    expect(id).toBe('p1');
    expect(payload.compatibleWith).toEqual([
      { brand: 'Hino', series: '500 Series', year: '2010-2018' },
      { brand: 'Isuzu', series: 'ELF NKR', year: '' }
    ]);
    expect(payload.compatibility).toBe('Hino 500 Series 2010-2018, Isuzu ELF NKR');
  });

  it('leaves the stored fitment untouched when it was not edited', async () => {
    const onEditPart = await renderProducts();
    const dialog = openBrakePad();
    fireEvent.change(within(dialog).getByLabelText('Product Name *'), { target: { value: 'Brake Pad XL' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^save/i }));
    await waitFor(() => expect(onEditPart).toHaveBeenCalledTimes(1));
    const payload = onEditPart.mock.calls[0][1];
    expect(payload.compatibility).toBe(parts[0].compatibility);
    expect(payload.compatibleWith).toEqual(parts[0].compatibleWith);
  });

  it('shows the description in General, editable, dirty-guarded and saved', async () => {
    const onEditPart = await renderProducts();
    const dialog = openBrakePad();
    const description = within(dialog).getByLabelText('Description');
    expect(description.tagName).toBe('TEXTAREA');
    expect(description).toHaveValue('Front axle pad set');
    fireEvent.change(description, { target: { value: 'Front axle pad set, semi-metallic' } });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    fireEvent.click(within(dialog).getByRole('button', { name: /^save/i }));
    await waitFor(() => expect(onEditPart).toHaveBeenCalledTimes(1));
    expect(onEditPart.mock.calls[0][1].description).toBe('Front axle pad set, semi-metallic');
  });
});

describe('Purchasing product search by fitment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSuppliers.mockResolvedValue([]);
    fetchPurchaseOrders.mockResolvedValue([]);
  });

  it.each([['hino 500'], ['HINO 500 SERIES'], ['elf npr'], ['s4510-e0050']])('"%s" finds the part whose fitment or alternate OEM matches', async (term) => {
    await renderProducts();
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: term } });
    expect(screen.getByRole('button', { name: 'Brake Pad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oil Filter' })).not.toBeInTheDocument();
  });
});

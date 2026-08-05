import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransactionPOS from '../TransactionPOS';
import { SettingsProvider } from '../../context/SettingsContext';
import * as authStore from '../../authStore';

vi.mock('../../authStore', () => ({
  lookupCustomers: vi.fn(),
  verifyOverridePin: vi.fn(),
  fetchSettings: vi.fn().mockResolvedValue({})
}));

const renderPos = (props = {}) =>
  render(
    <SettingsProvider>
      <TransactionPOS
        parts={props.parts || mockParts}
        onCheckout={props.onCheckout || vi.fn()}
        {...props}
      />
    </SettingsProvider>
  );

const mockParts = [
  { id: 'p1', name: 'Brake Pad', sku: 'BP-01', price: 50, stock: 4, reservedStock: 0 },
  { id: 'p2', name: 'Oil Filter', sku: 'OF-02', price: 20, stock: 10, reservedStock: 0 },
  { id: 'p3', name: 'Spark Plug', sku: 'SP-03', price: 15, stock: 2, reservedStock: 0 }
];

describe('TransactionPOS Integration Tests', () => {
  let onCheckoutMock;

  beforeEach(() => {
    vi.clearAllMocks();
    onCheckoutMock = vi.fn().mockResolvedValue(true);
    authStore.lookupCustomers.mockResolvedValue({ ok: true, results: [] });
    authStore.verifyOverridePin.mockResolvedValue({ valid: true });
    window.alert = vi.fn();
  });

  it('Step 1: Renders parts list with wholesale price scaled to retail space', () => {
    renderPos({ onCheckout: onCheckoutMock });
    expect(screen.getByText('Brake Pad')).toBeInTheDocument();
    expect(screen.getByText('₱50.00')).toBeInTheDocument();
  });

  it('Step 2: Cart item calculation includes PH 12% VAT extraction', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);

    expect(screen.getByTestId('pos-total')).toHaveTextContent('₱50.00');
    expect(screen.getByTestId('pos-vat-note')).toHaveTextContent('₱44.64');
    expect(screen.getByTestId('pos-vat-note')).toHaveTextContent('₱5.36');
  });

  it('Step 3: Completes immediate walk-in cash sale', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);

    fireEvent.keyDown(document, { key: 'F4' });
    
    // Fill customer details
    const nameInput = screen.getByLabelText(/Customer name \*/i);
    const contactInput = screen.getByLabelText(/Contact number \*/i);
    const emailInput = screen.getByLabelText(/Email \*/i);
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: '555-1234' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    const amountInput = screen.getByLabelText(/Amount Tendered/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    const completeBtn = screen.getByRole('button', { name: /Complete sale/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(onCheckoutMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        amountTendered: 100,
        changeGiven: 50,
        subtotal: 44.64,
        taxAmount: 5.36,
        total: 50,
        customerName: 'John Doe',
        customerContact: '555-1234',
        customerEmail: 'john@example.com'
      }));
    });

    const receipt = await screen.findByTestId('pos-sale-complete');
    expect(receipt).toHaveTextContent(/sale complete/i);
    expect(receipt).toHaveTextContent('Change');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reuses the same invoice number when a POS sale is retried after failure', async () => {
    onCheckoutMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderPos({ onCheckout: onCheckoutMock });

    fireEvent.click(screen.getByRole('button', { name: /Add Brake Pad/i }));
    fireEvent.keyDown(document, { key: 'F4' });

    fireEvent.change(screen.getByLabelText(/Customer name \*/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Contact number \*/i), { target: { value: '555-1234' } });
    fireEvent.change(screen.getByLabelText(/Email \*/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Amount Tendered/i), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: /Complete sale/i }));
    await waitFor(() => {
      expect(onCheckoutMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /Complete sale/i }));

    await waitFor(() => {
      expect(onCheckoutMock).toHaveBeenCalledTimes(2);
    });
    expect(onCheckoutMock.mock.calls[1][0].invoiceNumber).toBe(onCheckoutMock.mock.calls[0][0].invoiceNumber);
  });

  it('Step 4: Repeat buyer', async () => {
    authStore.lookupCustomers.mockResolvedValue({
      ok: true,
      results: [{ customerName: 'Jane Smith', customerContact: '555-9876', customerEmail: 'jane@example.com', orderCount: 2, lastOrderDate: '2026-07-01T00:00:00.000Z' }]
    });

    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    const lookupInput = screen.getByLabelText(/Find returning customer/i);
    fireEvent.change(lookupInput, { target: { value: 'Jane' } });

    const useCustomerBtn = await screen.findByRole('button', { name: /Use Jane Smith/i });
    fireEvent.click(useCustomerBtn);

    expect(screen.getByLabelText(/Customer name \*/i)).toHaveValue('Jane Smith');
    expect(screen.getByLabelText(/Contact number \*/i)).toHaveValue('555-9876');
    expect(screen.getByLabelText(/Email \*/i)).toHaveValue('jane@example.com');
  });

  it('Step 5: Cheque payment', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    fireEvent.change(screen.getByLabelText(/Customer name \*/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/Contact number \*/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Email \*/i), { target: { value: 'a@a.com' } });

    fireEvent.click(screen.getByRole('button', { name: /^Cheque$/i }));

    const completeBtn = screen.getByRole('button', { name: /Complete sale/i });
    expect(completeBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Cheque Number \*/i), { target: { value: 'CHQ123' } });
    fireEvent.change(screen.getByLabelText(/Bank Name \*/i), { target: { value: 'BDO' } });
    fireEvent.change(screen.getByLabelText(/Cheque Date \*/i), { target: { value: '2026-07-27' } });

    expect(completeBtn).toBeEnabled();
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(onCheckoutMock).toHaveBeenCalledWith(expect.objectContaining({
        paymentMethod: 'CHEQUE',
        chequeNumber: 'CHQ123',
        chequeBank: 'BDO',
        chequeDate: '2026-07-27'
      }));
    });
  });

  it('Step 6: Discount PIN gate', async () => {
    authStore.verifyOverridePin.mockImplementation(async (pin) => ({ valid: pin === '4821' }));

    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    fireEvent.change(screen.getByLabelText(/Customer name \*/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText(/Contact number \*/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Email \*/i), { target: { value: 'b@b.com' } });

    const pinInput = screen.getByLabelText(/Supervisor override PIN/i);
    fireEvent.change(pinInput, { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock/i }));

    expect(await screen.findByText(/Incorrect PIN/i)).toBeInTheDocument();

    fireEvent.change(pinInput, { target: { value: '4821' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock/i }));

    const discountInput = await screen.findByLabelText(/Discount amount/i);
    fireEvent.change(discountInput, { target: { value: '100' } });

    const exactBtn = screen.getByRole('button', { name: /Exact/i });
    fireEvent.click(exactBtn);
    fireEvent.click(screen.getByRole('button', { name: /Complete sale/i }));

    await waitFor(() => {
      expect(onCheckoutMock).toHaveBeenCalledWith(expect.objectContaining({
        discount: 50,
        total: 0
      }));
    });
  });

  it('Step 7: Partial stock', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Spark Plug/i });
    fireEvent.click(addBtn);

    const increaseBtn = screen.getByRole('button', { name: /Increase quantity of Spark Plug/i });
    fireEvent.click(increaseBtn);
    fireEvent.click(increaseBtn);
    
    expect(await screen.findByText(/Only 2 of Spark Plug in stock — selling 2/i)).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('Step 8: Keyboard shortcuts', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    fireEvent.keyDown(document, { key: 'F2' });
    expect(screen.getByLabelText(/Search parts/i)).toHaveFocus();

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);

    fireEvent.keyDown(document, { key: 'F4' });
    expect(screen.getByRole('heading', { name: /Checkout/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: /Checkout/i })).not.toBeInTheDocument();
  });

  it('Step 10: Accessibility pass', async () => {
    renderPos({ onCheckout: onCheckoutMock });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    expect(addBtn).toHaveAttribute('aria-label', 'Add Brake Pad');

    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    const pane = screen.getByRole('region', { name: /Checkout/i });
    expect(pane).toHaveAttribute('aria-labelledby', 'pos-checkout-heading');
  });

  it('renders fullscreen toggle button in shell header', () => {
    renderPos({ onCheckout: onCheckoutMock });
    const fsBtn = screen.getByRole('button', { name: /toggle fullscreen mode/i });
    expect(fsBtn).toBeInTheDocument();
  });
});

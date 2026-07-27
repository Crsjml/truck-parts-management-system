
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TransactionPOS from '../TransactionPOS';
import { SettingsContext } from '../../context/SettingsContext';
import * as authStore from '../../authStore';

vi.mock('../../authStore', () => ({
  lookupCustomers: vi.fn(),
  verifyOverridePin: vi.fn()
}));

vi.mock('../../utils/invoicePdf', () => ({
  buildInvoicePdf: vi.fn()
}));

vi.mock('../../context/SettingsContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSettings: () => {
      const ctx = React.useContext(actual.SettingsContext);
      if (ctx) return ctx;
      return {
        markupFactor: 1,
        formatBaseCurrency: (val) => `$${Number(val).toFixed(2)}`,
        formatCurrency: (val) => `$${Number(val).toFixed(2)}`,
        displayCurrency: 'USD'
      };
    }
  };
});

const mockParts = [
  { id: '1', name: 'Brake Pad', sku: 'BP-01', category: 'BRAKES', stock: 5, price: 50 },
  { id: '2', name: 'Oil Filter', sku: 'OF-01', category: 'FILTERS', stock: 1, reservedStock: 1, price: 15 }, // Out of stock
  { id: '3', name: 'Spark Plug', sku: 'SP-01', category: 'IGNITION', stock: 2, price: 10 } // Partial stock
];

describe('TransactionPOS', () => {
  let onCheckoutMock;

  const renderPos = ({ onCheckout = vi.fn(), parts = [] } = {}) =>
    render(
      <SettingsContext.Provider value={{
        markupFactor: 1.2,
        formatBaseCurrency: (n) => `PHP ${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        formatCurrency: (n) => `PHP ${(n * 1.2).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        displayCurrency: 'PHP'
      }}>
        <TransactionPOS parts={parts} onCheckout={onCheckout} />
      </SettingsContext.Provider>
    );

  beforeEach(() => {
    onCheckoutMock = vi.fn().mockResolvedValue(true);
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('charges the marked-up shelf price with VAT already inside it', async () => {
    // Base price 1000 with a 20% markup is a 1200 shelf price. VAT is inside
    // that 1200, so the customer pays 1200, not 1344.
    const onCheckout = vi.fn().mockResolvedValue(true);
    renderPos({ onCheckout, parts: [
      { id: 'p1', name: 'Brake Chamber', sku: 'BC-1', oem: '', category: 'Brakes',
        price: 1000, stock: 5, reservedStock: 0, compatibleWith: [] }
    ]});

    fireEvent.click(screen.getByRole('button', { name: /Add Brake Chamber/i }));

    const totals = screen.getByTestId('pos-total');
    expect(totals).toHaveTextContent('1,200.00');
    expect(totals).not.toHaveTextContent('1,344');
  });

  it('Step 3: First-time walk-in, cash, with change', async () => {
    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/Search parts by name, SKU or OEM/i);
    fireEvent.change(searchInput, { target: { value: 'Brake Pad' } });

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    expect(addBtn).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(addBtn);

    fireEvent.keyDown(document, { key: 'F4' });
    
    // Fill customer details
    const nameInput = screen.getByLabelText(/Customer name/i);
    const contactInput = screen.getByLabelText(/Contact number/i);
    const emailInput = screen.getByLabelText(/^Email$/i);
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(contactInput, { target: { value: '555-1234' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    const continueBtn = screen.getByRole('button', { name: /Continue to payment/i });
    fireEvent.click(continueBtn);

    const amountInput = screen.getByLabelText(/Amount tendered/i);
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

    expect(await screen.findByText(/Sale complete/i)).toBeInTheDocument();
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0);
  });

  it('Step 4: Repeat buyer', async () => {
    authStore.lookupCustomers.mockResolvedValue({
      ok: true,
      results: [{ customerName: 'Jane Smith', customerContact: '555-9876', customerEmail: 'jane@example.com', orderCount: 2, lastOrderDate: '2026-07-01T00:00:00.000Z' }]
    });

    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    const lookupInput = screen.getByLabelText(/Find returning customer/i);
    fireEvent.change(lookupInput, { target: { value: 'Jane' } });

    const useCustomerBtn = await screen.findByRole('button', { name: /Use Jane Smith/i });
    fireEvent.click(useCustomerBtn);

    expect(screen.getByLabelText(/^Customer name$/i)).toHaveValue('Jane Smith');
    expect(screen.getByLabelText(/^Contact number$/i)).toHaveValue('555-9876');
    expect(screen.getByLabelText(/^Email$/i)).toHaveValue('jane@example.com');
  });

  it('Step 5: Cheque payment', async () => {
    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    fireEvent.change(screen.getByLabelText(/^Customer name$/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/^Contact number$/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'a@a.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to payment/i }));

    fireEvent.click(screen.getByLabelText(/Cheque/i));

    const completeBtn = screen.getByRole('button', { name: /Complete sale/i });
    expect(completeBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Cheque number/i), { target: { value: 'CHQ123' } });
    fireEvent.change(screen.getByLabelText(/^Bank$/i), { target: { value: 'BDO' } });
    fireEvent.change(screen.getByLabelText(/Cheque date/i), { target: { value: '2026-07-27' } });

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

    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    fireEvent.change(screen.getByLabelText(/Customer name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText(/Contact number/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'b@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to payment/i }));

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
    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    const addBtn = screen.getByRole('button', { name: /Add Spark Plug/i });
    fireEvent.click(addBtn);

    const increaseBtn = screen.getByRole('button', { name: /Increase quantity of Spark Plug/i });
    fireEvent.click(increaseBtn);
    fireEvent.click(increaseBtn);
    
    expect(await screen.findByText(/Only 2 of Spark Plug in stock — selling 2/i)).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('Step 8: Keyboard shortcuts', async () => {
    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    fireEvent.keyDown(document, { key: 'F2' });
    expect(screen.getByLabelText(/Search parts/i)).toHaveFocus();

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    fireEvent.click(addBtn);

    fireEvent.keyDown(document, { key: 'F4' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(screen.getAllByText(/F2/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/F4/)[0]).toBeInTheDocument();
  });

  it('Step 10: Accessibility pass', async () => {
    render(<TransactionPOS parts={mockParts} onCheckout={onCheckoutMock} />);

    const addBtn = screen.getByRole('button', { name: /Add Brake Pad/i });
    expect(addBtn).toHaveAttribute('aria-label', 'Add Brake Pad');

    fireEvent.click(addBtn);
    fireEvent.keyDown(document, { key: 'F4' });

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'pos-checkout-heading');
  });
});

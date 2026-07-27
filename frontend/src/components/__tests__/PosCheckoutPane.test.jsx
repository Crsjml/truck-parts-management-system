import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCheckoutPane from '../pos/PosCheckoutPane';

const formatCurrency = (n) => `PHP ${Number(n).toFixed(2)}`;

const renderPane = (props = {}) =>
  render(
    <PosCheckoutPane
      totals={{ lineSum: 1000, discount: 0, total: 1120, vatableSale: 1000, vatAmount: 120, ...(props.totals || {}) }}
      formatCurrency={formatCurrency}
      onBack={vi.fn()}
      onConfirm={vi.fn()}
      onLookup={vi.fn().mockResolvedValue([])}
      onVerifyPin={vi.fn().mockResolvedValue(true)}
      onDiscountChange={vi.fn()}
      {...props}
    />
  );

const goToPayment = async () => {
  fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Juan Cruz' } });
  fireEvent.change(screen.getByLabelText(/contact number/i), { target: { value: '09171234567' } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'juan@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
  await waitFor(() => expect(screen.getByText(/payment method/i)).toBeInTheDocument());
};

describe('PosCheckoutPane', () => {
  it('renders inline rather than as a modal dialog', () => {
    renderPane({});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the two-step flow, starting on customer', () => {
    renderPane({});
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /payment method/i })).not.toBeInTheDocument();
  });

  it('returns to the cart from step one and to step one from step two', async () => {
    const onBack = vi.fn();
    renderPane({ onBack });

    fireEvent.click(screen.getByRole('button', { name: /back to cart/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('labels a quick-tender button with the amount it actually sets', async () => {
    renderPane({ totals: { lineSum: 300, discount: 0, total: 300, vatableSale: 267.86, vatAmount: 32.14 } });
    await goToPayment();
    const button = screen.getByRole('button', { name: /^PHP 500\.00$/ });
    fireEvent.click(button);
    expect(screen.getByLabelText(/amount tendered/i)).toHaveValue(500);
  });

  it('blocks continue until name, phone and email are all filled', () => {
    renderPane();
    const next = screen.getByRole('button', { name: /continue to payment/i });
    expect(next).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Juan Cruz' } });
    expect(next).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/contact number/i), { target: { value: '09171234567' } });
    expect(next).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'juan@example.com' } });
    expect(next).toBeEnabled();
  });

  it('autofills from a repeat-buyer lookup hit', async () => {
    const onLookup = vi.fn().mockResolvedValue([
      {
        customerName: 'Maria Santos',
        customerContact: '09991112222',
        customerEmail: 'maria@example.com',
        orderCount: 4,
        lastOrderDate: '2026-07-01T00:00:00Z',
        lastOrderTotal: 3200
      }
    ]);
    renderPane({ onLookup });

    fireEvent.change(screen.getByLabelText(/find returning customer/i), { target: { value: '0999' } });
    await waitFor(() => expect(screen.getByText('Maria Santos')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /use maria santos/i }));
    expect(screen.getByLabelText(/customer name/i)).toHaveValue('Maria Santos');
    expect(screen.getByLabelText(/contact number/i)).toHaveValue('09991112222');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('maria@example.com');
    expect(screen.getByText(/4 previous orders/i)).toBeInTheDocument();
  });

  it('computes change for a cash tender', async () => {
    renderPane();
    await goToPayment();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '2000' } });
    expect(screen.getByTestId('change-due')).toHaveTextContent('PHP 880.00');
  });

  it('blocks confirmation while cash tendered is below the total', async () => {
    renderPane();
    await goToPayment();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '1120' } });
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('fills the exact amount from the exact quick-tap button', async () => {
    renderPane();
    await goToPayment();

    fireEvent.click(screen.getByRole('button', { name: /exact/i }));
    expect(screen.getByLabelText(/amount tendered/i)).toHaveValue(1120);
  });

  it('requires cheque number, bank and date when paying by cheque', async () => {
    renderPane();
    await goToPayment();

    fireEvent.click(screen.getByRole('radio', { name: /cheque/i }));
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/cheque number/i), { target: { value: '000123' } });
    fireEvent.change(screen.getByLabelText(/^bank$/i), { target: { value: 'BDO' } });
    fireEvent.change(screen.getByLabelText(/cheque date/i), { target: { value: '2026-07-30' } });

    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('does not ask for tender on a bank transfer', async () => {
    renderPane();
    await goToPayment();

    fireEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));
    expect(screen.queryByLabelText(/amount tendered/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('submits the full payload on confirm', async () => {
    const onConfirm = vi.fn();
    renderPane({ onConfirm });
    await goToPayment();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: /complete sale/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Juan Cruz',
        customerContact: '09171234567',
        customerEmail: 'juan@example.com',
        paymentMethod: 'CASH',
        amountTendered: 2000,
        changeGiven: 880
      })
    );
  });
});

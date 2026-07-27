import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCheckoutModal from '../pos/PosCheckoutModal';

const formatCurrency = (n) => `PHP ${Number(n).toFixed(2)}`;

const renderModal = (props = {}) =>
  render(
    <PosCheckoutModal
      subtotal={1000}
      total={1120}
      formatCurrency={formatCurrency}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      onLookup={vi.fn().mockResolvedValue([])}
      onVerifyPin={vi.fn().mockResolvedValue(true)}
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

describe('PosCheckoutModal', () => {
  it('opens on the customer step', () => {
    renderModal();
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
  });

  it('blocks continue until name, phone and email are all filled', () => {
    renderModal();
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
    renderModal({ onLookup });

    fireEvent.change(screen.getByLabelText(/find returning customer/i), { target: { value: '0999' } });
    await waitFor(() => expect(screen.getByText('Maria Santos')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /use maria santos/i }));
    expect(screen.getByLabelText(/customer name/i)).toHaveValue('Maria Santos');
    expect(screen.getByLabelText(/contact number/i)).toHaveValue('09991112222');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('maria@example.com');
    expect(screen.getByText(/4 previous orders/i)).toBeInTheDocument();
  });

  it('computes change for a cash tender', async () => {
    renderModal();
    await goToPayment();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '2000' } });
    expect(screen.getByTestId('change-due')).toHaveTextContent('PHP 880.00');
  });

  it('blocks confirmation while cash tendered is below the total', async () => {
    renderModal();
    await goToPayment();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '500' } });
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/amount tendered/i), { target: { value: '1120' } });
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('fills the exact amount from the exact quick-tap button', async () => {
    renderModal();
    await goToPayment();

    fireEvent.click(screen.getByRole('button', { name: /exact/i }));
    expect(screen.getByLabelText(/amount tendered/i)).toHaveValue(1120);
  });

  it('requires cheque number, bank and date when paying by cheque', async () => {
    renderModal();
    await goToPayment();

    fireEvent.click(screen.getByRole('radio', { name: /cheque/i }));
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/cheque number/i), { target: { value: '000123' } });
    fireEvent.change(screen.getByLabelText(/^bank$/i), { target: { value: 'BDO' } });
    fireEvent.change(screen.getByLabelText(/cheque date/i), { target: { value: '2026-07-30' } });

    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('does not ask for tender on a bank transfer', async () => {
    renderModal();
    await goToPayment();

    fireEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));
    expect(screen.queryByLabelText(/amount tendered/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete sale/i })).toBeEnabled();
  });

  it('submits the full payload on confirm', async () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
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

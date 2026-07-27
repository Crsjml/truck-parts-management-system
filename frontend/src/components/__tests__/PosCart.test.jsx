import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCart from '../pos/PosCart';

const formatCurrency = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cart = [
  { id: 'p1', name: 'Brake Pad Set', sku: 'BP-100', price: 500, quantity: 2 }
];

const defaultTotals = {
  lineSum: 1000,
  discount: 0,
  total: 1000,
  vatableSale: 892.86,
  vatAmount: 107.14
};

const cartElement = (props = {}) => (
  <PosCart
    cart={cart}
    onUpdateQuantity={vi.fn()}
    onRemove={vi.fn()}
    onCheckout={vi.fn()}
    totals={defaultTotals}
    formatCurrency={formatCurrency}
    warning={null}
    {...props}
  />
);

const renderCart = (props = {}) => render(cartElement(props));

describe('PosCart', () => {
  it('renders each line item with its quantity', () => {
    renderCart();
    expect(screen.getByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the grand total as the dominant figure', () => {
    renderCart({ totals: { lineSum: 2200, discount: 0, total: 2200, vatableSale: 1964.29, vatAmount: 235.71 } });
    expect(screen.getByTestId('pos-total')).toHaveTextContent('2,200.00');
  });

  it('shows VAT as a breakdown of the total, not an addition to it', () => {
    renderCart({ totals: { lineSum: 2200, discount: 0, total: 2200, vatableSale: 1964.29, vatAmount: 235.71 } });
    const vat = screen.getByTestId('pos-vat-note');
    expect(vat).toHaveTextContent('1,964.29');
    expect(vat).toHaveTextContent('235.71');
    expect(vat).toHaveTextContent(/includes vat/i);
  });

  it('shows a discount line only when a discount is applied', () => {
    const { rerender } = renderCart({ totals: { lineSum: 2200, discount: 0, total: 2200, vatableSale: 1964.29, vatAmount: 235.71 } });
    expect(screen.queryByTestId('pos-discount')).not.toBeInTheDocument();

    rerender(cartElement({ totals: { lineSum: 2200, discount: 200, total: 2000, vatableSale: 1785.71, vatAmount: 214.29 } }));
    expect(screen.getByTestId('pos-discount')).toHaveTextContent('200.00');
  });

  it('increments quantity', () => {
    const onUpdateQuantity = vi.fn();
    renderCart({ onUpdateQuantity });
    fireEvent.click(screen.getByRole('button', { name: /increase quantity of brake pad set/i }));
    expect(onUpdateQuantity).toHaveBeenCalledWith('p1', 1);
  });

  it('decrements quantity', () => {
    const onUpdateQuantity = vi.fn();
    renderCart({ onUpdateQuantity });
    fireEvent.click(screen.getByRole('button', { name: /decrease quantity of brake pad set/i }));
    expect(onUpdateQuantity).toHaveBeenCalledWith('p1', -1);
  });

  it('removes a line', () => {
    const onRemove = vi.fn();
    renderCart({ onRemove });
    fireEvent.click(screen.getByRole('button', { name: /remove brake pad set/i }));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  it('disables checkout when the cart is empty', () => {
    renderCart({ cart: [], totals: { lineSum: 0, discount: 0, total: 0, vatableSale: 0, vatAmount: 0 } });
    expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
  });

  it('shows an inline warning instead of blocking', () => {
    renderCart({ warning: 'Only 4 units available.' });
    expect(screen.getByRole('status')).toHaveTextContent('Only 4 units available.');
  });
});

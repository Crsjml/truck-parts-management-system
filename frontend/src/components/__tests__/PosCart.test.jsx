import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCart from '../pos/PosCart';

const formatCurrency = (n) => `PHP ${Number(n).toFixed(2)}`;

const cart = [
  { id: 'p1', name: 'Brake Pad Set', sku: 'BP-100', price: 500, quantity: 2 }
];

const renderCart = (props = {}) =>
  render(
    <PosCart
      cart={cart}
      onUpdateQuantity={vi.fn()}
      onRemove={vi.fn()}
      onCheckout={vi.fn()}
      subtotal={1000}
      discount={0}
      taxAmount={120}
      total={1120}
      formatCurrency={formatCurrency}
      warning={null}
      {...props}
    />
  );

describe('PosCart', () => {
  it('renders each line item with its quantity', () => {
    renderCart();
    expect(screen.getByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the grand total', () => {
    renderCart();
    expect(screen.getByText('PHP 1120.00')).toBeInTheDocument();
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
    renderCart({ cart: [], subtotal: 0, taxAmount: 0, total: 0 });
    expect(screen.getByRole('button', { name: /checkout/i })).toBeDisabled();
  });

  it('shows an inline warning instead of blocking', () => {
    renderCart({ warning: 'Only 4 units available.' });
    expect(screen.getByRole('status')).toHaveTextContent('Only 4 units available.');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({
    // stand-in for the real helper: 15% markup, PHP, 2 decimals
    formatCurrency: (amount) =>
      `PHP ${(Math.round(amount * 1.15 * 100) / 100).toFixed(2)}`,
    displayCurrency: 'PHP',
  }),
}));

import CartDrawer from '../components/CartDrawer';

const cart = [{ id: '1', name: 'Brake Pad', price: 1000, quantity: 2, stock: 5 }];

const renderCart = () =>
  render(
    <CartDrawer
      isCartOpen
      setIsCartOpen={() => {}}
      cart={cart}
      cartTotalItems={2}
      cartTotalAmount={2000}
      updateCartQuantity={() => {}}
      removeFromCart={() => {}}
      handleCheckout={() => {}}
      isCheckingOut={false}
    />
  );

describe('CartDrawer pricing', () => {
  it('renders the marked-up unit price, never the raw price', () => {
    renderCart();
    expect(screen.getByText(/PHP 1,?150\.00/)).toBeInTheDocument();
    expect(screen.queryByText('PHP 1000')).not.toBeInTheDocument();
  });

  it('renders a line subtotal of unit price times quantity', () => {
    renderCart();
    expect(screen.getAllByText(/PHP 2,?300\.00/)).toHaveLength(2);
  });

  it('labels the primary action Checkout', () => {
    renderCart();
    expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
  });
});

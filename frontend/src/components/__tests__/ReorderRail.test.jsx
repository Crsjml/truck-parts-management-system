import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReorderRail from '../ReorderRail';

const parts = [
  { id: 'p1', name: 'Brake Chamber T30', sku: 'BC-T30', price: 1850, stock: 12, reservedStock: 2, category: 'Brakes', image: null },
  { id: 'p2', name: 'Air Filter Element', sku: 'AF-118', price: 940, stock: 0, reservedStock: 0, category: 'Filters', image: null },
];

const baseProps = {
  parts,
  addToCart: vi.fn(),
  formatCurrency: (n) => `PHP ${n}`,
  onBrowseCatalog: vi.fn(),
  onSignIn: vi.fn(),
};

describe('ReorderRail', () => {
  it('prompts sign-in when there is no session', () => {
    render(<ReorderRail {...baseProps} customerSession={null} transactions={[]} />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText('Brake Chamber T30')).not.toBeInTheDocument();
  });

  it('points a signed-in buyer with no history at the catalog', () => {
    render(
      <ReorderRail {...baseProps} customerSession={{ user: { id: 'u1' } }} transactions={[]} />
    );
    expect(screen.getByRole('button', { name: /browse the catalog/i })).toBeInTheDocument();
  });

  it('lists previously bought parts, newest first, without duplicates', () => {
    const transactions = [
      { items: [{ partId: 'p2', quantity: 1 }] },
      { items: [{ partId: 'p1', quantity: 4 }, { partId: 'p2', quantity: 2 }] },
    ];
    render(
      <ReorderRail {...baseProps} customerSession={{ user: { id: 'u1' } }} transactions={transactions} />
    );

    const tiles = screen.getAllByTestId('reorder-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveTextContent('Air Filter Element');
    expect(tiles[1]).toHaveTextContent('Brake Chamber T30');
  });

  it('disables the add button for a part with no available stock', () => {
    const transactions = [{ items: [{ partId: 'p2', quantity: 1 }] }];
    render(
      <ReorderRail {...baseProps} customerSession={{ user: { id: 'u1' } }} transactions={transactions} />
    );
    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
  });
});

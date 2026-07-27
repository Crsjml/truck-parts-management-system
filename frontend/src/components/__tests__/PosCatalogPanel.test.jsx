// frontend/src/components/__tests__/PosCatalogPanel.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCatalogPanel from '../pos/PosCatalogPanel';

const parts = [
  {
    id: 'p1', name: 'Brake Pad Set', sku: 'BP-100', oem: 'OEM-1',
    category: 'Brakes', price: 500, stock: 10, reservedStock: 0,
    compatibleWith: [{ brand: 'Isuzu', series: 'Elf' }]
  },
  {
    id: 'p2', name: 'Oil Filter', sku: 'OF-200', oem: 'OEM-2',
    category: 'Filters', price: 250, stock: 0, reservedStock: 0,
    compatibleWith: [{ brand: 'Hino', series: 'Dutro' }]
  }
];

const formatCurrency = (n) => `PHP ${Number(n).toFixed(2)}`;

const renderPanel = (props = {}) =>
  render(
    <PosCatalogPanel
      parts={parts}
      cart={[]}
      onAddToCart={vi.fn()}
      formatCurrency={formatCurrency}
      {...props}
    />
  );

describe('PosCatalogPanel', () => {
  it('lists both in-stock and out-of-stock parts', () => {
    renderPanel();
    expect(screen.getByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('Oil Filter')).toBeInTheDocument();
  });

  it('labels an out-of-stock part rather than hiding it', () => {
    renderPanel();
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('filters by part name', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/search parts/i), { target: { value: 'brake' } });
    expect(screen.getByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument();
  });

  it('filters by SKU', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/search parts/i), { target: { value: 'OF-200' } });
    expect(screen.getByText('Oil Filter')).toBeInTheDocument();
    expect(screen.queryByText('Brake Pad Set')).not.toBeInTheDocument();
  });

  it('filters by vehicle brand compatibility', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/vehicle brand/i), { target: { value: 'Isuzu' } });
    expect(screen.getByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument();
  });

  it('calls onAddToCart when an in-stock row is clicked', () => {
    const onAddToCart = vi.fn();
    renderPanel({ onAddToCart });
    fireEvent.click(screen.getByRole('button', { name: /add brake pad set/i }));
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('does not call onAddToCart for an out-of-stock row', () => {
    const onAddToCart = vi.fn();
    renderPanel({ onAddToCart });
    fireEvent.click(screen.getByRole('button', { name: /add oil filter/i }));
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('shows a no-results message when nothing matches', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/search parts/i), { target: { value: 'zzzzz' } });
    expect(screen.getByText(/no parts match/i)).toBeInTheDocument();
  });
});

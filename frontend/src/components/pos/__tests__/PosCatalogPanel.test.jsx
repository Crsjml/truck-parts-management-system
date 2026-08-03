import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PosCatalogPanel from '../PosCatalogPanel';

const formatCurrency = (n) => `₱${Number(n).toFixed(2)}`;

const generateMockParts = (count = 20) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Part ${i + 1}`,
    sku: `SKU-${i + 1}`,
    oem: `OEM-${i + 1}`,
    price: (i + 1) * 10,
    stock: 10,
    reservedStock: 0,
    category: i % 2 === 0 ? 'Brakes' : 'Engine',
    compatibleWith: [{ brand: 'Isuzu', series: 'NPR' }]
  }));
};

const renderPanel = (props = {}) => {
  const defaultProps = {
    parts: generateMockParts(20),
    cart: [],
    onAddToCart: vi.fn(),
    formatCurrency,
    searchInputRef: { current: null }
  };
  return render(<PosCatalogPanel {...defaultProps} {...props} />);
};

describe('PosCatalogPanel Component Tests', () => {
  it('renders category rail with All entry and category entries from parts', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^brakes$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^engine$/i })).toBeInTheDocument();
  });

  it('paginates items in a fixed 8-item grid and displays pagination bounds text', () => {
    renderPanel();
    // 20 items total -> Page 1 shows Part 1 through Part 8
    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Part 8')).toBeInTheDocument();
    expect(screen.queryByText('Part 9')).not.toBeInTheDocument();

    expect(screen.getByText(/1–8 of 20 results/i)).toBeInTheDocument();
  });

  it('disables Prev button on page 1 and enables Next button when more items exist', () => {
    renderPanel();
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    const nextBtn = screen.getByRole('button', { name: /next page/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
  });

  it('navigates to page 2 when Next is clicked and updates result count text', () => {
    renderPanel();
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);

    expect(screen.queryByText('Part 1')).not.toBeInTheDocument();
    expect(screen.getByText('Part 9')).toBeInTheDocument();
    expect(screen.getByText('Part 16')).toBeInTheDocument();
    expect(screen.getByText(/9–16 of 20 results/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    expect(prevBtn).toBeEnabled();
  });

  it('filters items by selected category and resets pagination to page 1', () => {
    renderPanel();
    // Go to page 2 first
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText(/9–16 of 20 results/i)).toBeInTheDocument();

    // Select 'Brakes' category (10 items)
    fireEvent.click(screen.getByRole('button', { name: /^brakes$/i }));

    // Page should reset to page 1 (showing items 1–8 of 10 results)
    expect(screen.getByText(/1–8 of 10 results/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('resets pagination to page 1 when search text changes', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));

    const searchInput = screen.getByLabelText(/search parts/i);
    fireEvent.change(searchInput, { target: { value: 'Part 1' } });

    // Matching items: Part 1, Part 10..Part 19
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('calls onAddToCart when a part is clicked', () => {
    const onAddToCart = vi.fn();
    renderPanel({ onAddToCart });

    const addBtn = screen.getByRole('button', { name: /add part 1/i });
    fireEvent.click(addBtn);

    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1', name: 'Part 1' }));
  });

  it('attaches searchInputRef to search text input', () => {
    const inputRef = { current: null };
    render(<PosCatalogPanel parts={generateMockParts(5)} cart={[]} onAddToCart={vi.fn()} formatCurrency={formatCurrency} searchInputRef={inputRef} />);

    const searchInput = screen.getByLabelText(/search parts/i);
    expect(inputRef.current).toBe(searchInput);
  });
});

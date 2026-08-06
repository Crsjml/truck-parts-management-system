import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrderCard from '../OrderCard';

describe('OrderCard', () => {
  const mockTransaction = {
    id: '1',
    invoiceNumber: 'INV-001',
    transactionDate: '2026-07-26T10:00:00Z',
    status: 'COMPLETED',
    items: [
      { id: '1', name: 'Brake Pads', price: 500, quantity: 2 }
    ],
    total: 1120,
    subtotal: 1000,
    taxAmount: 120,
    discount: 0,
    customerName: 'John Doe',
    customerContact: '09171234567'
  };

  const mockHandlers = {
    onDownloadPDF: vi.fn(),
    onReview: vi.fn(),
    onReorder: vi.fn()
  };

  it('renders order card with header, body, footer', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    // Header assertions
    expect(screen.getByText(/INV-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    
    // Body assertions
    expect(screen.getByText('Brake Pads')).toBeInTheDocument();
    expect(screen.getByText(/Qty: 2/i)).toBeInTheDocument();
    
    // Footer assertions
    expect(screen.getByText(/₱ 1120/)).toBeInTheDocument(); // total (bold)
  });

  it('renders action buttons (PDF, Reorder, Review)', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reorder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
  });

  it('calls onDownloadPDF when PDF button clicked', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect(mockHandlers.onDownloadPDF).toHaveBeenCalledWith(mockTransaction);
  });

  it('calls onReorder with items when Reorder button clicked', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /reorder/i }));
    expect(mockHandlers.onReorder).toHaveBeenCalledWith(mockTransaction.items);
  });

  it('calls onReview with partId and name when Review button clicked', () => {
    const transactionWithPartId = {
      ...mockTransaction,
      items: [{ id: 'item-1', partId: 'part-123', name: 'Brake Pads', price: 500, quantity: 2 }]
    };

    render(
      <OrderCard
        transaction={transactionWithPartId}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Review Brake Pads/i }));
    expect(mockHandlers.onReview).toHaveBeenCalledWith('part-123', 'Brake Pads', undefined, false);
  });

  it('calls onReview with id fallback when partId is missing', () => {
    render(
      <OrderCard
        transaction={mockTransaction}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Review Brake Pads/i }));
    expect(mockHandlers.onReview).toHaveBeenCalledWith('1', 'Brake Pads', undefined, false);
  });

  it('renders Edit Review button and calls onReview with isEdit=true when already reviewed', () => {
    const transactionWithPartId = {
      ...mockTransaction,
      items: [{ id: 'item-1', partId: 'part-123', name: 'Brake Pads', price: 500, quantity: 2 }]
    };

    render(
      <OrderCard
        transaction={transactionWithPartId}
        displayCurrency="₱"
        formatCurrency={(amt) => `₱ ${amt}`}
        onDownloadPDF={mockHandlers.onDownloadPDF}
        onReview={mockHandlers.onReview}
        onReorder={mockHandlers.onReorder}
        reviewedPartIds={['part-123']}
      />
    );
    
    const editBtn = screen.getByRole('button', { name: /Edit Review for Brake Pads/i });
    expect(editBtn).toBeInTheDocument();
    
    fireEvent.click(editBtn);
    expect(mockHandlers.onReview).toHaveBeenCalledWith('part-123', 'Brake Pads', undefined, true);
  });
});

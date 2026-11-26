import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PurchasingReports from './PurchasingReports';

const fmt = (v) => `₱${Number(v).toLocaleString()}`;
const recent = new Date().toISOString();
const orders = [
  { id: 1, status: 'Problem Reported', totalAmount: 500, createdAt: recent, updatedAt: recent, items: [], supplier: { name: 'Acme' } },
  { id: 2, status: 'Received', totalAmount: 2500, createdAt: recent, updatedAt: recent, items: [{ name: 'Brake pad', quantity: 3 }], supplier: { name: 'Acme' } },
];

const setup = (props = {}) => render(
  <PurchasingReports purchaseOrders={orders} transactions={[]} formatCurrency={fmt} {...props} />,
);

describe('PurchasingReports', () => {
  test('surfaces problem orders in the needs-attention list', () => {
    setup();
    const item = screen.getByText('Problem orders').closest('li');
    expect(item).toHaveTextContent('1');
  });

  test('period control is a labelled group of toggle buttons and switches selection', () => {
    setup();
    expect(screen.getByRole('group', { name: /report period/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Year to date' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows empty states instead of blank charts when there are no orders', () => {
    setup({ purchaseOrders: [] });
    expect(screen.getByText(/nothing needs attention/i)).toBeInTheDocument();
    expect(screen.getByText(/no purchase orders were created/i)).toBeInTheDocument();
    // One empty state, not five empty charts.
    expect(screen.queryByText(/no received orders/i)).not.toBeInTheDocument();
  });

  test('offers CSV export', () => {
    setup();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  test('attention rows open the matching order list', () => {
    const calls = [];
    setup({ onDrillDown: (kind) => calls.push(kind) });
    fireEvent.click(screen.getByRole('button', { name: /problem orders: 1/i }));
    expect(calls).toEqual(['problems']);
  });

  test('rows with a zero count are not clickable', () => {
    setup({ onDrillDown: () => {} });
    expect(screen.queryByRole('button', { name: /late receipts/i })).not.toBeInTheDocument();
  });

  test('shows a busy loading state instead of empty charts while orders load', () => {
    setup({ isLoading: true });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/nothing needs attention/i)).not.toBeInTheDocument();
  });

  test('separates right-now figures from the period figures', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Right now' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /in this period/i })).toBeInTheDocument();
  });

  test('overstocked parts are buttons that open the part', () => {
    const calls = [];
    setup({ onDrillDown: (kind, value) => calls.push([kind, value]) });
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    fireEvent.click(screen.getByRole('button', { name: /brake pad/i }));
    expect(calls).toEqual([['part', 'Brake pad']]);
  });

  test('metric help opens on demand and is exposed via aria-expanded', () => {
    setup();
    const btn = screen.getByRole('button', { name: /what does "spend" mean/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/marked received/i)).toBeInTheDocument();
  });

  test('an empty period offers one-click wider periods', () => {
    setup({ purchaseOrders: [] });
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    // All time is now selected, so the empty state only offers the remaining wider period.
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'This month' }));
    fireEvent.click(screen.getByRole('button', { name: /show year to date/i }));
    expect(screen.getByRole('button', { name: 'Year to date' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('export is disabled when the period has no orders', () => {
    setup({ purchaseOrders: [] });
    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
  });
});

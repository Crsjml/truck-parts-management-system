import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminNavigation from '../staff/AdminNavigation';
import { canAccessPage, defaultStaffPage } from '../../utils/staffAccess';

describe('role-based navigation', () => {
  it.each([
    ['CASHIER', ['Sales POS Entry', 'Customer Management'], 'pos'],
    ['WAREHOUSE', ['Parts Inventory', 'Category Management', 'Purchasing'], 'catalog'],
    ['ADMIN', ['Dashboard Overview', 'Parts Inventory', 'Sales POS Entry', 'Sales Analytics', 'Category Management', 'Purchasing', 'Customer Management'], 'dashboard'],
    ['SUPERADMIN', ['Dashboard Overview', 'Parts Inventory', 'Sales POS Entry', 'Sales Analytics', 'Category Management', 'Purchasing', 'Customer Management', 'Staff Management', 'System Settings'], 'dashboard']
  ])('shows only the permitted pages for %s', (role, labels, landing) => {
    const onNavigate = vi.fn();
    render(<AdminNavigation role={role} page={landing} onNavigate={onNavigate} onSettings={vi.fn()} />);
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(labels);
    expect(defaultStaffPage(role)).toBe(landing);
    fireEvent.click(screen.getByRole('button', { name: labels[0] }));
    expect(onNavigate).toHaveBeenCalledWith(landing);
  });

  it('does not grant access to unknown roles or restricted deep links', () => {
    expect(canAccessPage('CASHIER', 'analytics')).toBe(false);
    expect(canAccessPage('WAREHOUSE', 'pos')).toBe(false);
    expect(canAccessPage('ADMIN', 'staff')).toBe(false);
    expect(canAccessPage('UNKNOWN', 'account')).toBe(false);
    expect(defaultStaffPage('UNKNOWN')).toBeNull();
  });

  it('keeps permissions when navigation is collapsed', () => {
    render(<AdminNavigation role="CASHIER" collapsed page="pos" onNavigate={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Sales POS Entry' })).toHaveAttribute('aria-current', 'page');
  });
});

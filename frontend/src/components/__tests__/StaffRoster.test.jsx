// frontend/src/components/__tests__/StaffRoster.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StaffRoster from '../staff/StaffRoster';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const staff = [
  { id: 's1', email: 'owner@ttp.com', role: 'SUPERADMIN', lastSeenAt: daysAgo(0), addedBy: 'system', createdAt: daysAgo(300) },
  { id: 's2', email: 'newhire@ttp.com', role: 'ADMIN', lastSeenAt: null, addedBy: 'owner@ttp.com', createdAt: daysAgo(2) },
  { id: 's3', email: 'ana@ttp.com', role: 'ADMIN', lastSeenAt: daysAgo(120), addedBy: 'owner@ttp.com', createdAt: daysAgo(200) }
];

const renderRoster = (props = {}) =>
  render(
    <StaffRoster
      staff={staff}
      currentEmail="owner@ttp.com"
      onChangeRole={vi.fn()}
      onRequestRemove={vi.fn()}
      onCancelRemove={vi.fn()}
      onRemove={vi.fn()}
      pendingRemoveId={null}
      busyId={null}
      error={null}
      {...props}
    />
  );

describe('StaffRoster', () => {
  it('shows the remove button at rest rather than hiding it until hover', () => {
    renderRoster();
    const remove = screen.getByRole('button', { name: 'Remove newhire@ttp.com' });
    expect(remove.className).not.toMatch(/opacity-0/);
  });

  it('lists every staff member by email', () => {
    renderRoster();
    expect(screen.getByText('owner@ttp.com')).toBeInTheDocument();
    expect(screen.getByText('newhire@ttp.com')).toBeInTheDocument();
    expect(screen.getByText('ana@ttp.com')).toBeInTheDocument();
  });

  it('labels a never-signed-in account as "Not signed in yet", never "Invited"', () => {
    renderRoster();
    expect(screen.getByText(/not signed in yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/invited/i)).not.toBeInTheDocument();
  });

  it('labels an account unseen for over 60 days as dormant', () => {
    renderRoster();
    expect(screen.getByText(/dormant/i)).toBeInTheDocument();
  });

  it('shows who added each account', () => {
    renderRoster();
    expect(screen.getAllByText(/added by owner@ttp.com/i).length).toBe(2);
  });

  it('changes a role through the select', () => {
    const onChangeRole = vi.fn();
    renderRoster({ onChangeRole });
    fireEvent.change(screen.getByLabelText(/role for ana@ttp.com/i), { target: { value: 'SUPERADMIN' } });
    expect(onChangeRole).toHaveBeenCalledWith('s3', 'SUPERADMIN');
  });

  it('shows a staged role in the select with an inline Save that commits it', () => {
    const onConfirmRoleChange = vi.fn();
    renderRoster({ pendingRoleChange: { id: 's3', to: 'CASHIER' }, onConfirmRoleChange, onCancelRoleChange: vi.fn() });
    const select = screen.getByLabelText(/role for ana@ttp.com/i);
    expect(select).toHaveValue('CASHIER');
    expect(select).toHaveAccessibleDescription(/change ana@ttp\.com from admin to cashier\?/i);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onConfirmRoleChange).toHaveBeenCalledWith('s3', 'CASHIER');
  });

  it('asks for confirmation before removing', () => {
    const onRequestRemove = vi.fn();
    renderRoster({ onRequestRemove });
    fireEvent.click(screen.getByRole('button', { name: /remove ana@ttp.com/i }));
    expect(onRequestRemove).toHaveBeenCalledWith('s3');
  });

  it('renders an inline confirm row for the pending removal', () => {
    renderRoster({ pendingRemoveId: 's3' });
    expect(screen.getByText(/remove ana@ttp.com\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('does not offer to remove your own account', () => {
    renderRoster();
    expect(screen.queryByRole('button', { name: /remove owner@ttp.com/i })).not.toBeInTheDocument();
  });

  it('does not let you change your own role', () => {
    renderRoster();
    expect(screen.queryByLabelText(/role for owner@ttp.com/i)).not.toBeInTheDocument();
  });

  it('lets the email wrap instead of truncating on mobile', () => {
    renderRoster();
    const email = screen.getByText('ana@ttp.com');
    expect(email.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(email.className).toMatch(/\[overflow-wrap:anywhere\]|break-all/);
  });

  it('announces an error inline', () => {
    renderRoster({ error: 'Cannot remove the last superadmin.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot remove the last superadmin.');
  });
});

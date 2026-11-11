import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminSidebarFooter from '../staff/AdminSidebarFooter';

const baseProps = {
  name: 'Ana Reyes',
  roleLabel: 'Admin',
  isSuperadmin: false,
  avatarUrl: null
};

describe('AdminSidebarFooter', () => {
  it('renders My Account as a real button named after the user', () => {
    const onAccount = vi.fn();
    render(<AdminSidebarFooter {...baseProps} onAccount={onAccount} onLogout={vi.fn()} />);
    const account = screen.getByRole('button', { name: /my account/i });
    expect(account.tagName).toBe('BUTTON');
    expect(account).toHaveAttribute('type', 'button');
    expect(account).toHaveAccessibleName(/ana reyes/i);
    fireEvent.click(account);
    expect(onAccount).toHaveBeenCalledTimes(1);
  });

  it('labels the icon-only logout as Sign out', () => {
    const onLogout = vi.fn();
    render(<AdminSidebarFooter {...baseProps} onAccount={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps both the account button and the logout when collapsed', () => {
    render(<AdminSidebarFooter {...baseProps} collapsed onAccount={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: /my account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
  });
});

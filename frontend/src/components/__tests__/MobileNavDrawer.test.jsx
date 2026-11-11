import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileNavDrawer from '../staff/MobileNavDrawer';

const renderDrawer = (props = {}) => render(
  <MobileNavDrawer isOpen onClose={vi.fn()} {...props}>
    <button type="button">Dashboard Overview</button>
    <button type="button">Sign out</button>
  </MobileNavDrawer>
);

describe('MobileNavDrawer', () => {
  it('renders nothing while closed', () => {
    renderDrawer({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog when open', () => {
    renderDrawer();
    const dialog = screen.getByRole('dialog', { name: /navigation/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus to the close button on open', () => {
    renderDrawer();
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toHaveFocus();
  });

  it('closes on Escape, the close button and the backdrop', () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    fireEvent.click(screen.getByTestId('mobile-nav-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('traps Tab inside the drawer', () => {
    renderDrawer();
    const last = screen.getByRole('button', { name: /sign out/i });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toHaveFocus();
  });
});

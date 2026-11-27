import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import Analytics from '../Analytics';

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatBaseCurrency: (v) => `$${v}`,
    formatCurrency: (v) => `$${v}`,
    formatCompactBaseCurrency: (v) => `$${v}`,
    formatCompactCurrency: (v) => `$${v}`
  })
}));
vi.mock('../../authStore', () => ({ fetchCategoriesList: vi.fn().mockResolvedValue([]) }));
vi.mock('../../supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn() } } }));

global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

describe('Overview zoom pop-up', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  const open = () => {
    render(<Analytics parts={[]} transactions={[]} />);
    const trigger = screen.getByRole('button', { name: 'Zoom Revenue Trend' });
    trigger.focus();
    fireEvent.click(trigger);
    return trigger;
  };

  it('is a labelled modal dialog', () => {
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Revenue Trend');
  });

  it('moves focus into the dialog on open', async () => {
    open();
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('returns focus to the trigger when closed with the button', async () => {
    const trigger = open();
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the trigger when closed with Escape', async () => {
    const trigger = open();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});

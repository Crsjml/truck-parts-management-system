import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FloatingSettingsWidget from '../FloatingSettingsWidget';

const renderWidget = () => render(
  <FloatingSettingsWidget onAdminLogin={vi.fn()} onCustomerLogin={vi.fn()} onLogout={vi.fn()} isLoggedIn={false} />
);

describe('FloatingSettingsWidget accessibility', () => {
  it('names the gear button after the panel it opens and reports it collapsed', () => {
    renderWidget();
    const gear = screen.getByRole('button', { name: /open testing tools/i });
    expect(gear).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays flat: no hover scale or heavy drop shadow on the gear', () => {
    renderWidget();
    const gear = screen.getByRole('button', { name: /open testing tools/i });
    expect(gear.className).not.toMatch(/hover:scale/);
    expect(gear.className).not.toMatch(/shadow-\[/);
  });

  it('opens a labelled panel with a named close button that returns to the gear', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /open testing tools/i }));
    expect(screen.getByRole('region', { name: /testing tools/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close testing tools/i }));
    expect(screen.getByRole('button', { name: /open testing tools/i })).toBeInTheDocument();
  });
});

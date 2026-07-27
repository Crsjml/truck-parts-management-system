import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PosShortcutLegend from '../pos/PosShortcutLegend';

describe('PosShortcutLegend', () => {
  it('names every bound shortcut', () => {
    render(<PosShortcutLegend />);
    expect(screen.getByText('F2')).toBeInTheDocument();
    expect(screen.getByText('F4')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('describes what each shortcut does', () => {
    render(<PosShortcutLegend />);
    expect(screen.getByText(/search/i)).toBeInTheDocument();
    expect(screen.getByText(/checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/clear/i)).toBeInTheDocument();
  });
});

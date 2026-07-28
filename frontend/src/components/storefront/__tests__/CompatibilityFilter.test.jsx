import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompatibilityFilter from '../../CompatibilityFilter';
import { fetchVehicleOptions } from '../../../authStore';

vi.mock('../../../authStore', () => ({
  fetchVehicleOptions: vi.fn()
}));

describe('CompatibilityFilter', () => {
  it('keeps the selected truck visible in compact fitment mode', async () => {
    fetchVehicleOptions.mockResolvedValue([
      { brand: 'Isuzu', series: ['ELF'] }
    ]);

    render(<CompatibilityFilter compact onFilterChange={vi.fn()} />);

    expect(await screen.findByText(/truck fitment/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /all brands/i })).toBeVisible();
  });
});

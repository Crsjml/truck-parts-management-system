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

    render(
      <CompatibilityFilter
        compact
        onFilterChange={vi.fn()}
        vehicleFilter={{ brand: 'Isuzu', series: 'ELF' }}
      />
    );

    expect(await screen.findByText(/find parts for your truck/i)).toBeVisible();
    expect(screen.getByText(/isuzu elf/i)).toBeVisible();
    expect(screen.getByText(/brand: isuzu/i)).toBeVisible();
  });
});

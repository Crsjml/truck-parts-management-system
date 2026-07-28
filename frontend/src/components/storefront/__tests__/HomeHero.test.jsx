import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomeHero from '../HomeHero';

describe('HomeHero', () => {
  it('puts truck selection ahead of browsing on the home screen', () => {
    render(
      <HomeHero
        search=""
        setSearch={vi.fn()}
        vehicleFilter={{ brand: null, series: null }}
        setVehicleFilter={vi.fn()}
        onBrowseCatalog={vi.fn()}
        onOpenCustomerAuth={vi.fn()}
        onOpenTruckFilter={vi.fn()}
        selectedTruckLabel=""
        isLoggedIn={false}
      />
    );

    const hero = screen.getByRole('region', { name: /homepage hero/i });
    expect(within(hero).getByRole('button', { name: /select your truck/i })).toBeVisible();
    expect(within(hero).getByRole('button', { name: /browse catalog/i })).toBeVisible();
    expect(within(hero).getByRole('searchbox', { name: /search parts/i })).toBeVisible();
  });
});

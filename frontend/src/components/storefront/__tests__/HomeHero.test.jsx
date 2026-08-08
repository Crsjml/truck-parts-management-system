import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
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
    expect(within(hero).getByRole('button', { name: /select your truck/i })).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: /browse catalog/i })).toBeInTheDocument();
    expect(within(hero).getByRole('searchbox', { name: /search parts/i })).toBeInTheDocument();
  });

  it('dispatches the home hero buttons to the right destinations', () => {
    const onBrowseCatalog = vi.fn();
    const onOpenTruckFilter = vi.fn();

    render(
      <HomeHero
        search=""
        setSearch={vi.fn()}
        vehicleFilter={{ brand: null, series: null }}
        setVehicleFilter={vi.fn()}
        onBrowseCatalog={onBrowseCatalog}
        onOpenCustomerAuth={vi.fn()}
        onOpenTruckFilter={onOpenTruckFilter}
        selectedTruckLabel=""
        isLoggedIn={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /select your truck/i }));
    fireEvent.click(screen.getByRole('button', { name: /browse catalog/i }));

    expect(onOpenTruckFilter).toHaveBeenCalledTimes(1);
    expect(onBrowseCatalog).toHaveBeenCalledTimes(1);
  });
});

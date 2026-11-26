import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    // jsdom has no animation frames, so disable animation to render the shapes
    Bar: (props) => <actual.Bar {...props} isAnimationActive={false} />,
    Pie: (props) => <actual.Pie {...props} isAnimationActive={false} />,
    ResponsiveContainer: ({ children }) => React.cloneElement(children, { width: 600, height: 400 })
  };
});

import ChartRenderer from '../ChartRenderer';

const fmt = (v) => `$${v}`;

describe('ChartRenderer keyboard drill-down', () => {
  it('lets Top Movers bars be focused and activated with Enter and Space', () => {
    const onMoverClick = vi.fn();
    const data = [
      { name: 'Brake Pad', quantity: 5, revenue: 500, rankDelta: 1 },
      { name: 'Clutch Disc', quantity: 3, revenue: 300, rankDelta: 0 }
    ];
    render(<ChartRenderer type="movers" data={data} formatCurrency={fmt} extraProps={{ onMoverClick }} />);

    const bar = screen.getByRole('button', { name: /Brake Pad.*5 units/i });
    expect(bar).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(bar, { key: 'Enter' });
    fireEvent.keyDown(bar, { key: ' ' });
    expect(onMoverClick).toHaveBeenCalledTimes(2);
    expect(onMoverClick).toHaveBeenCalledWith('Brake Pad');
  });

  it('lets only drillable category slices be focused and activated', () => {
    const onDrill = vi.fn();
    const data = [
      { name: 'Brakes', revenue: 700, hasChildren: true },
      { name: 'Filters', revenue: 300, hasChildren: false }
    ];
    render(<ChartRenderer type="donut" data={data} formatCurrency={fmt} extraProps={{ onDrill }} />);

    const slice = screen.getByRole('button', { name: /Brakes.*drill/i });
    fireEvent.keyDown(slice, { key: 'Enter' });
    expect(onDrill).toHaveBeenCalledWith('Brakes');
    expect(screen.queryByRole('button', { name: /Filters/i })).toBeNull();
  });
});

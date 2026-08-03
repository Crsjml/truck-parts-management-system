import { useRef } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LowStockAlertPopover from '../LowStockAlertPopover';

const TestWrapper = ({ parts, isOpen = true, onClose = vi.fn() }) => {
  const triggerRef = useRef(null);
  
  return (
    <>
      <button ref={triggerRef} data-testid="trigger">Trigger</button>
      <LowStockAlertPopover
        lowStockParts={parts}
        isOpen={isOpen}
        onClose={onClose}
        triggerRef={triggerRef}
        onNavigateToPart={vi.fn()}
        onNavigateToCatalog={vi.fn()}
      />
    </>
  );
};

const parts = [
  { id: 'p1', name: 'Critical Part', sku: 'CRIT-1', stock: 0, minStock: 5 },
  { id: 'p2', name: 'Low Part', sku: 'LOW-1', stock: 4, minStock: 5 },
  { id: 'p3', name: 'Very Critical Part', sku: 'VCRIT-1', stock: -2, minStock: 10 }
];

describe('LowStockAlertPopover', () => {
  it('sorts parts by severity ratio ascending', () => {
    // VCRIT (-0.2) < CRIT (0) < LOW (0.8)
    render(<TestWrapper parts={parts} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    
    expect(within(items[0]).getByText('Very Critical Part')).toBeInTheDocument();
    expect(within(items[1]).getByText('Critical Part')).toBeInTheDocument();
    expect(within(items[2]).getByText('Low Part')).toBeInTheDocument();
  });

  it('renders correct badge/color per ratio', () => {
    render(<TestWrapper parts={parts} />);
    
    const vcrit = screen.getByText('Very Critical Part').closest('li');
    const vcritBadge = within(vcrit).getByText('Critical');
    expect(vcritBadge.className).toMatch(/bg-destructive/);
    
    const crit = screen.getByText('Critical Part').closest('li');
    const critBadge = within(crit).getByText('Critical');
    expect(critBadge.className).toMatch(/bg-destructive/);
    
    const low = screen.getByText('Low Part').closest('li');
    const lowBadge = within(low).getByText('Low');
    expect(lowBadge.className).toMatch(/bg-amber-500/);
  });

  it('dismiss removes row but does not change props', () => {
    render(<TestWrapper parts={parts} />);
    
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    
    const lowItem = screen.getByText('Low Part').closest('li');
    const dismissBtn = within(lowItem).getByRole('button', { name: /Dismiss Low Part/i });
    
    fireEvent.click(dismissBtn);
    
    expect(screen.queryByText('Low Part')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(parts).toHaveLength(3); // Original array untouched
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<TestWrapper parts={parts} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on outside click', () => {
    const onClose = vi.fn();
    render(
      <div data-testid="outside">
        <TestWrapper parts={parts} onClose={onClose} />
      </div>
    );
    
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stat tiles are hidden by default and revealed on hover/focus', () => {
    render(<TestWrapper parts={[parts[1]]} />);
    
    const currentLabel = screen.getByText('Current');
    const tileContainer = currentLabel.parentElement.parentElement;
    
    // Check that it's hidden by default and relies on group hover/focus
    expect(tileContainer.className).toContain('hidden');
    expect(tileContainer.className).toContain('group-hover:grid');
    expect(tileContainer.className).toContain('group-focus-within:grid');
  });
});

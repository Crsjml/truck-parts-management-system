import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { House, Tag } from '@phosphor-icons/react';
import NavToggle from '../ui/NavToggle';

const items = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'catalog', label: 'Parts Catalog', icon: Tag },
];

describe('NavToggle', () => {
  it('renders one button per item and marks the active one', () => {
    render(<NavToggle items={items} activeId="home" onSelect={() => {}} />);
    const homeBtn = screen.getByRole('button', { name: /home/i });
    const catalogBtn = screen.getByRole('button', { name: /parts catalog/i });
    expect(homeBtn).toHaveClass('bg-background');
    expect(catalogBtn).not.toHaveClass('bg-background');
  });

  it('calls onSelect with the clicked item id', () => {
    const onSelect = vi.fn();
    render(<NavToggle items={items} activeId="home" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /parts catalog/i }));
    expect(onSelect).toHaveBeenCalledWith('catalog');
  });

  it('never uses fully-round pill shapes (DESIGN.md shape ban)', () => {
    render(<NavToggle items={items} activeId="home" onSelect={() => {}} />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).not.toMatch(/rounded-full/);
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn.className).not.toMatch(/rounded-full/);
    });
  });
});

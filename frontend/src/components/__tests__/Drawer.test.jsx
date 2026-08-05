import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from '../ui/Drawer';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  useReducedMotion: () => true
}));

describe('Drawer', () => {
  it('allows callers to place nested dialogs above existing modal layers', () => {
    render(
      <Drawer
        isOpen
        onClose={vi.fn()}
        labelledBy="test-dialog-title"
        wrapperStyle={{ zIndex: 140 }}
        panelClassName="test-panel"
      >
        <h2 id="test-dialog-title">Confirm action</h2>
      </Drawer>
    );

    const dialog = screen.getByRole('dialog', { name: /confirm action/i });
    const wrapper = dialog.parentElement;

    expect(wrapper).toHaveStyle({ zIndex: '140' });
  });
});

import { fireEvent, render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AddPartDrawer from '../AddPartDrawer';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  useReducedMotion: () => true,
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }) => <div {...props}>{children}</div>
  }
}));

vi.mock('react-select', () => ({
  default: ({ inputId, placeholder, options = [], value, onChange, ...rest }) => {
    const flat = (items) => items.flatMap((i) => (i?.options ? flat(i.options) : [i]));
    const flatOptions = flat(options);
    return (
      <select
        id={inputId}
        aria-label={placeholder || inputId || 'select'}
        aria-invalid={rest['aria-invalid']}
        aria-describedby={rest['aria-describedby']}
        value={value?.value || ''}
        onChange={(e) => onChange?.(flatOptions.find((o) => String(o.value) === e.target.value) || null)}
      >
        <option value="">{placeholder || 'select'}</option>
        {flatOptions.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  }
}));

function Harness({ onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>New Product</button>
      <AddPartDrawer
        isOpen={open}
        onClose={() => { onClose(); setOpen(false); }}
        onAddPart={vi.fn()}
        categoriesList={[{ id: 'engine', name: 'Engine' }]}
        parts={[]}
      />
    </>
  );
}

const openDrawer = () => {
  const trigger = screen.getByRole('button', { name: 'New Product' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

describe('AddPartDrawer modal behaviour', () => {
  it('moves focus into the drawer on open', () => {
    render(<Harness />);
    openDrawer();
    const dialog = screen.getByRole('dialog', { name: /add new part/i });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes a clean drawer on Escape and returns focus to the trigger', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = openDrawer();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /add new part/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab inside the drawer', () => {
    render(<Harness />);
    openDrawer();
    const dialog = screen.getByRole('dialog', { name: /add new part/i });
    const buttons = dialog.querySelectorAll('button:not(:disabled)');
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(last);
  });

  it('asks to discard on Escape when dirty, and Escape again keeps editing', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    openDrawer();
    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Starter Motor' } });
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: /discard unsaved changes/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /discard unsaved changes/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /add new part/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/part name/i)).toHaveValue('Starter Motor');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns focus to the trigger after discarding a dirty drawer', () => {
    render(<Harness />);
    const trigger = openDrawer();
    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Starter Motor' } });
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('dialog', { name: /add new part/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('marks the first invalid field and focuses it when Next fails', () => {
    render(<Harness />);
    openDrawer();
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    const name = screen.getByLabelText(/part name/i);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    const errorId = name.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    const error = document.getElementById(errorId);
    expect(error).toHaveTextContent(/at least 3 characters/i);
    expect(error).toHaveClass('text-alarm-text');
    expect(document.activeElement).toBe(name);
    expect(screen.getByLabelText(/oem no/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('error text uses the alarm token, never destructive-foreground', () => {
    render(<Harness />);
    openDrawer();
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    const dialog = screen.getByRole('dialog', { name: /add new part/i });
    expect(dialog.innerHTML).not.toMatch(/destructive-foreground/);
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AddPartDrawer from '../AddPartDrawer';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

vi.mock('react-select', () => ({
  default: ({ inputId, placeholder, options = [], value, onChange }) => {
    const flattenOptions = (items) =>
      items.flatMap((item) =>
        item?.options ? flattenOptions(item.options) : [item]
      );

    const flatOptions = flattenOptions(options);
    return (
      <select
        id={inputId}
        aria-label={placeholder || inputId || 'select'}
        value={value?.value || ''}
        onChange={(e) => {
          const selected = flatOptions.find((option) => String(option.value) === e.target.value);
          onChange?.(selected || null);
        }}
      >
        <option value="">{placeholder || 'select'}</option>
        {flatOptions.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
}));

vi.mock('../ui/Drawer', () => ({
  Drawer: ({ isOpen, labelledBy, describedBy, children }) =>
    isOpen ? (
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}>
        {children}
      </div>
    ) : null
}));

describe('AddPartDrawer', () => {
  const parts = [
    {
      id: 'part-1',
      name: 'Starter Motor',
      sku: 'SKU-1',
      oem: 'OEM-1',
      category: 'Engine',
      categoryId: 'engine',
      price: 1000,
      minStock: 3,
      compatibleWith: [{ brand: 'Isuzu', series: 'ELF NPR', year: '' }]
    },
    {
      id: 'part-2',
      name: 'Fuel Pump',
      sku: 'SKU-2',
      oem: 'OEM-2',
      category: 'Engine',
      categoryId: 'engine',
      price: 1500,
      minStock: 2,
      compatibleWith: 'Hino Dutro 2010-2015'
    }
  ];

  it('warns before discarding a dirty add form', async () => {
    const onClose = vi.fn();
    render(
      <AddPartDrawer
        isOpen
        onClose={onClose}
        onAddPart={vi.fn()}
        categoriesList={[]}
        parts={parts}
      />
    );

    fireEvent.change(screen.getByLabelText(/part name/i), {
      target: { value: 'Starter Motor' }
    });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    const discardDialog = await screen.findByRole('dialog', { name: /discard unsaved changes/i });
    expect(discardDialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /discard/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies a new template cleanly after switching parts', async () => {
    render(
      <AddPartDrawer
        isOpen
        onClose={vi.fn()}
        onAddPart={vi.fn()}
        categoriesList={[]}
        parts={parts}
      />
    );

    fireEvent.change(screen.getByLabelText(/select a part to clone its details/i), {
      target: { value: 'part-1' }
    });
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    expect(screen.getByDisplayValue(/starter motor \(copy\)/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/select a part to clone its details/i), {
      target: { value: 'part-2' }
    });
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    const confirmDialog = await screen.findByRole('dialog', { name: /apply template/i });
    fireEvent.click(within(confirmDialog).getByRole('button', { name: /apply template/i }));

    expect(screen.getByDisplayValue(/fuel pump \(copy\)/i)).toBeInTheDocument();
  });

  it('opens discard confirmation from the X button', async () => {
    render(
      <AddPartDrawer
        isOpen
        onClose={vi.fn()}
        onAddPart={vi.fn()}
        categoriesList={[]}
        parts={parts}
      />
    );

    fireEvent.change(screen.getByLabelText(/part name/i), {
      target: { value: 'Dirty part' }
    });
    fireEvent.click(screen.getByRole('button', { name: /close add part drawer/i }));

    expect(await screen.findByRole('dialog', { name: /discard unsaved changes/i })).toBeInTheDocument();
  });

  it('clears the selected template when the drawer is reopened', async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>Reopen drawer</button>
          <AddPartDrawer
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onAddPart={vi.fn()}
            categoriesList={[]}
            parts={parts}
          />
        </>
      );
    }

    render(<Harness />);

    const templateSelect = screen.getByLabelText(/select a part to clone its details/i);
    fireEvent.change(templateSelect, { target: { value: 'part-1' } });
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    expect(screen.getByDisplayValue(/starter motor \(copy\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    const discardDialog = await screen.findByRole('dialog', { name: /discard unsaved changes/i });
    fireEvent.click(within(discardDialog).getByRole('button', { name: /discard/i }));

    expect(screen.queryByRole('dialog', { name: /add new part/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reopen drawer/i }));

    expect(screen.getByLabelText(/select a part to clone its details/i)).toHaveValue('');
    expect(screen.queryByText(/template selected/i)).not.toBeInTheDocument();
  });
});

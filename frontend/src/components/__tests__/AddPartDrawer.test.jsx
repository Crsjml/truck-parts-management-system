import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// Mirrors SettingsContext: a part's markupOverride wins over the 20% global rate.
const GLOBAL_MARKUP = 20;
vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { active_markup: GLOBAL_MARKUP },
    formatCurrency: (value, part) => {
      const override = part?.markupOverride;
      const pct = override !== undefined && override !== null ? override : GLOBAL_MARKUP;
      return `₱${(Number(value || 0) * (1 + pct / 100)).toFixed(2)}`;
    }
  })
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

describe('AddPartDrawer SKU suggestion', () => {
  const categoriesList = [
    { id: 'brakes', name: 'Braking Systems', parentCategory: null },
    { id: 'pads', name: 'Brake Pads/Linings', parentCategory: { id: 'brakes' } }
  ];
  const renderDrawer = (props = {}) => render(
    <AddPartDrawer isOpen onClose={vi.fn()} onAddPart={vi.fn()} categoriesList={categoriesList} parts={[]} {...props} />
  );
  const skuInput = () => screen.getByLabelText(/^sku/i);
  const pickCategory = (id) => fireEvent.change(screen.getByLabelText('-- Select Category --'), { target: { value: id } });

  it('fills in the suggested SKU when a category is chosen', async () => {
    const suggestSku = vi.fn().mockResolvedValue({ ok: true, sku: 'BRK-PAD-00042' });
    renderDrawer({ suggestSku });

    pickCategory('pads');

    await waitFor(() => expect(skuInput()).toHaveValue('BRK-PAD-00042'));
    expect(suggestSku).toHaveBeenCalledWith('pads');
  });

  it('never overwrites a SKU the admin typed', async () => {
    const suggestSku = vi.fn().mockResolvedValue({ ok: true, sku: 'BRK-PAD-00042' });
    renderDrawer({ suggestSku });

    fireEvent.change(skuInput(), { target: { value: 'BRK-PAD-00500' } });
    pickCategory('pads');

    await waitFor(() => expect(suggestSku).toHaveBeenCalled());
    expect(skuInput()).toHaveValue('BRK-PAD-00500');
  });

  it('replaces its own earlier suggestion when the category changes', async () => {
    const suggestSku = vi.fn()
      .mockResolvedValueOnce({ ok: true, sku: 'BRK-PAD-00042' })
      .mockResolvedValueOnce({ ok: true, sku: 'BRA-SYS-00001' });
    renderDrawer({ suggestSku });

    pickCategory('pads');
    await waitFor(() => expect(skuInput()).toHaveValue('BRK-PAD-00042'));
    pickCategory('brakes');

    await waitFor(() => expect(skuInput()).toHaveValue('BRA-SYS-00001'));
  });

  it('shows a format error for a typed SKU that is not CAT-PRT-#####', async () => {
    renderDrawer();

    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Brake Pad Set' } });
    fireEvent.change(skuInput(), { target: { value: '1231' } });
    fireEvent.change(screen.getByLabelText(/oem no/i), { target: { value: '1-87610' } });
    pickCategory('pads');
    fireEvent.click(screen.getByRole('button', { name: /next|continue/i }));

    expect(await screen.findByText(/CAT-PRT-#####/)).toBeInTheDocument();
  });
});

describe('AddPartDrawer publish and category defaults', () => {
  const categoriesList = [
    { id: 'brakes', name: 'Braking Systems', parentCategory: null },
    { id: 'pads', name: 'Brake Pads/Linings', parentCategory: { id: 'brakes' } }
  ];

  const fillToStepThree = () => {
    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Brake Pad Set' } });
    fireEvent.change(screen.getByLabelText(/oem no/i), { target: { value: '1-87610' } });
    fireEvent.change(screen.getByLabelText('-- Select Category --'), { target: { value: 'pads' } });
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1200' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '4' } });
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '2' } });
  };

  it('starts with no category chosen and requires one', async () => {
    render(<AddPartDrawer isOpen onClose={vi.fn()} onAddPart={vi.fn()} categoriesList={categoriesList} parts={[]} />);

    expect(screen.getByLabelText('-- Select Category --')).toHaveValue('');
    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Brake Pad Set' } });
    fireEvent.change(screen.getByLabelText(/oem no/i), { target: { value: '1-87610' } });
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));

    expect(await screen.findByText(/category selection is required/i)).toBeInTheDocument();
  });

  it('saves new parts unpublished unless the admin turns publishing on', async () => {
    const onAddPart = vi.fn().mockResolvedValue({ ok: true });
    render(<AddPartDrawer isOpen onClose={vi.fn()} onAddPart={onAddPart} categoriesList={categoriesList} parts={[]} />);

    fillToStepThree();
    const publishSwitch = screen.getByRole('switch', { name: /publish to storefront/i });
    expect(publishSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('button', { name: /save part/i }));
    await waitFor(() => expect(onAddPart).toHaveBeenCalledTimes(1));
    expect(onAddPart.mock.calls[0][0]).toMatchObject({ published: false, category_id: 'pads' });
  });

  it('sends published: true when the admin switches publishing on', async () => {
    const onAddPart = vi.fn().mockResolvedValue({ ok: true });
    render(<AddPartDrawer isOpen onClose={vi.fn()} onAddPart={onAddPart} categoriesList={categoriesList} parts={[]} />);

    fillToStepThree();
    const publishSwitch = screen.getByRole('switch', { name: /publish to storefront/i });
    fireEvent.click(publishSwitch);
    expect(publishSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: /save part/i }));
    await waitFor(() => expect(onAddPart).toHaveBeenCalledTimes(1));
    expect(onAddPart.mock.calls[0][0]).toMatchObject({ published: true });
  });
});

describe('AddPartDrawer pricing step', () => {
  const categoriesList = [{ id: 'pads', name: 'Brake Pads/Linings', parentCategory: null }];

  const goToStepThree = () => {
    render(<AddPartDrawer isOpen onClose={vi.fn()} onAddPart={vi.fn()} categoriesList={categoriesList} parts={[]} />);
    fireEvent.change(screen.getByLabelText(/part name/i), { target: { value: 'Brake Pad Set' } });
    fireEvent.change(screen.getByLabelText(/oem no/i), { target: { value: '1-87610' } });
    fireEvent.change(screen.getByLabelText('-- Select Category --'), { target: { value: 'pads' } });
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
  };

  it('labels the price input as Cost, never Retail Price', () => {
    goToStepThree();

    expect(screen.getByLabelText('Cost (₱) *')).toHaveAttribute('type', 'number');
    expect(screen.queryByText(/retail price/i)).not.toBeInTheDocument();
  });

  it('previews the selling price at the global markup and follows the typed cost', () => {
    goToStepThree();

    expect(screen.getByText('Sells at ₱0.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cost (₱) *'), { target: { value: '100' } });
    expect(screen.getByText('Sells at ₱120.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Cost (₱) *')).toHaveAccessibleDescription('Sells at ₱120.00');
  });

  it('uses the markup override in the preview, and falls back to global when cleared', () => {
    goToStepThree();

    fireEvent.change(screen.getByLabelText('Cost (₱) *'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/markup override/i), { target: { value: '50' } });
    expect(screen.getByText('Sells at ₱150.00')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/markup override/i), { target: { value: '' } });
    expect(screen.getByText('Sells at ₱120.00')).toBeInTheDocument();
  });

  it('associates every step-3 label with its input', () => {
    goToStepThree();

    expect(screen.getByLabelText('Cost (₱) *')).toBeInTheDocument();
    expect(screen.getByLabelText(/initial stock/i)).toHaveAttribute('placeholder', '0');
    expect(screen.getByLabelText(/min stock alert/i)).toHaveAttribute('placeholder', '5');
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../authStore', () => ({
  fetchCategoriesList: vi.fn().mockResolvedValue([]),
  fetchNextSku: vi.fn().mockResolvedValue({ ok: false })
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
    },
    formatBaseCurrency: (value) => `₱${Number(value || 0).toFixed(2)}`
  })
}));

vi.mock('../CompatibilityFilter', () => ({ default: () => null }));
vi.mock('../AddPartDrawer', () => ({ default: () => null }));

const PartsCatalog = (await import('../PartsCatalog')).default;

const part = {
  id: 'p1', name: 'Brake Pad', sku: 'BRK-PAD-00001', oem: 'OEM-1', category: 'Brakes', category_id: 'brakes',
  price: 100, markupOverride: null, stock: 4, minStock: 2, compatibleWith: [], published: true
};

const renderCatalog = () => render(
  <PartsCatalog
    parts={[part]}
    categories={['Brakes']}
    selectedCategory="All"
    setSelectedCategory={vi.fn()}
    onAddPart={vi.fn()}
    onEditPart={vi.fn()}
    onDeletePart={vi.fn()}
    onRestockPart={vi.fn()}
    setPage={vi.fn()}
    onFetchPartAdjustments={vi.fn()}
    onFetchGlobalAuditLogs={vi.fn()}
  />
);

describe('PartsCatalog pricing labels', () => {
  it('heads the inventory price column "Selling price" since it shows the marked-up price', () => {
    renderCatalog();

    expect(screen.getByRole('columnheader', { name: /selling price/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /unit price/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('₱120.00').length).toBeGreaterThan(0);
  });

  it('labels the edit price input as Cost with a live sells-at preview', () => {
    renderCatalog();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const costInput = screen.getByLabelText('Cost (₱) *');
    expect(costInput).toHaveValue(100);
    expect(screen.getByText('Sells at ₱120.00')).toBeInTheDocument();

    fireEvent.change(costInput, { target: { value: '200' } });
    expect(screen.getByText('Sells at ₱240.00')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/markup override/i), { target: { value: '50' } });
    expect(screen.getByText('Sells at ₱300.00')).toBeInTheDocument();
  });
});

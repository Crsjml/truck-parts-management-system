import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCategoriesList = vi.fn();

vi.mock('../../authStore', () => ({
  fetchCategoriesList: (...args) => fetchCategoriesList(...args)
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: () => ({
    formatCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`,
    formatBaseCurrency: (value) => `₱${Number(value).toLocaleString('en-US')}`
  })
}));

vi.mock('../CompatibilityFilter', () => ({
  default: () => null
}));

vi.mock('../AddPartDrawer', () => ({
  default: () => null
}));

vi.mock('../PartCard', () => ({
  default: () => null
}));

vi.mock('../ui/ToggleChip', () => ({
  default: ({ active, onClick, children }) => (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}));

const PartsCatalog = (await import('../PartsCatalog')).default;

const parts = [
  {
    id: 'part-1',
    name: 'Starter Motor',
    sku: 'SKU-1',
    oem: 'OEM-1',
    category: 'Engine',
    category_id: 'engine',
    price: 1000,
    stock: 4,
    minStock: 3,
    compatibleWith: [{ brand: 'Isuzu', series: 'ELF NPR', year: '' }]
  }
];

describe('Edit part form', () => {
  beforeEach(() => {
    fetchCategoriesList.mockReset();
    fetchCategoriesList.mockResolvedValue([]);
  });

  it('does not show an unreachable stock-change branch in edit mode', () => {
    render(
      <PartsCatalog
        parts={parts}
        categories={['Engine']}
        selectedCategory="All"
        setSelectedCategory={vi.fn()}
        onAddPart={vi.fn()}
        onEditPart={vi.fn().mockResolvedValue({ ok: true })}
        onDeletePart={vi.fn()}
        onRestockPart={vi.fn()}
        setPage={vi.fn()}
        onFetchPartAdjustments={vi.fn()}
        onFetchGlobalAuditLogs={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit part/i }));

    expect(screen.queryByLabelText(/reason for stock adjustment/i)).not.toBeInTheDocument();
  });
});

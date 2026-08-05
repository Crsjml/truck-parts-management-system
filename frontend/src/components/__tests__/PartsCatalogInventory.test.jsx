import { render, screen } from '@testing-library/react';
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

vi.mock('../PartTableRow', () => ({
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

const categories = ['Engine', 'Brakes'];

describe('PartsCatalog inventory defaults', () => {
  beforeEach(() => {
    fetchCategoriesList.mockReset();
    fetchCategoriesList.mockResolvedValue([]);
  });

  it('defaults to the list view and keeps primary inventory actions visible', async () => {
    render(
      <PartsCatalog
        parts={[]}
        categories={categories}
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

    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /add new part/i })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /low stock only/i })).toBeVisible();
  });
});

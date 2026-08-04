import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCategoriesList = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();
const deleteCategory = vi.fn();

vi.mock('../../authStore', () => ({
  fetchCategoriesList: (...args) => fetchCategoriesList(...args),
  createCategory: (...args) => createCategory(...args),
  updateCategory: (...args) => updateCategory(...args),
  deleteCategory: (...args) => deleteCategory(...args)
}));

const CategoryManagement = (await import('../CategoryManagement')).default;

const categories = [
  {
    id: 'engine',
    name: 'Engine & Powertrain',
    iconName: 'Engine',
    colorTheme: 'blue',
    parentCategoryId: null,
    parentCategory: null
  },
  {
    id: 'filters',
    name: 'Filters',
    iconName: 'Funnel',
    colorTheme: 'emerald',
    parentCategoryId: 'engine',
    parentCategory: { id: 'engine', name: 'Engine & Powertrain', iconName: 'Engine', colorTheme: 'blue' }
  },
  {
    id: 'brakes',
    name: 'Brakes',
    iconName: 'Disc',
    colorTheme: 'red',
    parentCategoryId: null,
    parentCategory: null
  }
];

describe('CategoryManagement', () => {
  beforeEach(() => {
    fetchCategoriesList.mockReset();
    createCategory.mockReset();
    updateCategory.mockReset();
    deleteCategory.mockReset();
    fetchCategoriesList.mockResolvedValue(categories);
    createCategory.mockResolvedValue({ ok: true, category: { id: 'new-cat', name: 'Cooling' } });
    updateCategory.mockResolvedValue({ ok: true, category: categories[0] });
    deleteCategory.mockResolvedValue({ ok: true });
  });

  it('renders hierarchy mode by default and lets staff select a main category with buttons', async () => {
    render(<CategoryManagement />);

    const hierarchyMode = await screen.findByRole('button', { name: /hierarchy/i });
    const flatMode = screen.getByRole('button', { name: /flat list/i });
    expect(hierarchyMode).toHaveAttribute('aria-pressed', 'true');
    expect(flatMode).toHaveAttribute('aria-pressed', 'false');

    const brakesButton = screen.getByRole('button', { name: /brakes.*0 subcategories/i });
    fireEvent.click(brakesButton);

    expect(await screen.findByRole('heading', { name: /^brakes$/i })).toBeInTheDocument();
    expect(screen.getByText(/0 subcategories under this group/i)).toBeInTheDocument();
  });

  it('opens an accessible category dialog and focuses the category name input', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));

    const dialog = await screen.findByRole('dialog', { name: /create new category/i });
    const nameInput = within(dialog).getByLabelText(/category name/i);
    await waitFor(() => expect(nameInput).toHaveFocus());
  });

  it('shows inline validation when category name is empty', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));
    const dialog = await screen.findByRole('dialog', { name: /create new category/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /add category$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/category name is required/i);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it('shows an error before saving when the category name already exists', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));
    const dialog = await screen.findByRole('dialog', { name: /create new category/i });
    fireEvent.change(within(dialog).getByLabelText(/category name/i), {
      target: { value: 'Engine & Powertrain' }
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /add category$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it('uses an in-app delete confirmation instead of deleting immediately', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /delete engine & powertrain/i }));

    const dialog = await screen.findByRole('dialog', { name: /delete category/i });
    expect(within(dialog).getByText(/engine & powertrain/i)).toBeInTheDocument();
    expect(deleteCategory).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^delete category$/i }));

    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('engine'));
  });

  it('keeps appearance controls optional but accessible', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));
    const appearanceToggle = screen.getByRole('button', { name: /appearance overrides/i });
    expect(appearanceToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(appearanceToggle);

    expect(appearanceToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /use blue category color/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use wrench icon/i })).toBeInTheDocument();
  });
});

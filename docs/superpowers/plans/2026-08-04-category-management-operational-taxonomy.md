# Category Management Operational Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin Category Management page into a flatter, safer, more accessible operational taxonomy console while preserving existing category CRUD behavior.

**Architecture:** Keep the implementation in `CategoryManagement.jsx` for this pass, because the existing page is a single component and the requested restructure is medium-sized rather than a rewrite. Add focused tests in a new `CategoryManagement.test.jsx` file that mock `authStore` CRUD functions and assert the critique-driven behaviors before each implementation slice.

**Tech Stack:** React, Vite, Vitest, Testing Library, Happy DOM, Phosphor Icons, Tailwind CSS utility classes, existing `authStore` API barrel.

## Global Constraints

- Target file is `frontend/src/components/CategoryManagement.jsx`.
- Test file is `frontend/src/components/__tests__/CategoryManagement.test.jsx`.
- Keep existing API calls: `fetchCategoriesList`, `createCategory`, `updateCategory`, and `deleteCategory`.
- Do not add backend requirements or invent linked-part counts that are not currently available in the component.
- Do not change category API payload shapes.
- Preserve hierarchy mode, flat-list mode, create, edit, delete, icon, color, and parent-category functionality.
- Remove the detector-reported `border-l-4` side-tab accent from the admin page.
- The final Impeccable detector run on `frontend/src/components/CategoryManagement.jsx` must not report `side-tab`.

---

## File Structure

- Modify `frontend/src/components/CategoryManagement.jsx`
  - Owns the category management UI, state, category CRUD calls, modal, delete confirmation, and taxonomy-health presentation.
  - Add state: `deleteTarget`, `isAppearanceOpen`, `nameInputRef`.
  - Replace native delete confirmation with an in-app confirmation flow.
  - Convert clickable non-semantic controls to semantic buttons and add modal/form accessibility.

- Create `frontend/src/components/__tests__/CategoryManagement.test.jsx`
  - Mocks `../../authStore`.
  - Verifies hierarchy selection, mode state, accessible dialog behavior, appearance override controls, delete confirmation, and accessible names.

No shared component extraction is planned. If implementation becomes unwieldy, stop after Task 4 and ask whether to split the modal into a child component; do not split opportunistically.

---

### Task 1: Add Baseline Tests for Category Management Semantics

**Subagent execution guard:** Dispatch Task 1 together with Task 2 as the first implementation batch. The worker should create these tests, confirm the expected red state if useful, implement the semantic foundation from Task 2, then commit the passing tests and implementation together. Do not commit an intentionally failing test state by itself.

**Files:**
- Create: `frontend/src/components/__tests__/CategoryManagement.test.jsx`
- Modify: none
- Test: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes: `CategoryManagement` default export from `../CategoryManagement`.
- Consumes mocked functions: `fetchCategoriesList`, `createCategory`, `updateCategory`, `deleteCategory`.
- Produces test fixtures and assertions later tasks extend.

- [ ] **Step 1: Write the failing test file**

Create `frontend/src/components/__tests__/CategoryManagement.test.jsx` with this content:

```jsx
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
    expect(screen.getByText(/0 subcategories/i)).toBeInTheDocument();
  });

  it('opens an accessible category dialog and focuses the category name input', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));

    const dialog = await screen.findByRole('dialog', { name: /create new category/i });
    const nameInput = within(dialog).getByLabelText(/category name/i);
    expect(nameInput).toHaveFocus();
  });

  it('shows inline validation when category name is empty', async () => {
    render(<CategoryManagement />);

    fireEvent.click(await screen.findByRole('button', { name: /add category/i }));
    fireEvent.click(screen.getByRole('button', { name: /add category$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/category name is required/i);
    expect(createCategory).not.toHaveBeenCalled();
  });

  it('gives icon-only actions accessible names', async () => {
    render(<CategoryManagement />);

    expect(await screen.findByRole('button', { name: /edit engine & powertrain/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete engine & powertrain/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: FAIL because category rows are clickable `div` elements, mode buttons do not expose selected state, modal lacks dialog semantics/focus behavior, and icon-only actions lack accessible names.

- [ ] **Step 3: Leave this test-only slice uncommitted until Task 2 passes**

Do not create a standalone commit for the red test state. The first execution batch should commit the tests together with the Task 2 semantic implementation once the targeted test command passes.

---

### Task 2: Implement Semantic Controls and Accessible Modal Foundation

**Files:**
- Modify: `frontend/src/components/CategoryManagement.jsx`
- Test: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes tests from Task 1.
- Produces accessible base controls that later delete/modal tasks build on.
- Adds refs/state:
  - `const nameInputRef = useRef(null);`
  - `const modalTitleId = editId ? 'category-dialog-edit-title' : 'category-dialog-create-title';`

- [ ] **Step 1: Update imports and state**

In `CategoryManagement.jsx`, change the React import:

```jsx
import React, { useState, useEffect, useRef } from 'react';
```

Add the ref near existing form state:

```jsx
const nameInputRef = useRef(null);
```

Add focus and Escape behavior after `closeForm` is defined:

```jsx
useEffect(() => {
  if (!isFormOpen) return;
  const frame = requestAnimationFrame(() => nameInputRef.current?.focus());
  return () => cancelAnimationFrame(frame);
}, [isFormOpen]);

useEffect(() => {
  if (!isFormOpen || submitLoading) return;
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') closeForm();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isFormOpen, submitLoading]);
```

- [ ] **Step 2: Convert mode controls to selected-state buttons**

Update both mode buttons to include `type` and `aria-pressed`:

```jsx
<button
  type="button"
  onClick={() => setActiveTab('hierarchy')}
  aria-pressed={activeTab === 'hierarchy'}
  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'hierarchy' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
>
  <List weight="bold" /> Hierarchy
</button>
<button
  type="button"
  onClick={() => setActiveTab('flat')}
  aria-pressed={activeTab === 'flat'}
  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'flat' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
>
  <Table weight="bold" /> Flat List
</button>
```

- [ ] **Step 3: Convert main category rows from `div` to `button`**

Replace the clickable parent row wrapper with:

```jsx
<button
  type="button"
  key={parent.id}
  onClick={() => setSelectedParentId(parent.id)}
  aria-pressed={isSelected}
  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors border ${isSelected ? 'bg-background border-brandBlue-500/30' : 'border-transparent hover:bg-secondary/80'}`}
>
  <div className="flex items-center gap-3">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border/30 ${bg}`}>
      {CatIcon && <CatIcon className={`w-4 h-4 ${color}`} weight="duotone" />}
    </div>
    <div>
      <span className={`block text-sm font-bold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{parent.name}</span>
      <span className="text-2xs text-muted-foreground">{subCount} subcategories</span>
    </div>
  </div>
  <CaretRight className={`w-4 h-4 ${isSelected ? 'text-brandBlue-500' : 'text-muted-foreground/30'}`} weight="bold" />
</button>
```

- [ ] **Step 4: Add accessible names to icon-only buttons**

For selected parent actions:

```jsx
<button
  type="button"
  aria-label={`Edit ${selectedParent.name}`}
  onClick={() => openForm(selectedParent)}
  className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
>
  <Pencil className="w-4 h-4" />
</button>
<button
  type="button"
  aria-label={`Delete ${selectedParent.name}`}
  onClick={() => handleDelete(selectedParent.id, selectedParent.name)}
  className="p-2 hover:bg-red-950/20 rounded-lg text-muted-foreground hover:text-red-500 transition-colors border border-transparent hover:border-red-900/30"
>
  <Trash className="w-4 h-4" />
</button>
```

For subcategory and flat-list actions, use the same naming pattern:

```jsx
aria-label={`Edit ${child.name}`}
aria-label={`Delete ${child.name}`}
aria-label={`Edit ${cat.name}`}
aria-label={`Delete ${cat.name}`}
```

Keep delete buttons calling the existing `handleDelete(id, name)` handler in this task. Task 4 replaces those calls with `requestDelete(cat)`.

- [ ] **Step 5: Add dialog semantics and associated labels**

On the modal panel, add:

```jsx
role="dialog"
aria-modal="true"
aria-labelledby={editId ? 'category-dialog-edit-title' : 'category-dialog-create-title'}
```

On the modal title:

```jsx
<h3
  id={editId ? 'category-dialog-edit-title' : 'category-dialog-create-title'}
  className="text-base font-bold text-foreground font-display flex items-center gap-2"
>
  <FolderSimplePlus className="text-accent w-5 h-5" weight="duotone" />
  {editId ? 'Edit Category' : 'Create New Category'}
</h3>
```

Update the close button:

```jsx
<button
  type="button"
  aria-label="Close category dialog"
  onClick={closeForm}
  className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors"
>
  <X weight="bold" className="w-4 h-4" />
</button>
```

Associate the category name label and input:

```jsx
<label htmlFor="category-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category Name *</label>
<input
  id="category-name"
  ref={nameInputRef}
  type="text"
  required
  placeholder="e.g. Engine Components"
  value={name}
  onChange={handleNameChange}
  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 text-foreground transition-all"
/>
```

Associate the parent category label and select:

```jsx
<label htmlFor="category-parent" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent Category (Optional)</label>
<select
  id="category-parent"
  value={parentCategory}
  onChange={(e) => setParentCategory(e.target.value)}
  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 text-foreground transition-all"
>
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS for the Task 1 tests. Delete buttons still call the existing `handleDelete(id, name)` flow until Task 4.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "fix: improve category management semantics"
```

---

### Task 3: Flatten Admin Styling and Contextual Feedback

**Files:**
- Modify: `frontend/src/components/CategoryManagement.jsx`
- Modify: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes semantic controls from Task 2.
- Produces admin-flat visual styling and contextual feedback markup.

- [ ] **Step 1: Add failing tests for detector-triggering side-tab and contextual feedback**

Append to `CategoryManagement.test.jsx`:

```jsx
it('uses a flat admin header without side-tab accent styling', async () => {
  const { container } = render(<CategoryManagement />);

  await screen.findByRole('heading', { name: /category management/i });
  expect(container.querySelector('.border-l-4')).toBeNull();
});

it('shows save feedback in page context instead of a fixed floating toast', async () => {
  createCategory.mockResolvedValueOnce({ ok: true, category: { id: 'cooling', name: 'Cooling' } });
  const { container } = render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /add category/i }));
  fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Cooling' } });
  fireEvent.click(screen.getByRole('button', { name: /add category$/i }));

  expect(await screen.findByRole('status')).toHaveTextContent(/category created successfully/i);
  expect(container.querySelector('.fixed.top-24')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: FAIL because the header uses `border-l-4` and feedback is fixed.

- [ ] **Step 3: Replace floating feedback with contextual feedback**

Replace `renderFeedback` with:

```jsx
const renderFeedback = () => {
  if (errorMsg) {
    return (
      <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300 flex gap-3 items-start">
        <Warning className="shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
        <div className="leading-snug">{errorMsg}</div>
        <button type="button" aria-label="Close error message" onClick={() => setErrorMsg('')} className="ml-auto text-red-500 hover:text-red-700">
          <X />
        </button>
      </div>
    );
  }
  if (notice) {
    return (
      <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 flex gap-3 items-start">
        <CheckCircle className="shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
        <div className="leading-snug">{notice}</div>
        <button type="button" aria-label="Close success message" onClick={() => setNotice('')} className="ml-auto text-emerald-600 hover:text-emerald-800">
          <X />
        </button>
      </div>
    );
  }
  return null;
};
```

Move `{renderFeedback()}` below the header banner instead of before it:

```jsx
<div className="space-y-6 animate-fadeIn min-h-[500px]">
  {/* Header Banner */}
  ...
  {renderFeedback()}
```

- [ ] **Step 4: Flatten decorative header and selected panel styles**

Change the header wrapper from:

```jsx
<div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-brandBlue-400 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
```

to:

```jsx
<div className="rounded-2xl glass-panel p-6 md:p-8 border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
```

Remove the decorative blob:

```jsx
<div className="absolute top-0 right-0 w-96 h-96 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
```

In the selected category panel, remove the decorative blurred category blob:

```jsx
<div className={`absolute -right-10 -top-10 w-48 h-48 blur-3xl opacity-10 pointer-events-none ${getCategoryIconAndColor(...).bg}`} />
```

Remove hover lift and heavy card shadow from subcategory cards. Replace:

```jsx
className={`flex flex-col p-4 bg-background border border-border hover:border-border/80 rounded-xl group/sub transition-all hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5 hover:shadow-[inset_2px_0_0_0_currentColor] ${color}`}
```

with:

```jsx
className={`flex flex-col p-4 bg-background border border-border rounded-xl group/sub transition-colors hover:bg-secondary/40 ${color}`}
```

Make subcategory actions visible by removing `opacity-0 group-hover/sub:opacity-100`:

```jsx
<div className="flex gap-1 transition-opacity">
```

- [ ] **Step 5: Run tests and detector**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
cd ..
node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/components/CategoryManagement.jsx
```

Expected: tests PASS; detector does not report `side-tab`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "style: flatten category management admin surface"
```

---

### Task 4: Replace Native Delete Confirmation with In-App Safety Flow

**Files:**
- Modify: `frontend/src/components/CategoryManagement.jsx`
- Modify: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes existing `deleteCategory(id)` API.
- Produces:
  - `deleteTarget: Category | null`
  - `requestDelete(cat: Category): void`
  - `cancelDelete(): void`
  - `confirmDelete(): Promise<void>`

- [ ] **Step 1: Add failing delete-safety tests**

Append to `CategoryManagement.test.jsx`:

```jsx
it('opens an in-app delete confirmation with taxonomy impact copy', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /delete engine & powertrain/i }));

  const dialog = await screen.findByRole('dialog', { name: /delete engine & powertrain/i });
  expect(dialog).toHaveTextContent(/1 subcategory/i);
  expect(dialog).toHaveTextContent(/catalog filtering/i);
  expect(dialog).toHaveTextContent(/linked part count is not shown here/i);
  expect(confirmSpy).not.toHaveBeenCalled();

  confirmSpy.mockRestore();
});

it('cancels delete without calling the API', async () => {
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /delete engine & powertrain/i }));
  fireEvent.click(await screen.findByRole('button', { name: /^cancel$/i }));

  expect(deleteCategory).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog', { name: /delete engine & powertrain/i })).not.toBeInTheDocument();
});

it('confirms delete and reloads categories', async () => {
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /delete filters/i }));
  fireEvent.click(await screen.findByRole('button', { name: /delete category/i }));

  await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith('filters'));
  expect(fetchCategoriesList).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: FAIL because delete still uses native `confirm()`.

- [ ] **Step 3: Add delete state and flow**

Add state near feedback state:

```jsx
const [deleteTarget, setDeleteTarget] = useState(null);
```

Replace `handleDelete` with:

```jsx
const requestDelete = (cat) => {
  setErrorMsg('');
  setNotice('');
  setDeleteTarget(cat);
};

const cancelDelete = () => {
  if (loading) return;
  setDeleteTarget(null);
};

const confirmDelete = async () => {
  if (!deleteTarget) return;

  setLoading(true);
  const target = deleteTarget;
  const result = await deleteCategory(target.id);
  setLoading(false);

  if (!result.ok) {
    setErrorMsg(result.error || 'Category could not be deleted.');
    return;
  }

  setNotice(`Category "${target.name}" deleted successfully.`);
  setDeleteTarget(null);
  if (onAddLog) {
    onAddLog('system', `Deleted category: "${target.name}".`);
  }
  loadCategories(true);
  setTimeout(() => setNotice(''), 3000);
};
```

Update every delete button to call `requestDelete(catObject)` rather than `handleDelete(id, name)`.

- [ ] **Step 4: Render delete confirmation modal**

Add this portal near the create/edit modal portal:

```jsx
{deleteTarget && createPortal(
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
      className="w-full max-w-md rounded-2xl border border-border bg-background p-6"
    >
      <div className="flex items-start gap-3">
        <WarningCircle weight="duotone" className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
        <div>
          <h3 id="delete-category-title" className="text-lg font-bold text-foreground font-display">
            Delete {deleteTarget.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This {deleteTarget.parentCategory || deleteTarget.parentCategoryId ? 'subcategory' : 'main category'} is used for catalog organization and filtering.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        <p><span className="font-bold text-foreground">Child subcategories:</span> {getSubcategories(deleteTarget.id).length}</p>
        <p className="mt-2">Deleting categories can affect catalog filtering.</p>
        <p className="mt-2">Linked part count is not shown here.</p>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={cancelDelete}
          className="px-5 py-2.5 rounded-xl border border-border bg-secondary text-sm font-bold text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-50"
        >
          Delete Category
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "fix: add safe category delete confirmation"
```

---

### Task 5: Distill Create/Edit Modal and Add Appearance Override Controls

**Files:**
- Modify: `frontend/src/components/CategoryManagement.jsx`
- Modify: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes `manualOverride`, `iconName`, `colorTheme`, `selectIcon`, `selectColor`.
- Produces:
  - `isAppearanceOpen: boolean`
  - appearance override button with `aria-expanded`
  - color/icon picker buttons with `aria-pressed`

- [ ] **Step 1: Add failing appearance tests**

Append to `CategoryManagement.test.jsx`:

```jsx
it('keeps manual appearance controls collapsed until staff opens them', async () => {
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /add category/i }));

  expect(screen.getByText(/appearance is auto-suggested/i)).toBeInTheDocument();
  expect(screen.queryByText(/category marker/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /customize appearance/i }));

  expect(screen.getByText(/category marker/i)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { pressed: true }).length).toBeGreaterThan(0);
});

it('uses operational modal copy', async () => {
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /edit engine & powertrain/i }));

  expect(await screen.findByRole('dialog', { name: /edit category/i })).toBeInTheDocument();
  expect(screen.queryByText(/modify category/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/vibrant theme/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: FAIL because appearance controls are always visible and copy is still decorative.

- [ ] **Step 3: Add appearance state behavior**

Add state:

```jsx
const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
```

In `openForm`, set appearance open state:

```jsx
if (cat) {
  ...
  setManualOverride(true);
  setIsAppearanceOpen(false);
} else {
  ...
  setManualOverride(false);
  setIsAppearanceOpen(false);
}
```

In `closeForm`, reset:

```jsx
setIsAppearanceOpen(false);
```

- [ ] **Step 4: Restructure modal body around taxonomy first**

Keep the form, but reorder content:

1. Name and parent fields first.
2. A compact preview/status block.
3. A toggle button for appearance controls.
4. Color/icon controls only when `isAppearanceOpen` is true.

Use this toggle:

```jsx
<button
  type="button"
  onClick={() => setIsAppearanceOpen(open => !open)}
  aria-expanded={isAppearanceOpen}
  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
>
  <Palette className="h-4 w-4 text-brandBlue-500" weight="duotone" />
  Customize Appearance
</button>
```

Use this status copy near the preview:

```jsx
<p className="text-xs text-muted-foreground">
  {manualOverride ? 'Appearance is manually selected.' : 'Appearance is auto-suggested from the category name.'}
</p>
```

Change copy:

```jsx
{editId ? 'Edit Category' : 'Create New Category'}
```

Replace “Color Theme” helper title/copy with:

```jsx
<label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
  <Palette className="text-brandBlue-500 w-4 h-4" weight="duotone" /> Category Marker
</label>
<div className="text-2xs text-muted-foreground leading-relaxed">
  Choose a marker only when the auto-suggested appearance needs adjustment.
</div>
```

- [ ] **Step 5: Add selected state to picker buttons**

For color picker buttons:

```jsx
<button
  key={colorKey}
  type="button"
  onClick={() => selectColor(colorKey)}
  aria-pressed={isColorSelected}
  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isColorSelected ? `bg-secondary border-brandBlue-500/50` : 'bg-transparent border-border hover:bg-secondary/50'}`}
  title={`${colorKey} ${isUsed ? '(Already Used)' : ''}`}
>
```

For icon picker buttons:

```jsx
<button
  key={iconKey}
  type="button"
  onClick={() => selectIcon(iconKey)}
  aria-pressed={isIconSelected}
  aria-label={`Use ${iconKey} icon`}
  className={`flex flex-col items-center justify-center p-3 gap-2 rounded-xl transition-colors ${isIconSelected ? `border border-border/50 ${activeBg} ${activeColor}` : 'text-muted-foreground hover:bg-background hover:text-foreground border border-transparent'}`}
  title={iconKey}
>
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "refactor: distill category appearance controls"
```

---

### Task 6: Add Lightweight Taxonomy Health Cues and Empty-State Recovery

**Files:**
- Modify: `frontend/src/components/CategoryManagement.jsx`
- Modify: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes `topLevelCategories`, `getSubcategories`, `selectedParent`, `activeSubcategories`.
- Produces UI-only taxonomy helper copy using available category data.

- [ ] **Step 1: Add failing taxonomy-health tests**

Append to `CategoryManagement.test.jsx`:

```jsx
it('shows taxonomy health cues for the selected main category', async () => {
  render(<CategoryManagement />);

  expect(await screen.findByText(/main category/i)).toBeInTheDocument();
  expect(screen.getByText(/shown in catalog filters/i)).toBeInTheDocument();
  expect(screen.getByText(/1 subcategory/i)).toBeInTheDocument();
});

it('explains flat-list empty search recovery', async () => {
  render(<CategoryManagement />);

  fireEvent.click(await screen.findByRole('button', { name: /flat list/i }));
  fireEvent.change(screen.getByPlaceholderText(/search categories/i), { target: { value: 'zzzz' } });

  expect(screen.getByText(/no matching categories/i)).toBeInTheDocument();
  expect(screen.getByText(/change or clear the search/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: FAIL because helper copy is not present.

- [ ] **Step 3: Add selected panel health cue**

In selected parent detail header, below the title/subcategory count, add:

```jsx
<div className="mt-2 flex flex-wrap items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
  <span className="rounded-md border border-brandBlue-500/20 bg-brandBlue-500/10 px-2 py-0.5 text-brandBlue-500">
    Main category
  </span>
  <span>{activeSubcategories.length} {activeSubcategories.length === 1 ? 'subcategory' : 'subcategories'}</span>
  <span>Shown in catalog filters</span>
</div>
```

For subcategory flat rows, keep existing `MAIN` / `SUB` badges.

- [ ] **Step 4: Improve empty states**

No main categories:

```jsx
<div className="p-4 text-center text-xs text-muted-foreground">
  No main categories yet. Use Add Category to create the first catalog group.
</div>
```

No subcategories:

```jsx
<p className="text-xs text-muted-foreground">Add a subcategory under {selectedParent.name} when parts need a narrower catalog filter.</p>
```

No flat-list search result:

```jsx
<tr>
  <td colSpan="4" className="text-center py-8 text-muted-foreground text-xs">
    No matching categories. Change or clear the search.
  </td>
</tr>
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "feat: show category taxonomy health cues"
```

---

### Task 7: Final Verification and Impeccable Detector

**Files:**
- Modify: none unless verification exposes issues.
- Test: `frontend/src/components/__tests__/CategoryManagement.test.jsx`

**Interfaces:**
- Consumes completed implementation from Tasks 1-6.
- Produces verified, buildable feature with clean detector output for this target.

- [ ] **Step 1: Run targeted test**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS.

- [ ] **Step 2: Run nearby/admin-relevant tests**

Run:

```bash
cd frontend
npm test -- src/components/__tests__/StaffManagement.test.jsx src/components/__tests__/StaffRoster.test.jsx src/components/__tests__/CategoryManagement.test.jsx
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS. Existing Vite chunk-size warnings may remain; do not treat them as failures unless a new error appears.

- [ ] **Step 4: Run Impeccable detector**

Run:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json frontend/src/components/CategoryManagement.jsx
```

Expected:

```json
[]
```

or at minimum no `side-tab` finding. If detector returns any finding, fix it before continuing.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git diff -- frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
```

Expected: diff only contains Category Management implementation and tests. No unrelated file changes.

- [ ] **Step 6: Commit final verification adjustments if any**

If Step 4 or Step 5 required fixes:

```bash
git add frontend/src/components/CategoryManagement.jsx frontend/src/components/__tests__/CategoryManagement.test.jsx
git commit -m "fix: verify category management polish"
```

If no fixes were required, do not create an empty commit.

---

## Self-Review

**Spec coverage:** This plan covers all requirements from `docs/superpowers/specs/2026-08-04-category-management-operational-taxonomy-design.md`: flat admin styling, semantic accessibility, safe delete flow, modal distillation, taxonomy-health cues, frontend-only scope, tests, build, and Impeccable detector verification.

**Placeholder scan:** No task contains `TBD`, `TODO`, “implement later,” “similar to,” or unspecified validation/error handling. Each task includes concrete code snippets, commands, and expected results.

**Type consistency:** State and function names are consistent across tasks: `deleteTarget`, `requestDelete`, `cancelDelete`, `confirmDelete`, `isAppearanceOpen`, and `nameInputRef`.

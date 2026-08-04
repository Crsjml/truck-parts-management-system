# Category Management Operational Taxonomy Design

## Purpose

Improve the admin Category Management page using the Impeccable critique findings. The page should feel like a flat, fast shop-operations tool for maintaining catalog taxonomy, not a decorative category-branding screen.

## Scope

This design targets `frontend/src/components/CategoryManagement.jsx` and its existing behavior:

- Keep hierarchy and flat-list modes.
- Keep category create, edit, delete, icon, color, and parent-category functionality.
- Keep existing API calls: `fetchCategoriesList`, `createCategory`, `updateCategory`, and `deleteCategory`.
- Do not add backend requirements or invent linked-part counts that are not currently available in the component.
- Address all critique issues at a medium restructure level.

## Design Direction

Use the **Operational Taxonomy Console** approach.

The page keeps its current two-pane hierarchy as the primary workflow, but becomes calmer, safer, and more semantic. Staff should be able to answer: “What category am I editing, what depends on it, and what will happen if I change or delete it?”

## Visual and Layout Requirements

- Remove admin-inappropriate decoration:
  - No thick `border-l-4` side-tab accent on the header.
  - No decorative blurred color blob in the header or selected-category panel.
  - No hover lift on subcategory cards.
  - No heavy shadows or storefront-like glow treatments.
- Use the admin tier style:
  - Hairline borders.
  - Muted background fills.
  - Clear active states.
  - Dense but readable spacing.
- Keep the existing hierarchy layout:
  - Left pane: main category list.
  - Right pane: selected category detail and subcategories.
  - Flat list remains available for audit/search.
- Make row and card actions visible without hover-only dependency.
- Replace loud floating success/error feedback with calmer, contextual feedback near the page header or active area.

## Accessibility and Semantics Requirements

- Main category rows must be semantic buttons, not clickable `div` elements.
- Hierarchy and flat-list mode controls must expose selected state with `aria-pressed` or tab semantics.
- Icon-only buttons must have explicit `aria-label` values:
  - Edit category.
  - Delete category.
  - Close notice.
  - Close modal.
- The create/edit modal must expose:
  - `role="dialog"`.
  - `aria-modal="true"`.
  - A stable title id via `aria-labelledby`.
  - Escape-to-close behavior when not submitting.
  - Initial focus on the category name field.
- Form labels must be associated with controls using `htmlFor` and `id`.
- Color and icon picker buttons must expose selected state with `aria-pressed`.
- Loading and feedback copy should use `role="status"` or `role="alert"` as appropriate.

## Delete Safety Requirements

Replace native `confirm()` with an in-app delete confirmation state.

The confirmation must show:

- Category name.
- Whether the target is a main category or subcategory.
- Number of child subcategories for main categories.
- A plain warning that deleting categories can affect catalog filtering.
- Cancel and confirm actions.

The confirmation must not claim linked-part counts unless the component already has that data. If linked-part count is unavailable, say: “Linked part count is not shown here.”

## Create/Edit Modal Requirements

Restructure the modal so taxonomy correctness comes first:

- Primary section:
  - Category name.
  - Parent category.
  - Save/cancel actions.
- Secondary section:
  - Appearance preview.
  - Auto-suggest status.
  - Collapsible manual appearance controls for color and icon.
- Default state:
  - Manual appearance controls are collapsed unless editing an existing category with manually stored appearance or the user opens the section.
  - Auto-suggest remains active until the user manually selects a color or icon.
- Copy should be operational:
  - Use “Edit Category,” not “Modify Category.”
  - Use “Category marker,” not “vibrant theme.”

## Taxonomy Health Requirements

Add lightweight health cues using only available category data:

- Main category row shows subcategory count.
- Selected category panel shows:
  - Main/subcategory type.
  - Subcategory count.
  - “Shown in catalog filters” helper copy for main categories.
- Empty states should explain the recovery action:
  - No main categories: prompt to add a main category.
  - No subcategories: prompt to add a subcategory under the selected category.
  - No flat-list search results: prompt to clear or change search.

## State and Data Flow

Keep current component state, with targeted additions:

- `deleteTarget`: category object selected for delete confirmation, or `null`.
- `isAppearanceOpen`: controls whether manual color/icon controls are expanded.
- `nameInputRef`: focuses the category name field when the modal opens.

Existing actions remain:

- `openForm(cat, parentId)`: initializes form state.
- `closeForm()`: closes form and clears form state.
- `handleFormSubmit(event)`: validates and calls create/update API.
- `handleDelete(id, name)`: should be replaced by a delete request flow:
  - `requestDelete(cat)`: opens confirmation.
  - `confirmDelete()`: calls `deleteCategory(deleteTarget.id)`.
  - `cancelDelete()`: clears `deleteTarget`.

## Error Handling

- Required name validation stays inline in the modal.
- API failures should show a clear alert message naming the action:
  - “Category could not be saved.”
  - “Category could not be deleted.”
- Delete confirmation should stay open if delete fails, so staff can retry or cancel.
- Submit buttons should remain disabled while their matching API request is pending.

## Testing Requirements

Add or update tests for `CategoryManagement` behavior:

- Renders hierarchy mode by default.
- Main category rows are buttons and update selected category.
- Mode buttons expose selected state.
- Add category opens an accessible dialog and focuses the name input.
- Empty category name shows inline validation.
- Manual appearance section can expand and exposes `aria-pressed` selected color/icon buttons.
- Delete action opens an in-app confirmation instead of calling native `confirm`.
- Delete confirmation shows subcategory count and catalog filtering warning.
- Confirm delete calls `deleteCategory`; cancel delete does not.
- Icon-only actions have accessible names.

Run verification:

- Targeted Category Management tests.
- Existing storefront/admin tests that are affected by shared category behavior, if any.
- `npm run build`.
- Impeccable detector on `frontend/src/components/CategoryManagement.jsx`.

## Non-Goals

- Do not add backend part-count queries.
- Do not redesign the entire admin navigation.
- Do not split `CategoryManagement.jsx` unless required for testability during implementation.
- Do not add drag-and-drop reordering.
- Do not change category API payload shapes.

## Success Criteria

- The page feels calmer and closer to the admin/POS tier.
- Staff can identify category hierarchy, type, and delete impact without guessing.
- Keyboard and assistive-tech users can operate the page controls.
- Category creation prioritizes name and parent before appearance.
- Detector no longer reports the `side-tab` warning.

import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

test('admin inventory stays list-first and the forms are reachable', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  const adminPage = new AdminPage(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('button.fixed.bottom-24.right-8').first().click();
  await page.getByRole('button', { name: /Auto-Login \(Admin\)/i }).click();

  await adminPage.openInventory();

  await expect(page.getByRole('button', { name: /list/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /add new part/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /create po for/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /adjust stock count/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /edit part/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /add new part/i }).click();
  const addPartDialog = page.getByRole('dialog', { name: /add new part/i });
  await expect(addPartDialog).toBeVisible();

  const templateSelect = addPartDialog.locator('.react-select__control').first();
  await templateSelect.scrollIntoViewIfNeeded();
  await templateSelect.click();
  await page.locator('.react-select__option').first().click();
  await addPartDialog.getByRole('button', { name: /apply template/i }).click();

  await templateSelect.scrollIntoViewIfNeeded();
  await templateSelect.click();
  await page.locator('.react-select__option').nth(1).click();
  await addPartDialog.getByRole('button', { name: /apply template/i }).click();
  const applyTemplateDialog = page.getByRole('dialog', { name: /apply template/i });
  await expect(applyTemplateDialog).toBeVisible();
  await applyTemplateDialog.getByRole('button', { name: /apply template/i }).click();

  await addPartDialog.getByLabel(/part name/i).fill('Scratch Test Part');
  await page.getByRole('button', { name: /close add part drawer/i }).click({ force: true });
  await expect(page.getByRole('dialog', { name: /discard unsaved changes/i })).toBeVisible();
  await page.getByRole('button', { name: /discard/i }).click({ force: true });
  await expect(page.getByRole('dialog', { name: /add new part/i })).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});

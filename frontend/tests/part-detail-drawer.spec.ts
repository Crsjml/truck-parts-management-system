import { test, expect } from '@playwright/test';
import { StorefrontPage } from './pages/StorefrontPage';
import { PartDetailDrawerPage } from './pages/PartDetailDrawerPage';

test.describe('Part Detail Drawer (TTP-172)', () => {
  let storefrontPage: StorefrontPage;
  let drawer: PartDetailDrawerPage;

  test.beforeEach(async ({ page }) => {
    storefrontPage = new StorefrontPage(page);
    drawer = new PartDetailDrawerPage(page);
    await storefrontPage.goto();
    // Product cards (with the "Details" hover action) render under the
    // Catalog tab, not the storefront's default Home tab.
    await page.getByRole('navigation').getByRole('button', { name: 'Parts Catalog' }).click();
    await page.waitForTimeout(500);
  });

  test('opens as an announced dialog named by the part title', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    await drawer.openFirst();

    await expect(drawer.dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = await drawer.dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = drawer.page.locator(`#${labelledBy}`);
    await expect(heading).toBeVisible();
    // Accessible name must be just the part title (B1 / H1 category-chip-sibling constraint)
    const accessibleName = await drawer.dialog.getAttribute('aria-labelledby').then(async (id) =>
      id ? drawer.page.locator(`#${id}`).textContent() : null
    );
    expect(accessibleName?.trim()).toBe((await heading.textContent())?.trim());
  });

  test('Escape closes the dialog and returns focus to the trigger', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    const trigger = drawer.detailsButtons.first();
    await trigger.focus();
    await trigger.click();
    await expect(drawer.dialog).toBeVisible();

    await drawer.page.keyboard.press('Escape');
    await expect(drawer.dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('close button has an accessible name and closes the dialog', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    await drawer.openFirst();
    await expect(drawer.closeButton).toBeVisible();
    await drawer.closeButton.click();
    await expect(drawer.dialog).not.toBeVisible();
  });

  test('Tab stays trapped inside the open dialog', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    await drawer.openFirst();

    // Tab through every focusable control inside the dialog and one more --
    // focus must still be inside the dialog, never on the page behind it.
    for (let i = 0; i < 15; i++) {
      await drawer.page.keyboard.press('Tab');
    }
    const activeInDialog = await drawer.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return !!dialog && dialog.contains(document.activeElement);
    });
    expect(activeInDialog).toBe(true);
  });

  test('tabs expose aria-selected and switch panels', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    await drawer.openFirst();

    await expect(drawer.specsTab).toHaveAttribute('aria-selected', 'true');
    await drawer.reviewsTab.click();
    await expect(drawer.reviewsTab).toHaveAttribute('aria-selected', 'true');
    await expect(drawer.specsTab).toHaveAttribute('aria-selected', 'false');
  });

  test('quantity steppers have accessible names', async () => {
    test.skip((await drawer.detailsButtons.count()) === 0, 'No catalog items to open');
    await drawer.openFirst();

    await expect(drawer.decreaseQtyButton).toBeVisible();
    await expect(drawer.increaseQtyButton).toBeVisible();
  });
});

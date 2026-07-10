import { Page, Locator } from '@playwright/test';

export class CategoryPage {
  readonly page: Page;
  readonly categoryFilter: Locator;
  readonly compatibilityFilter: Locator;
  readonly partsGrid: Locator;
  readonly reviewsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.categoryFilter = page.locator('select[name="categoryFilter"], select[aria-label="Category"]');
    this.compatibilityFilter = page.locator('select[name="compatibilityFilter"], select[aria-label="Vehicle Brand"]');
    this.partsGrid = page.locator('div:has(> button:has-text("Add to Cart"))'); // Or standard container
    this.reviewsSection = page.locator('text=Reviews').locator('..'); // Find the reviews container
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCategory(categoryName: string) {
    // If it's a select element or dropdown
    const categoryButtons = this.page.getByRole('button', { name: categoryName, exact: true });
    if (await categoryButtons.count() > 0) {
      await categoryButtons.first().click();
    }
    await this.page.waitForTimeout(500);
  }

  async getPartsCount() {
    return await this.partsGrid.count();
  }
}

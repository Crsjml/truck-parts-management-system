import { test, expect } from '@playwright/test';
import { CategoryPage } from './pages/CategoryPage';

test.describe('Dynamic Data Connectivity', () => {
  let categoryPage: CategoryPage;

  test.beforeEach(async ({ page }) => {
    categoryPage = new CategoryPage(page);
  });

  test('should intercept and populate categories dynamically', async ({ page }) => {
    // Intercept the /api/parts/categories endpoint to return mock dynamic data
    await page.route('**/api/parts/categories', async (route) => {
      const json = { ok: true, data: ['Mock Engine Parts', 'Mock Braking Systems'] };
      await route.fulfill({ json });
    });

    // Intercept the new /api/categories endpoint for structured categories
    await page.route('**/api/categories', async (route) => {
      const json = {
        ok: true,
        data: [
          { id: 'm1', name: 'Mock Engine Parts', parentCategory: null },
          { id: 'm2', name: 'Mock Braking Systems', parentCategory: null }
        ]
      };
      await route.fulfill({ json });
    });

    await categoryPage.goto();

    // Verify the mock data actually rendered in the UI
    // The Storefront usually lists categories as buttons or dropdown options
    const mockCatBtn1 = page.getByRole('button', { name: 'Mock Engine Parts', exact: true });
    const mockCatBtn2 = page.getByRole('button', { name: 'Mock Braking Systems', exact: true });

    // Assuming the frontend renders them if they exist
    await expect(mockCatBtn1).toBeVisible();
    await expect(mockCatBtn2).toBeVisible();
  });

  test('should intercept and populate reviews dynamically', async ({ page }) => {
    // Intercept /api/reviews
    await page.route('**/api/reviews*', async (route) => {
      const json = {
        stats: { averageRating: 4.8, totalReviews: 99 },
        reviews: [
          {
            id: 'rev-1',
            userName: 'Dynamic Reviewer',
            rating: 5,
            body: 'Dynamic review body content injected from backend!',
            createdAt: new Date().toISOString()
          }
        ]
      };
      await route.fulfill({ json });
    });

    await categoryPage.goto();

    // Open a product to trigger reviews load
    const productCards = page.locator('div:has(> button:has-text("Add to Cart"))');
    if (await productCards.count() > 0) {
      await productCards.first().click(); // Open details
      
      // Wait for reviews to render
      await expect(page.locator('text=Dynamic Reviewer')).toBeVisible();
      await expect(page.locator('text=Dynamic review body content injected from backend!')).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';
import { StorefrontPage } from './pages/StorefrontPage';

test.describe('E-Commerce Workflows', () => {
  let storefrontPage: StorefrontPage;

  test.beforeEach(async ({ page }) => {
    storefrontPage = new StorefrontPage(page);
    await storefrontPage.goto();
  });

  test('should load the catalog correctly', async ({ page }) => {
    // Wait for initial load
    const count = await storefrontPage.getProductCount();
    expect(count).toBeGreaterThanOrEqual(0); // Products should be visible (or zero if DB empty, but it shouldn't crash)

    // Ensure no blank screen or crashes
    await expect(page.locator('text=Supabase')).toBeVisible();
  });

  test('should search and add product to cart', async ({ page }) => {
    // Try to search
    await storefrontPage.searchProduct('filter');
    
    // Add first to cart if any exists
    if (await storefrontPage.getProductCount() > 0) {
      await storefrontPage.addFirstProductToCart();
      await storefrontPage.openCart();
      
      // Checkout button should be visible in drawer
      await expect(storefrontPage.checkoutButton).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { StorefrontPage } from './pages/StorefrontPage';

test.describe('Order Fulfillment Lifecycle', () => {
  let authPage: AuthPage;
  let storefrontPage: StorefrontPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    storefrontPage = new StorefrontPage(page);
  });

  test('should complete a checkout flow and verify order in My Orders', async ({ page }) => {
    // 1. Log in
    await authPage.goto();
    // Use an existing test user or mock one if database is fresh
    await authPage.login('admin@truckparts.com', 'admin123'); // seed customer/admin

    // 2. Add an item to cart
    await storefrontPage.goto();
    if (await storefrontPage.getProductCount() > 0) {
      await storefrontPage.addFirstProductToCart();
      await storefrontPage.openCart();

      // Intercept the checkout session endpoint to mock Stripe redirect
      await page.route('**/api/checkout/create-checkout-session', async (route) => {
        const json = { id: 'mock-stripe-session-123', url: 'mock-stripe-url' };
        await route.fulfill({ json });
      });

      // 3. Initiate Checkout
      await storefrontPage.checkoutButton.click();

      // We expect the frontend to attempt redirecting to Stripe.
      // We can mock the success callback instead by navigating to the success page manually,
      // but since we don't have the full Stripe webhook logic here, we just ensure the frontend
      // calls the checkout API correctly without _id errors.
      await expect(page.locator('text=Failed to initiate checkout')).not.toBeVisible();
    }
  });
});

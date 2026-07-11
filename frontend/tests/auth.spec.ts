import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe.skip('Authentication Flows', () => {
  let authPage: AuthPage;
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  test('should register a new user successfully', async ({ page }) => {
    // Navigate and open auth modal
    await authPage.register('Test User', testEmail, testPassword);
    
    // UI should show the profile or store view (user should be logged in)
    // We expect the Supabase chip to be visible at the bottom
    await expect(page.locator('text=Supabase')).toBeVisible();

    // Sign out button should eventually be visible in MyAccount or similar,
    // Or at least "Account" or "Sign Out"
    const accountBtn = page.getByRole('button', { name: /Account|Profile|Sign Out/i }).first();
    await expect(accountBtn).toBeVisible();
    
    // Let's log out to reset state
    await authPage.logout();
  });

  test('should log in an existing user successfully', async ({ page }) => {
    // Note: Depends on previous test running, or we can use a known seed user
    // Since Playwright runs in parallel by default, it's better to use a known seed user
    // We will use the seeded admin user
    await authPage.login('admin@truckparts.com', 'admin123'); // fallback placeholder
    
    await expect(page.locator('text=Supabase')).toBeVisible();
    const accountBtn = page.getByRole('button', { name: /Account|Profile|Sign Out|Logout/i }).first();
    await expect(accountBtn).toBeVisible();

    await authPage.logout();
  });
});

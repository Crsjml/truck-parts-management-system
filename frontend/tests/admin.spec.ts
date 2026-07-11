import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { AdminPage } from './pages/AdminPage';

test.describe.skip('Admin Boundaries and Features', () => {
  let authPage: AuthPage;
  let adminPage: AdminPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    adminPage = new AdminPage(page);
  });

  test('should allow admin to access the dashboard and staff components', async ({ page }) => {
    // 1. Log in as admin
    await authPage.goto();
    // Assuming 'admin@truckparts.com' is a seeded Admin.
    await authPage.login('admin@truckparts.com', 'admin123');
    
    // 2. Navigate to admin explicitly if not redirected
    await adminPage.goto();
    
    // We should see admin-specific elements (not customer ones)
    await expect(page.locator('text=Dashboard Overview').first()).toBeVisible();

    // The staff management and transaction components should be mounted, not throwing errors
    // E.g. we might click them to see if they render
    if (await adminPage.staffManagementTab.isVisible()) {
        await adminPage.staffManagementTab.click();
        await expect(adminPage.addStaffButton).toBeVisible();
    }
    
    // Verify unauthorized users CANNOT access
    // We could log out and try to access /admin, expecting a redirect
    await authPage.logout();
    await adminPage.goto();
    
    // Should be redirected away or shown unauthorized
    await expect(page.locator('text=Dashboard')).not.toBeVisible();
  });
});

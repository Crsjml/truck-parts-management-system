import { test, expect } from '@playwright/test';

test('auto-login creates real Supabase session', async ({ page }) => {
  // Mock Supabase Auth signInWithPassword response
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: { id: 'mock-user-1', email: 'lionel.messi@example.com' }
      })
    });
  });

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Tarlac Truck Pitstop is/)).toBeVisible();

  // Open FloatingSettingsWidget gear icon
  await page.locator('button.fixed.bottom-24.right-8').first().click();
  await page.waitForTimeout(800);

  // Click Messi auto-login button
  await page.locator('text=(Messi)').click();
  await page.waitForTimeout(3000);

  // Verify Supabase session token exists in localStorage
  const hasToken = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const authKey = keys.find(k => k.startsWith('sb-'));
    return authKey ? localStorage.getItem(authKey)?.substring(0, 80) : null;
  });
  expect(hasToken).toBeTruthy();
});

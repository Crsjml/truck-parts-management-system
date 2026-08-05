import { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;
  readonly staffManagementTab: Locator;
  readonly transactionPOSTab: Locator;
  readonly addStaffButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.staffManagementTab = page.getByRole('button', { name: /Staff Management|Employees/i });
    this.transactionPOSTab = page.getByRole('button', { name: /Transaction POS|Sales/i });
    this.addStaffButton = page.getByRole('button', { name: /Add Staff|New Employee/i });
  }

  async goto() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  async openInventory() {
    const inventoryToggle = this.page.locator('button[title="Parts Inventory"]').first();
    await inventoryToggle.waitFor({ state: 'visible', timeout: 10000 });
    await inventoryToggle.click();
    await this.page.waitForLoadState('networkidle');
  }
}

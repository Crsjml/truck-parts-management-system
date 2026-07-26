import { Page, Locator } from '@playwright/test';

export class PartDetailDrawerPage {
  readonly page: Page;
  readonly detailsButtons: Locator;
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly specsTab: Locator;
  readonly reviewsTab: Locator;
  readonly stockStatus: Locator;
  readonly decreaseQtyButton: Locator;
  readonly increaseQtyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.detailsButtons = page.getByRole('button', { name: 'Details' });
    this.dialog = page.getByRole('dialog');
    this.closeButton = page.getByRole('button', { name: 'Close part details' });
    this.specsTab = page.getByRole('tab', { name: /Description & Specs/i });
    this.reviewsTab = page.getByRole('tab', { name: /Customer Reviews/i });
    this.stockStatus = page.getByRole('status');
    this.decreaseQtyButton = page.getByRole('button', { name: 'Decrease quantity' });
    this.increaseQtyButton = page.getByRole('button', { name: 'Increase quantity' });
  }

  async openFirst() {
    await this.detailsButtons.first().click();
    await this.dialog.waitFor({ state: 'visible' });
  }
}

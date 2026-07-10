import { Page, Locator, expect } from '@playwright/test';

export class StorefrontPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly productCards: Locator;
  readonly cartButton: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.productCards = page.locator('div:has(> button:has-text("Add to Cart"))');
    this.cartButton = page.getByRole('button', { name: /Cart/i }).first();
    this.checkoutButton = page.getByRole('button', { name: /Checkout/i }).first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async searchProduct(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  async getProductCount() {
    return await this.productCards.count();
  }

  async addFirstProductToCart() {
    const firstProduct = this.productCards.first();
    const addToCartBtn = firstProduct.getByRole('button', { name: /Add to Cart/i });
    await addToCartBtn.click();
    await this.page.waitForTimeout(500); // wait for cart update
  }

  async openCart() {
    await this.cartButton.click();
    await this.page.waitForTimeout(500); // wait for drawer
  }

  async checkout() {
    await this.openCart();
    await this.checkoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}

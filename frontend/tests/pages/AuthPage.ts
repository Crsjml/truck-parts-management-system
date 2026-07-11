import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerTab: Locator;
  readonly loginTab: Locator;
  readonly submitButton: Locator;
  readonly fullNameInput: Locator;
  readonly contactNumberInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.fullNameInput = page.locator('input[name="fullName"], input[placeholder*="Full Name"]');
    this.contactNumberInput = page.locator('input[name="contactNumber"], input[placeholder*="63 917"]');
    
    // Auth Portal uses standard buttons for tabs
    this.registerTab = page.getByRole('button', { name: 'Register', exact: true }).first();
    this.loginTab = page.getByRole('button', { name: 'Login', exact: true }).first();
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openAuthModal() {
    const loginBtn = this.page.getByRole('button', { name: 'Login', exact: true }).first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
    }
  }

  async register(fullName: string, email: string, pass: string) {
    await this.openAuthModal();
    if (await this.registerTab.isVisible()) {
      await this.registerTab.click();
    }
    
    if (await this.fullNameInput.isVisible()) {
      await this.fullNameInput.fill(fullName);
    }
    if (await this.contactNumberInput.isVisible()) {
      await this.contactNumberInput.fill('+639171234567');
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async login(email: string, pass: string) {
    await this.openAuthModal();
    if (await this.loginTab.isVisible()) {
      await this.loginTab.click();
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async logout() {
    const logoutBtn = this.page.getByRole('button', { name: /Logout|Sign Out/i }).first();
    // Use force: true because the button is inside a hover menu that might be opacity-0 initially
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click({ force: true });
    } else {
      // In case it's completely out of DOM or hidden, try to hover the user avatar first
      const avatarBtn = this.page.locator('button.group, button').filter({ hasText: /@example.com/ }).first();
      if (await avatarBtn.isVisible()) {
        await avatarBtn.hover();
        await logoutBtn.click({ force: true });
      }
    }
  }
}

import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerTab: Locator;
  readonly loginTab: Locator;
  readonly submitButton: Locator;
  readonly fullNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.fullNameInput = page.locator('input[name="fullName"], input[placeholder*="Full Name"]');
    
    // Auth Portal uses standard buttons for tabs
    this.registerTab = page.getByRole('button', { name: 'Register', exact: true }).first();
    this.loginTab = page.getByRole('button', { name: 'Login', exact: true }).first();
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openAuthModal() {
    const signInBtn = this.page.getByRole('button', { name: /Sign In/i }).first();
    if (await signInBtn.isVisible()) {
      await signInBtn.click();
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
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, pass: string) {
    await this.openAuthModal();
    if (await this.loginTab.isVisible()) {
      await this.loginTab.click();
    }
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    const logoutBtn = this.page.getByRole('button', { name: /Logout|Sign Out/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }
    await this.page.waitForLoadState('networkidle');
  }
}

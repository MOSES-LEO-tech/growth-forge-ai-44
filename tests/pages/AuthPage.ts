import { Page, expect } from '@playwright/test';

export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth');
  }

  async login(email: string, pass: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', pass);
    await this.page.click('button[type="submit"]');
  }

  async register(email: string, pass: string, name: string) {
    await this.page.click('button:has-text("Sign Up")');
    await this.page.fill('#signup-name', name);
    await this.page.fill('#signup-email', email);
    await this.page.fill('#signup-password', pass);
    await this.page.click('button[type="submit"]');
  }

  async logout() {
    await this.page.click('button[aria-label="Settings"], .avatar-trigger');
    await this.page.click('text=Sign Out');
  }
}

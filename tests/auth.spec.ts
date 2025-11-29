import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow a user to sign up and sign out', async ({ page }) => {
    await page.goto('http://localhost:8080/auth');

    // Sign up
    await page.click('text=Sign Up');
    await page.fill('input[id="signup-name"]', 'Test User');
    await page.fill('input[id="signup-email"]', `testuser_${Date.now()}@example.com`);
    await page.fill('input[id="signup-password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should be redirected to the dashboard
    await page.waitForURL('http://localhost:8080/dashboard');
    await expect(page.locator('h1')).toHaveText('Dashboard');

    // Sign out
    await page.click('button[aria-label="Open user menu"]');
    await page.click('text=Sign Out');

    // Should be redirected to the auth page
    await page.waitForURL('http://localhost:8080/auth');
    await expect(page.locator('h2')).toHaveText('Welcome to StudentHub');
  });

  test('should allow a user to sign in and sign out', async ({ page }) => {
    // First, create a user to sign in with
    await page.goto('http://localhost:8080/auth');
    await page.click('text=Sign Up');
    const email = `testuser_${Date.now()}@example.com`;
    await page.fill('input[id="signup-name"]', 'Test User');
    await page.fill('input[id="signup-email"]', email);
    await page.fill('input[id="signup-password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8080/dashboard');
    await page.click('button[aria-label="Open user menu"]');
    await page.click('text=Sign Out');
    await page.waitForURL('http://localhost:8080/auth');

    // Sign in
    await page.fill('input[id="signin-email"]', email);
    await page.fill('input[id="signin-password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should be redirected to the dashboard
    await page.waitForURL('http://localhost:8080/dashboard');
    await expect(page.locator('h1')).toHaveText('Dashboard');

    // Sign out
    await page.click('button[aria-label="Open user menu"]');
    await page.click('text=Sign Out');

    // Should be redirected to the auth page
    await page.waitForURL('http://localhost:8080/auth');
    await expect(page.locator('h2')).toHaveText('Welcome to StudentHub');
  });

  test('should not allow access to protected routes without authentication', async ({ page }) => {
    await page.goto('http://localhost:8080/dashboard');
    await page.waitForURL('http://localhost:8080/auth');
    await expect(page.locator('h2')).toHaveText('Welcome to StudentHub');
  });
});
import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;
  const hasStudentCredentials = Boolean(process.env.PLAYWRIGHT_STUDENT_EMAIL && process.env.PLAYWRIGHT_STUDENT_PASSWORD);

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  test('register new student account', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await authPage.register(email, 'Password123!', 'Test Student');
    // Check for dashboard redirect or success message
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('login with wrong password shows error', async ({ page }) => {
    await authPage.login('student@example.com', 'WrongPass123!');
    await expect(
      page
        .locator('div.text-sm.opacity-90')
        .filter({ hasText: 'Invalid email or password. Please check your credentials and try again.' })
    ).toBeVisible();
  });

  test('logout redirects to /auth', async ({ page }) => {
    test.skip(!hasStudentCredentials, 'PLAYWRIGHT_STUDENT_EMAIL and PLAYWRIGHT_STUDENT_PASSWORD are required.');

    // Assumes student is already logged in or we login first
    await authPage.login(
      process.env.PLAYWRIGHT_STUDENT_EMAIL!,
      process.env.PLAYWRIGHT_STUDENT_PASSWORD!
    );
    await expect(page).toHaveURL(/.*dashboard/);
    
    await authPage.logout();
    await expect(page).toHaveURL(/.*auth/);
  });
});

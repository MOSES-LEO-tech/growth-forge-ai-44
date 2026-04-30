import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe('Student Portfolio', () => {
  let authPage: AuthPage;
  const hasStudentCredentials = Boolean(process.env.PLAYWRIGHT_STUDENT_EMAIL && process.env.PLAYWRIGHT_STUDENT_PASSWORD);

  test.beforeEach(async ({ page }) => {
    test.skip(!hasStudentCredentials, 'PLAYWRIGHT_STUDENT_EMAIL and PLAYWRIGHT_STUDENT_PASSWORD are required.');

    authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.login(
      process.env.PLAYWRIGHT_STUDENT_EMAIL!,
      process.env.PLAYWRIGHT_STUDENT_PASSWORD!
    );
  });

  test('create and delete project', async ({ page }) => {
    const projectTitle = `Project-${Date.now()}`;
    
    // Create Project
    await page.click('text=New Project');
    await page.fill('input#title', projectTitle);
    await page.fill('textarea#description', 'Testing project creation flow');
    await page.click('button[type="submit"]');
    
    // Verify it appears
    await expect(page.locator(`text=${projectTitle}`)).toBeVisible();
    
    // Delete Project (assuming trash icon is present)
    await page.click(`text=${projectTitle}`);
    await page.click('button[aria-label="Delete Project"], button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');
    
    // Verify removal
    await expect(page.locator(`text=${projectTitle}`)).not.toBeVisible();
  });
});

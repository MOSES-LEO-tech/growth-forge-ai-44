import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe('Scholarship Application Tracking Flow', () => {
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

  test('bookmark scholarship and verify in My Applications', async ({ page }) => {
    // Visit scholarships
    await page.goto('/scholarships');
    
    // Bookmark a scholarship
    const scholarshipTitle = await page.locator('h3').first().textContent();
    await page.click('button[aria-label="Bookmark"], button:has-text("Save")');
    
    // Navigate to /my-applications
    await page.click('text=My Apps');
    await expect(page).toHaveURL(/.*my-applications/);
    
    // Verify it appears in Bookmarked column
    await expect(page.locator(`.column-bookmarked:has-text("${scholarshipTitle}")`)).toBeVisible();
  });
});

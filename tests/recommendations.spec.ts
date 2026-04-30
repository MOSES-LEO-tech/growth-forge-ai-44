import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe('AI Recommendations Flow', () => {
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

  test('visit recommendations and verify content', async ({ page }) => {
    // Navigate to recommendations
    await page.click('text=AI Insights');
    await expect(page).toHaveURL(/.*recommendations/);
    
    // Verify loading state then content renders
    // Wait for skeleton to be hidden or specific content to appear
    await expect(page.locator('text=Profile Completeness')).toBeVisible();
    await expect(page.locator('text=AI Scholarship Matches')).toBeVisible();
    await expect(page.locator('text=Priority Action Items')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Public Schools Exploration', () => {
  test('visit /schools and explore school profile', async ({ page }) => {
    // Visit schools list
    await page.goto('/schools');

    await expect(page.getByRole('heading', { name: 'Schools' })).toBeVisible();

    const profileLinks = page.getByRole('link', { name: 'View Profile' });
    if (await profileLinks.count() === 0) {
      await expect(page.getByText('No schools found')).toBeVisible();
      test.skip(true, 'No public school seed data is available in this environment.');
    }

    // Click a school
    await profileLinks.first().click();

    // Verify profile page loads with stats
    await expect(page).toHaveURL(/.*schools\/.*/);
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=School Description')).toBeVisible();
  });
});

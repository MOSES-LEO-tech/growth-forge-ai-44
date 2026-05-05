import { test, expect } from '@playwright/test';

test.describe('Public Schools Exploration', () => {
  test('visit /schools and explore school profile', async ({ page }) => {
    // Visit schools list
    await page.goto('/schools');

    await expect(page.getByRole('heading', { name: 'Schools' })).toBeVisible();

    const profileLinks = page.getByRole('link', { name: 'View Profile' });
    let reloaded = false;
    await expect
      .poll(
        async () => {
          const count = await profileLinks.count();
          if (count === 0 && !reloaded && await page.getByText('No schools found').isVisible()) {
            reloaded = true;
            await page.reload();
            await expect(page.getByRole('heading', { name: 'Schools' })).toBeVisible();
          }
          return profileLinks.count();
        },
        { timeout: 20000 }
      )
      .toBeGreaterThan(0);

    // Click a school
    await profileLinks.first().click();

    // Verify profile page loads with stats
    await expect(page).toHaveURL(/.*schools\/.*/);
    await expect(page.locator('text=Total Students')).toBeVisible();
    await expect(page.locator('text=School Description')).toBeVisible();
  });
});

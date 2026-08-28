import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

const hasAdmin = Boolean(
  process.env.PLAYWRIGHT_ADMIN_EMAIL && process.env.PLAYWRIGHT_ADMIN_PASSWORD
);
const hasTeacher = Boolean(
  process.env.PLAYWRIGHT_TEACHER_EMAIL && process.env.PLAYWRIGHT_TEACHER_PASSWORD
);

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL!;
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD!;
const teacherEmail = process.env.PLAYWRIGHT_TEACHER_EMAIL!;
const teacherPassword = process.env.PLAYWRIGHT_TEACHER_PASSWORD!;

test.describe('School admin workspace', () => {
  test('admin lands in the sidebar workspace and navigates sections', async ({ page }) => {
    test.skip(!hasAdmin, 'PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD are required.');

    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.login(adminEmail, adminPassword);

    // /dashboard redirects admins into the workspace.
    await expect(page).toHaveURL(/.*\/admin\/overview/, { timeout: 15000 });

    // Sidebar navigation covers the workspace sections.
    const sidebar = page.locator('aside nav[aria-label="School admin"]');
    await expect(sidebar).toBeVisible();
    for (const section of ['Overview', 'Content', 'Announcements', 'Academic', 'Moderation', 'Analytics', 'Settings']) {
      await expect(sidebar.getByText(section, { exact: true })).toBeVisible();
    }

    await sidebar.getByText('Announcements', { exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/announcements/);
    await expect(page.getByRole('heading', { name: /School announcements/ })).toBeVisible();

    await sidebar.getByText('Content', { exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/content/);
    await expect(page.getByRole('heading', { name: /School CMS/ })).toBeVisible();

    // Legacy /admin/cms still works via redirect.
    await page.goto('/admin/cms');
    await expect(page).toHaveURL(/.*\/admin\/content/);
  });

  test('mobile segmented rail exposes the workspace sections', async ({ page }) => {
    test.skip(!hasAdmin, 'PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD are required.');

    await page.setViewportSize({ width: 390, height: 844 });
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.login(adminEmail, adminPassword);
    await expect(page).toHaveURL(/.*\/admin\/overview/, { timeout: 15000 });

    const rail = page.locator('nav[aria-label="School admin"]');
    await expect(rail).toBeVisible();
    await rail.getByText('Announcements', { exact: true }).click();
    await expect(page).toHaveURL(/.*\/admin\/announcements/);
  });
});

test.describe('CMS teacher -> admin workflow', () => {
  test('teacher drafts and submits news; admin publishes it', async ({ page }) => {
    test.skip(
      !hasAdmin || !hasTeacher,
      'PLAYWRIGHT_ADMIN_* and PLAYWRIGHT_TEACHER_* credentials are required.'
    );

    const title = `E2E News ${Date.now()}`;

    // Teacher: authoring UI, no Pages tab, draft + submit.
    const teacherPage = new AuthPage(page);
    await teacherPage.goto();
    await teacherPage.login(teacherEmail, teacherPassword);
    await page.goto('/content');
    await expect(page.getByRole('heading', { name: /School CMS/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Pages' })).toHaveCount(0);

    await page.getByRole('button', { name: /New News/ }).click();
    await page.getByLabel('Title').fill(title);
    await page.locator('.ProseMirror').fill('Prepared by the science department.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText('Draft').first()).toBeVisible();

    await page.getByText(title).locator('..').getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Pending review').first()).toBeVisible();

    // Admin: publish from the workspace CMS.
    await page.evaluate(() => localStorage.clear());
    await teacherPage.goto();
    await teacherPage.login(adminEmail, adminPassword);
    await page.goto('/admin/content');
    await page.getByRole('tab', { name: 'News' }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.getByText(title).locator('..').getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published').first()).toBeVisible();
  });
});

test.describe('Announcements', () => {
  test('admin publishes an audience-wide announcement', async ({ page }) => {
    test.skip(!hasAdmin, 'PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD are required.');

    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.login(adminEmail, adminPassword);
    await page.goto('/admin/announcements');
    await expect(page.getByRole('heading', { name: /School announcements/ })).toBeVisible();

    await page.getByRole('button', { name: /New announcement/ }).click();
    await page.getByLabel('Title').fill(`E2E Announcement ${Date.now()}`);
    await page.getByLabel('Message').fill('Fire drill next Thursday.');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft').first()).toBeVisible();

    await page.getByRole('button', { name: 'Publish' }).first().click();
    await expect(page.getByText('Published').first()).toBeVisible();
  });
});

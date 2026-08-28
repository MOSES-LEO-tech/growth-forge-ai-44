import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

const hasStudent = Boolean(
  process.env.PLAYWRIGHT_STUDENT_EMAIL && process.env.PLAYWRIGHT_STUDENT_PASSWORD
);
const hasParent = Boolean(
  process.env.PLAYWRIGHT_PARENT_EMAIL && process.env.PLAYWRIGHT_PARENT_PASSWORD
);
const hasTeacher = Boolean(
  process.env.PLAYWRIGHT_TEACHER_EMAIL && process.env.PLAYWRIGHT_TEACHER_PASSWORD
);
const hasAdmin = Boolean(
  process.env.PLAYWRIGHT_ADMIN_EMAIL && process.env.PLAYWRIGHT_ADMIN_PASSWORD
);

const emailFor = (varName: string) => process.env[varName]!;
const passwordFor = (varName: string) => process.env[varName]!;

test.describe('Role access matrix', () => {
  test('student cannot open parent or admin routes', async ({ page }) => {
    test.skip(!hasStudent, 'PLAYWRIGHT_STUDENT_* credentials are required.');

    await new AuthPage(page).goto();
    await new AuthPage(page).login(emailFor('PLAYWRIGHT_STUDENT_EMAIL'), passwordFor('PLAYWRIGHT_STUDENT_PASSWORD'));
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    await page.goto('/parent');
    await expect(page).toHaveURL(/.*dashboard/);
    await page.goto('/admin/overview');
    await expect(page).toHaveURL(/.*dashboard/);

    // Student-only pages remain reachable.
    await page.goto('/projects');
    await expect(page).toHaveURL(/.*projects/);
  });

  test('parent cannot open student-only routes', async ({ page }) => {
    test.skip(!hasParent, 'PLAYWRIGHT_PARENT_* credentials are required.');

    await new AuthPage(page).goto();
    await new AuthPage(page).login(emailFor('PLAYWRIGHT_PARENT_EMAIL'), passwordFor('PLAYWRIGHT_PARENT_PASSWORD'));
    await expect(page).toHaveURL(/.*parent/, { timeout: 15000 });

    await page.goto('/projects');
    await expect(page).toHaveURL(/.*parent/);
    await page.goto('/gallery/personal');
    await expect(page).toHaveURL(/.*parent/);
  });

  test('teacher cannot open admin routes and sees teacher nav', async ({ page }) => {
    test.skip(!hasTeacher, 'PLAYWRIGHT_TEACHER_* credentials are required.');

    await new AuthPage(page).goto();
    await new AuthPage(page).login(emailFor('PLAYWRIGHT_TEACHER_EMAIL'), passwordFor('PLAYWRIGHT_TEACHER_PASSWORD'));
    await expect(page).toHaveURL(/.*teacher/, { timeout: 15000 });

    await page.goto('/admin/overview');
    await expect(page).toHaveURL(/.*teacher/);

    const nav = page.locator('nav[aria-label="Primary"]');
    await expect(nav.getByText('Overview', { exact: true })).toBeVisible();
    await expect(nav.getByText('Content', { exact: true })).toBeVisible();
  });

  test('unauthenticated users are redirected to auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth/);
  });
});

test.describe('Settings role filtering', () => {
  test('student settings include education system and grade', async ({ page }) => {
    test.skip(!hasStudent, 'PLAYWRIGHT_STUDENT_* credentials are required.');

    await new AuthPage(page).goto();
    await new AuthPage(page).login(emailFor('PLAYWRIGHT_STUDENT_EMAIL'), passwordFor('PLAYWRIGHT_STUDENT_PASSWORD'));
    await page.goto('/settings');
    await expect(page.getByLabel('Education system')).toBeVisible();
    await expect(page.getByLabel('Grade / year')).toBeVisible();
  });

  test('teacher settings hide grade fields', async ({ page }) => {
    test.skip(!hasTeacher, 'PLAYWRIGHT_TEACHER_* credentials are required.');

    await new AuthPage(page).goto();
    await new AuthPage(page).login(emailFor('PLAYWRIGHT_TEACHER_EMAIL'), passwordFor('PLAYWRIGHT_TEACHER_PASSWORD'));
    await page.goto('/settings');
    await expect(page.getByLabel('Education system')).toHaveCount(0);
    await expect(page.getByLabel('Grade / year')).toHaveCount(0);
  });
});

test.describe('Signup-as-onboarding', () => {
  test('signup form shows role-specific onboarding fields', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Sign Up' }).click();

    // Student onboarding fields.
    await page.getByRole('combobox', { name: 'I am a...' }).click();
    await page.getByRole('option', { name: 'Student' }).click();
    await expect(page.getByLabel('Education system (optional)')).toBeVisible();
    await expect(page.getByLabel('Grade / year (optional)')).toBeVisible();

    // Teacher onboarding fields.
    await page.getByRole('combobox', { name: 'I am a...' }).click();
    await page.getByRole('option', { name: 'Teacher' }).click();
    await expect(page.getByLabel('School Code')).toBeVisible();
    await expect(page.getByLabel('Subjects you teach (optional)')).toBeVisible();

    // Parent onboarding fields.
    await page.getByRole('combobox', { name: 'I am a...' }).click();
    await page.getByRole('option', { name: 'Parent' }).click();
    await expect(page.getByLabel('Link your child (optional)')).toBeVisible();
  });
});

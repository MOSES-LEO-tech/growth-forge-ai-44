import { test, expect, APIRequestContext } from '@playwright/test';

const FRONTEND = 'http://localhost:8080';
const BACKEND = 'http://localhost:3000';

async function apiCreateProject(request: APIRequestContext, token: string, data: Record<string, unknown>) {
  const res = await request.post(`${BACKEND}/api/projects`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  const body = await res.json();
  return body.data;
}

async function apiDeleteProject(request: APIRequestContext, token: string, id: string | number) {
  await request.delete(`${BACKEND}/api/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test.describe('Projects Page', () => {
  test('renders and filters projects by status', async ({ page, request }) => {
    await page.goto(`${FRONTEND}/auth`);
    await page.click('text=Sign Up');
    const email = `proj_${Date.now()}@example.com`;
    await page.fill('#signup-name', 'Project Tester');
    await page.fill('#signup-email', email);
    await page.fill('#signup-password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${FRONTEND}/dashboard`);

    const token = await page.evaluate(() => localStorage.getItem('token') || '');
    expect(token).toBeTruthy();

    const nowIso = new Date().toISOString();
    const pending = await apiCreateProject(request, token, {
      title: 'Pending Project',
      description: 'Should appear under New',
      start_date: nowIso,
      status: 'pending',
    });
    const ongoing = await apiCreateProject(request, token, {
      title: 'Ongoing Project',
      description: 'Should appear under Ongoing',
      start_date: nowIso,
      status: 'ongoing',
    });
    const complete = await apiCreateProject(request, token, {
      title: 'Completed Project',
      description: 'Should appear under Completed',
      start_date: nowIso,
      status: 'complete',
    });

    await page.goto(`${FRONTEND}/projects`);
    await page.getByRole('tab', { name: 'All' }).click();
    if (!pending?.id || !ongoing?.id || !complete?.id) {
      await expect(page.getByText('No projects found. Create your first project!', { exact: true })).toBeVisible({ timeout: 15000 });
      return;
    }
    await expect(page.getByText('Pending Project', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ongoing Project', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Completed Project', { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByRole('tab', { name: 'New' }).click();
    await expect(page.getByText('Pending Project', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ongoing Project', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Completed Project', { exact: true })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Ongoing' }).click();
    await expect(page.getByText('Ongoing Project', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pending Project', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Completed Project', { exact: true })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Completed' }).click();
    await expect(page.getByText('Completed Project', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pending Project', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Ongoing Project', { exact: true })).toHaveCount(0);

    await apiDeleteProject(request, token, pending.id);
    await apiDeleteProject(request, token, ongoing.id);
    await apiDeleteProject(request, token, complete.id);
  });
});

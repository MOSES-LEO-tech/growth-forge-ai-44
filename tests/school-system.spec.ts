import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEMO_ADMIN_EMAIL = 'school.admin.qa+20260505@example.com';
const DEMO_ADMIN_PASSWORD = 'MilestoneAdmin#2026!';
const DEMO_TEACHER_EMAIL = 'teacher.qa+20260505@example.com';
const DEMO_TEACHER_PASSWORD = 'MilestoneTeacher#2026!';

type Env = Record<string, string>;

const loadEnv = (): Env => {
  if (!fs.existsSync('.env')) return {};

  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trimStart().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
      })
  );
};

const env = { ...loadEnv(), ...process.env };
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const makeClient = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const signInClient = async (email: string, password: string) => {
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return client;
};

const login = async (page: Page, email: string, password: string) => {
  await suppressOnboarding(page);
  await page.goto('/auth');
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: /^Sign In$/ }).click();
  await expect(page).toHaveURL(/.*dashboard/);
};

const suppressOnboarding = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('hasSeenOnboarding', 'true');
  });
};

const chooseSignupRole = async (page: Page, roleName: string) => {
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: roleName }).click();
};

const getCurrentCode = async () => {
  const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
  const {
    data: { user },
  } = await admin.auth.getUser();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('school_id')
    .eq('id', user?.id)
    .single();
  expect(profileError).toBeNull();

  const { data: code, error: codeError } = await admin
    .from('school_join_codes')
    .select('code')
    .eq('school_id', profile?.school_id)
    .eq('is_active', true)
    .single();
  expect(codeError).toBeNull();

  return code!.code;
};

const createStudentWithSession = async (namePrefix: string) => {
  const client = makeClient();
  const email = `${namePrefix}-${Date.now()}@example.com`;
  const password = 'MilestoneStudent#2026!';

  const { error: signUpError } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'QA Student', role: 'student' } },
  });
  expect(signUpError).toBeNull();

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  }

  return client;
};

const createConnectedStudentWithSession = async (namePrefix: string) => {
  const code = await getCurrentCode();
  const student = await createStudentWithSession(namePrefix);

  const { data: request, error: requestError } = await student.rpc('request_school_connection', { p_code: code });
  expect(requestError).toBeNull();
  expect(request?.request_id).toBeTruthy();

  const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
  const { error: approvalError } = await admin.rpc('approve_school_connection', { p_request_id: request!.request_id });
  expect(approvalError).toBeNull();

  const {
    data: { user },
  } = await student.auth.getUser();
  expect(user).toBeTruthy();

  return { client: student, userId: user!.id };
};

test.describe('School registration and approvals', () => {
  test.skip(!supabaseUrl || !supabaseKey, 'Supabase test credentials are required.');

  test('school admin signup creates a pending school/admin pair', async ({ page }) => {
    const suffix = Date.now();

    await suppressOnboarding(page);
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Sign Up' }).click();
    await page.locator('#signup-name').fill('Pending School Admin');
    await page.locator('#signup-email').fill(`pending-school-admin-${suffix}@example.com`);
    await page.locator('#signup-password').fill('MilestoneAdmin#2026!');
    await chooseSignupRole(page, 'School Admin');
    await page.locator('#schoolName').fill(`Pending QA Academy ${suffix}`);
    await page.locator('#schoolLocation').fill('Kampala');
    await page.locator('#schoolCountry').fill('Uganda');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Pending approval')).toBeVisible();
    await expect(page.getByText(/Super Admin needs to approve your school registration/)).toBeVisible();
  });

  test('teacher signup with a school code waits for school-admin approval', async ({ page }) => {
    const code = await getCurrentCode();
    const suffix = Date.now();

    await suppressOnboarding(page);
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Sign Up' }).click();
    await page.locator('#signup-name').fill('Pending Teacher');
    await page.locator('#signup-email').fill(`pending-teacher-${suffix}@example.com`);
    await page.locator('#signup-password').fill('MilestoneTeacher#2026!');
    await chooseSignupRole(page, 'Teacher');
    await page.locator('#schoolCode').fill(code);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Pending approval')).toBeVisible();
    await expect(page.getByText(/school admin needs to approve your teacher account/i)).toBeVisible();
  });

  test('approved demo school admin can view the active school code', async ({ page }) => {
    const code = await getCurrentCode();

    await login(page, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    await page.goto('/dashboard?widget=access');

    await expect(page.getByText('School Access')).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate/i })).toBeVisible();
  });

  test('approved demo teacher reaches the teacher dashboard', async ({ page }) => {
    await login(page, DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    await expect(page.getByText('Teacher workspace')).toBeVisible();
    await expect(page.getByText(/Welcome back, Daniel Ssenyonga/)).toBeVisible();
  });

  test('approved demo teacher can share the school code without managing requests', async ({ page }) => {
    const code = await getCurrentCode();

    await login(page, DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    await page.goto('/dashboard?widget=access');

    await expect(page.getByText('Share this with students who should request to join your school.')).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate/i })).toHaveCount(0);
    await expect(page.getByText('Pending connections')).toHaveCount(0);
  });

  test('invalid school codes are rejected for signed-in students', async () => {
    const student = await createStudentWithSession('invalid-code-student');
    const { error } = await student.rpc('request_school_connection', { p_code: 'NOPE404' });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('invalid or inactive');
  });

  test('students stay independent while a school-code request is pending', async () => {
    const code = await getCurrentCode();
    const student = await createStudentWithSession('pending-school-student');

    const { data, error } = await student.rpc('request_school_connection', { p_code: code });
    expect(error).toBeNull();
    expect(data?.status).toBe('pending');

    const {
      data: { user },
    } = await student.auth.getUser();
    const { data: profile, error: profileError } = await student
      .from('profiles')
      .select('school_id')
      .eq('id', user?.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.school_id).toBeNull();
  });

  test('non-admin users cannot approve school connection requests', async () => {
    const code = await getCurrentCode();
    const student = await createStudentWithSession('cross-school-student');

    const { data: request, error: requestError } = await student.rpc('request_school_connection', { p_code: code });
    expect(requestError).toBeNull();
    expect(request?.request_id).toBeTruthy();

    const teacher = await signInClient(DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    const { error } = await teacher.rpc('approve_school_connection', { p_request_id: request!.request_id });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Only this school admin can approve');
  });

  test('school admins cannot register a second active school', async () => {
    const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
    const {
      data: { user },
    } = await admin.auth.getUser();

    const { error } = await admin.from('schools').insert({
      name: `Duplicate Lighthouse ${Date.now()}`,
      location: 'Kampala',
      country: 'Uganda',
      admin_id: user?.id,
      approval_status: 'pending',
    });

    expect(error).not.toBeNull();
  });

  test('super admin can open school approval UI', async ({ page }) => {
    test.skip(
      !env.PLAYWRIGHT_SUPER_ADMIN_EMAIL || !env.PLAYWRIGHT_SUPER_ADMIN_PASSWORD,
      'PLAYWRIGHT_SUPER_ADMIN_EMAIL/PASSWORD are required.'
    );

    await login(page, env.PLAYWRIGHT_SUPER_ADMIN_EMAIL!, env.PLAYWRIGHT_SUPER_ADMIN_PASSWORD!);
    await expect(page.getByRole('tab', { name: /Approvals/i })).toBeVisible();
  });

  test('existing student sees connected school in Settings', async ({ page }) => {
    test.skip(
      !env.PLAYWRIGHT_STUDENT_EMAIL || !env.PLAYWRIGHT_STUDENT_PASSWORD,
      'PLAYWRIGHT_STUDENT_EMAIL/PASSWORD are required.'
    );

    await login(page, env.PLAYWRIGHT_STUDENT_EMAIL!, env.PLAYWRIGHT_STUDENT_PASSWORD!);
    await page.getByRole('button', { name: /User menu/i }).click();
    await page.getByText('Settings').click();

    await expect(page.getByText('School Connection')).toBeVisible();
    await expect(page.getByText('Lighthouse STEM Academy')).toBeVisible();
  });
});

test.describe('Student content approval routing', () => {
  test.skip(!supabaseUrl || !supabaseKey, 'Supabase test credentials are required.');

  test('teachers approve projects while school admins cannot', async () => {
    const { client: student, userId } = await createConnectedStudentWithSession('project-approval-student');
    const teacher = await signInClient(DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);

    const { data: project, error: createError } = await student
      .from('projects')
      .insert({
        user_id: userId,
        owner_id: userId,
        title: `Teacher Approved Project ${Date.now()}`,
        description: 'Approval routing test project',
        status: 'pending',
      })
      .select('id, approval_status, verified')
      .single();

    expect(createError).toBeNull();
    expect(project?.approval_status).toBe('pending');
    expect(project?.verified).toBe(false);

    const { error: adminError } = await admin.rpc('approve_student_project', { p_project_id: project!.id });
    expect(adminError).not.toBeNull();
    expect(adminError!.message).toContain('teacher');

    const { error: teacherError } = await teacher.rpc('approve_student_project', { p_project_id: project!.id });
    expect(teacherError).toBeNull();

    const { data: approved, error: fetchError } = await student
      .from('projects')
      .select('approval_status, verified, status')
      .eq('id', project!.id)
      .single();

    expect(fetchError).toBeNull();
    expect(approved?.approval_status).toBe('approved');
    expect(approved?.verified).toBe(true);
    expect(approved?.status).toBe('ongoing');
  });

  test('teachers approve media events while school admins cannot', async () => {
    const { client: student, userId } = await createConnectedStudentWithSession('media-approval-student');
    const teacher = await signInClient(DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);

    const { data: event, error: createError } = await student
      .from('gallery_events')
      .insert({
        user_id: userId,
        title: `Teacher Approved Media ${Date.now()}`,
        description: 'Approval routing test media event',
        is_public: true,
      })
      .select('id, approval_status')
      .single();

    expect(createError).toBeNull();
    expect(event?.approval_status).toBe('pending');

    const { error: adminError } = await admin.rpc('approve_student_media_event', { p_event_id: event!.id });
    expect(adminError).not.toBeNull();
    expect(adminError!.message).toContain('teacher');

    const { error: teacherError } = await teacher.rpc('approve_student_media_event', { p_event_id: event!.id });
    expect(teacherError).toBeNull();

    const { data: approved, error: fetchError } = await student
      .from('gallery_events')
      .select('approval_status')
      .eq('id', event!.id)
      .single();

    expect(fetchError).toBeNull();
    expect(approved?.approval_status).toBe('approved');
  });

  test('school admins approve achievements while teachers cannot', async () => {
    const { client: student, userId } = await createConnectedStudentWithSession('achievement-approval-student');
    const teacher = await signInClient(DEMO_TEACHER_EMAIL, DEMO_TEACHER_PASSWORD);
    const admin = await signInClient(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);

    const { data: achievement, error: createError } = await student
      .from('achievements')
      .insert({
        user_id: userId,
        title: `School Admin Approved Achievement ${Date.now()}`,
        description: 'Approval routing test achievement',
        date_earned: new Date().toISOString().slice(0, 10),
      })
      .select('id, approval_status, verified')
      .single();

    expect(createError).toBeNull();
    expect(achievement?.approval_status).toBe('pending');
    expect(achievement?.verified).toBe(false);

    const { error: teacherError } = await teacher.rpc('approve_student_achievement', { p_achievement_id: achievement!.id });
    expect(teacherError).not.toBeNull();
    expect(teacherError!.message).toContain('school admin');

    const { error: adminError } = await admin.rpc('approve_student_achievement', { p_achievement_id: achievement!.id });
    expect(adminError).toBeNull();

    const { data: approved, error: fetchError } = await student
      .from('achievements')
      .select('approval_status, verified')
      .eq('id', achievement!.id)
      .single();

    expect(fetchError).toBeNull();
    expect(approved?.approval_status).toBe('approved');
    expect(approved?.verified).toBe(true);
  });
});

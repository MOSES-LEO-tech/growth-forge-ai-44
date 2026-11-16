import { describe, it, expect } from 'vitest';
import {
  ONBOARDING_FLOWS,
  onboardingSteps,
  firstSuccessPath,
  validateStep,
  canSkip,
  type OnboardingStep,
} from '@/lib/onboardingFlows';
import type { UserRole } from '@/integrations/supabase/types';

const ROLES: UserRole[] = ['student', 'parent', 'teacher', 'admin', 'super_admin'];

describe('flow inventory', () => {
  it('defines a flow for every role', () => {
    for (const role of ROLES) {
      expect(ONBOARDING_FLOWS[role], role).toBeDefined();
      expect(ONBOARDING_FLOWS[role].role).toBe(role);
    }
  });

  it('gives each role a distinct first-success destination', () => {
    expect(firstSuccessPath('student')).toBe('/dashboard');
    expect(firstSuccessPath('parent')).toBe('/parent');
    expect(firstSuccessPath('teacher')).toBe('/teacher');
    expect(firstSuccessPath('admin')).toBe('/admin/overview');
    expect(firstSuccessPath('super_admin')).toBe('/admin/overview');
  });

  it('never reuses a step key inside one flow', () => {
    for (const role of ROLES) {
      const keys = ONBOARDING_FLOWS[role].steps.map((s) => s.key);
      expect(new Set(keys).size, role).toBe(keys.length);
    }
  });

  it('starts every non-super_admin flow with a non-skippable basics step', () => {
    for (const role of ['student', 'parent', 'teacher', 'admin'] as UserRole[]) {
      const [first] = ONBOARDING_FLOWS[role].steps;
      expect(first.key).toBe('basics');
      expect(first.skippable).toBe(false);
    }
  });

  it('gives every role at least one step, so the wizard never indexes past the end', () => {
    for (const role of ROLES) {
      expect(ONBOARDING_FLOWS[role].steps.length, role).toBeGreaterThan(0);
    }
  });

  it('falls back to the student flow for unknown roles', () => {
    expect(onboardingSteps(null)).toEqual(onboardingSteps('student'));
  });
});

const step = (fields: OnboardingStep['fields']): OnboardingStep => ({
  key: 'test', title: 't', description: 'd', fields, skippable: false,
});

describe('validateStep', () => {
  it('rejects a missing required field', () => {
    const r = validateStep(step([{ name: 'fullName', label: 'Full name', kind: 'text', required: true, minLength: 2 }]), {});
    expect(r.ok).toBe(false);
    expect(r.errors.fullName).toMatch(/required/i);
  });

  it('treats whitespace as empty', () => {
    const r = validateStep(step([{ name: 'fullName', label: 'Full name', kind: 'text', required: true, minLength: 2 }]), { fullName: '   ' });
    expect(r.ok).toBe(false);
  });

  it('enforces minLength', () => {
    const r = validateStep(step([{ name: 'schoolCode', label: 'Code', kind: 'code', required: true, minLength: 4 }]), { schoolCode: 'AB' });
    expect(r.ok).toBe(false);
    expect(r.errors.schoolCode).toMatch(/at least 4/);
  });

  it('validates email shape', () => {
    const f = { name: 'childEmail', label: 'Email', kind: 'email' as const, required: false };
    expect(validateStep(step([f]), { childEmail: 'nope' }).ok).toBe(false);
    expect(validateStep(step([f]), { childEmail: 'kid@example.com' }).ok).toBe(true);
  });

  it('accepts an empty optional field', () => {
    const f = { name: 'childEmail', label: 'Email', kind: 'email' as const, required: false };
    expect(validateStep(step([f]), {}).ok).toBe(true);
  });

  it('rejects a select value outside its options', () => {
    const f = { name: 'gradeLevel', label: 'Grade', kind: 'select' as const, required: true, options: ['Grade 9'] };
    expect(validateStep(step([f]), { gradeLevel: 'Grade 99' }).ok).toBe(false);
    expect(validateStep(step([f]), { gradeLevel: 'Grade 9' }).ok).toBe(true);
  });

  it('holds for every real flow step with its own required fields', () => {
    for (const role of ROLES) {
      for (const s of ONBOARDING_FLOWS[role].steps) {
        const empty = validateStep(s, {});
        const hasRequired = s.fields.some((f) => f.required);
        expect(empty.ok, `${role}/${s.key}`).toBe(!hasRequired);
      }
    }
  });
});

describe('canSkip', () => {
  it('is false when a required field exists', () => {
    expect(canSkip(step([{ name: 'x', label: 'X', kind: 'text', required: true }]))).toBe(false);
  });

  it('is true for a skippable step with only optional fields', () => {
    const s: OnboardingStep = { key: 'i', title: 't', description: 'd', skippable: true, fields: [{ name: 'x', label: 'X', kind: 'text', required: false }] };
    expect(canSkip(s)).toBe(true);
  });

  it('is true for a status-only step with no fields', () => {
    const statusStep: OnboardingStep = { key: 'status', title: 't', description: 'd', fields: [], skippable: false };
    expect(canSkip(statusStep)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import {
  sanitizeProfileUpdate,
  strippedProtectedFields,
  isEditableProfileField,
  EDITABLE_PROFILE_FIELDS,
  PROTECTED_PROFILE_FIELDS,
} from '@/lib/profileFields';

describe('sanitizeProfileUpdate', () => {
  it('keeps editable fields', () => {
    const out = sanitizeProfileUpdate({ full_name: 'Amina Okello', grade_level: 'Grade 9' });
    expect(out).toEqual({ full_name: 'Amina Okello', grade_level: 'Grade 9' });
  });

  it('drops role — the classic privilege-escalation attempt', () => {
    const out = sanitizeProfileUpdate({ full_name: 'X', role: 'super_admin' } as never);
    expect(out).toEqual({ full_name: 'X' });
    expect(out).not.toHaveProperty('role');
  });

  it('drops every approval-workflow field', () => {
    const out = sanitizeProfileUpdate({
      full_name: 'X',
      account_status: 'approved',
      approved_by: '00000000-0000-0000-0000-000000000000',
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      school_id: '00000000-0000-0000-0000-000000000001',
    } as never);
    expect(Object.keys(out)).toEqual(['full_name']);
  });

  it('never lets the id or created_at be rewritten', () => {
    const out = sanitizeProfileUpdate({ id: 'other', created_at: '2020-01-01' } as never);
    expect(out).toEqual({});
  });

  it('preserves explicit nulls and falsey values on editable fields', () => {
    const out = sanitizeProfileUpdate({ bio: null, age: 0, gpa: 0 } as never);
    expect(out).toEqual({ bio: null, age: 0, gpa: 0 });
  });

  it('keeps onboarding fields the wizard writes', () => {
    const out = sanitizeProfileUpdate({
      onboarding_completed_at: '2026-11-10T00:00:00.000Z',
      education_system: 'Cambridge (IGCSE)',
    } as never);
    expect(out).toHaveProperty('onboarding_completed_at');
    expect(out).toHaveProperty('education_system');
  });

  it('ignores unknown keys', () => {
    const out = sanitizeProfileUpdate({ nonsense: 1, full_name: 'Y' } as never);
    expect(out).toEqual({ full_name: 'Y' });
  });
});

describe('strippedProtectedFields', () => {
  it('reports exactly the privileged keys a caller supplied', () => {
    expect(strippedProtectedFields({ full_name: 'X', role: 'admin', school_id: 's' } as never)).toEqual([
      'role',
      'school_id',
    ]);
  });

  it('is empty for a clean payload', () => {
    expect(strippedProtectedFields({ full_name: 'X' })).toEqual([]);
  });
});

describe('editable/protected sets', () => {
  it('never overlap', () => {
    const overlap = EDITABLE_PROFILE_FIELDS.filter((f) =>
      (PROTECTED_PROFILE_FIELDS as readonly string[]).includes(f)
    );
    expect(overlap).toEqual([]);
  });

  it('isEditableProfileField matches the allow-list', () => {
    expect(isEditableProfileField('full_name')).toBe(true);
    expect(isEditableProfileField('role')).toBe(false);
    expect(isEditableProfileField('account_status')).toBe(false);
  });
});

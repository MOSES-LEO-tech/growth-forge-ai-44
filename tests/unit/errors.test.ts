import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/lib/errors';

describe('getErrorMessage', () => {
  it('reads a plain Error message', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('reads a Supabase PostgrestError, which is not an Error instance', () => {
    const postgrest = { message: 'new row violates row-level security policy', code: '42501', details: null, hint: null };
    expect(getErrorMessage(postgrest, 'fallback')).toContain('new row violates row-level security policy');
    expect(getErrorMessage(postgrest, 'fallback')).toContain('42501');
  });

  it('appends details when present', () => {
    const postgrest = { message: 'duplicate key value', code: '23505', details: 'Key (email)=(a@b.com) already exists.' };
    const out = getErrorMessage(postgrest, 'fallback');
    expect(out).toContain('duplicate key value');
    expect(out).toContain('a@b.com');
  });

  it('falls back when the message is missing or blank', () => {
    expect(getErrorMessage({ code: 'X' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('accepts a thrown string', () => {
    expect(getErrorMessage('plain string failure', 'fallback')).toBe('plain string failure');
  });

  it('ignores non-string message values', () => {
    expect(getErrorMessage({ message: 42 }, 'fallback')).toBe('fallback');
  });
});

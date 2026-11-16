import { describe, it, expect } from 'vitest';
import { sanitizeEventProps, isValidEventName, type EventProps } from '@/lib/analytics';

describe('sanitizeEventProps', () => {
  it('keeps primitive, non-PII values', () => {
    expect(sanitizeEventProps({ role: 'student', step: 2, ok: true })).toEqual({ role: 'student', step: 2, ok: true });
  });

  it('drops PII keys regardless of case', () => {
    const props = { Email: 'a@b.com', password: 'x', TOKEN: 't', full_name: 'A', phone: '07' } as unknown as EventProps;
    expect(sanitizeEventProps(props)).toEqual({});
  });

  it('drops nested objects instead of stringifying them', () => {
    const props = { nested: { a: 1 }, list: [1, 2] } as unknown as EventProps;
    expect(sanitizeEventProps(props)).toEqual({});
  });

  it('caps string values at 120 characters', () => {
    const long = 'x'.repeat(200);
    const out = sanitizeEventProps({ note: long });
    expect(String(out.note).length).toBe(120);
  });

  it('drops null and undefined values', () => {
    expect(sanitizeEventProps({ a: null, b: undefined } as unknown as EventProps)).toEqual({});
  });

  it('caps the number of keys at 12', () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 20; i++) many[`k${i}`] = i;
    expect(Object.keys(sanitizeEventProps(many))).toHaveLength(12);
  });
});

describe('isValidEventName', () => {
  it('accepts snake_case names of sane length', () => {
    expect(isValidEventName('onboarding_step_completed')).toBe(true);
    expect(isValidEventName('link_accept')).toBe(true);
  });

  it('rejects empty, too short, too long, and spaced names', () => {
    expect(isValidEventName('')).toBe(false);
    expect(isValidEventName('ab')).toBe(false);
    expect(isValidEventName('a'.repeat(65))).toBe(false);
    expect(isValidEventName('onboarding step')).toBe(false);
  });
});

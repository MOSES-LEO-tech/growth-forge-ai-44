import { describe, it, expect } from 'vitest';
import {
  ready,
  loading,
  empty,
  failed,
  unavailable,
  isReady,
  formatNumber,
  formatNullable,
} from '@/lib/numeric';

describe('ready()', () => {
  it('accepts real numbers, including 0 and negatives', () => {
    expect(ready(0)).toEqual({ state: 'ready', value: 0 });
    expect(ready(-3)).toEqual({ state: 'ready', value: -3 });
    expect(ready(12.5)).toEqual({ state: 'ready', value: 12.5 });
  });

  it('treats null, undefined and non-finite as empty — never as 0', () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(ready(bad as number | null | undefined)).toEqual({ state: 'empty' });
    }
  });
});

describe('formatNumber() — non-ready states never render a digit', () => {
  const states = [loading(), empty(), failed(), unavailable()];

  it('returns an em dash by default for every non-ready state', () => {
    for (const state of states) {
      expect(formatNumber(state)).toBe('—');
    }
  });

  it('honours a custom fallback', () => {
    expect(formatNumber(empty(), { fallback: 'No data yet' })).toBe('No data yet');
    expect(formatNumber(failed(), { fallback: 'Unavailable' })).toBe('Unavailable');
  });

  it('never leaks NaN or Infinity into the output', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(formatNumber(ready(bad))).toBe('—');
    }
  });
});

describe('formatNumber() — real values', () => {
  it('renders a valid zero as 0', () => {
    expect(formatNumber(ready(0))).toBe('0');
    expect(formatNullable(0)).toBe('0');
  });

  it('preserves negative values (deltas are legitimately negative)', () => {
    expect(formatNumber(ready(-5))).toBe('-5');
  });

  it('groups thousands', () => {
    expect(formatNumber(ready(1234))).toBe('1,234');
  });

  it('formats percentages from a 0..1 ratio', () => {
    expect(formatNumber(ready(0.256), { unit: 'percent' })).toBe('26%');
    expect(formatNumber(ready(1), { unit: 'percent' })).toBe('100%');
    expect(formatNumber(ready(0), { unit: 'percent' })).toBe('0%');
  });

  it('formats bytes with a unit', () => {
    expect(formatNumber(ready(512), { unit: 'bytes' })).toBe('512 B');
    expect(formatNumber(ready(1536), { unit: 'bytes' })).toBe('1.5 KB');
    expect(formatNumber(ready(5 * 1024 * 1024), { unit: 'bytes' })).toBe('5.0 MB');
  });

  it('formats money with a currency', () => {
    expect(formatNumber(ready(3.5), { unit: 'money', currency: 'USD' })).toBe('$3.50');
  });

  it('returns the fallback, not 0, for a missing API field', () => {
    expect(formatNullable(null)).toBe('—');
    expect(formatNullable(undefined)).toBe('—');
  });
});

describe('isReady()', () => {
  it('narrows only ready values', () => {
    expect(isReady(ready(0))).toBe(true);
    expect(isReady(empty())).toBe(false);
    expect(isReady(loading())).toBe(false);
  });
});

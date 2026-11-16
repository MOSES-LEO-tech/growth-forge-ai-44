/**
 * Numeric display contract.
 *
 * Rule: a number on screen is either a real measurement with a known state, or a
 * placeholder. Absence is never rendered as 0, because 0 is a legitimate
 * measurement (a school with no projects has 0 projects, not "no data").
 *
 * Every data-layer mapper that can return a missing number returns NumericValue;
 * every render path formats it with formatNumber().
 */

export type NumericValue =
  | { state: 'loading' }
  | { state: 'ready'; value: number }
  | { state: 'empty' }
  | { state: 'error'; message: string }
  | { state: 'unavailable' };

export const loading = (): NumericValue => ({ state: 'loading' });
export const empty = (): NumericValue => ({ state: 'empty' });
export const failed = (message = 'Could not load'): NumericValue => ({ state: 'error', message });
export const unavailable = (): NumericValue => ({ state: 'unavailable' });

/**
 * Normalises anything that might be a number into the contract.
 * null, undefined and non-finite values become `empty`, never 0.
 */
export function ready(value: number | null | undefined): NumericValue {
  if (value === null || value === undefined) return empty();
  if (typeof value !== 'number' || !Number.isFinite(value)) return empty();
  return { state: 'ready', value };
}

/** Type guard for callers that need the raw value (charts, sorting). */
export function isReady(v: NumericValue): v is { state: 'ready'; value: number } {
  return v.state === 'ready';
}

export type NumericUnit = 'count' | 'percent' | 'bytes' | 'money';

export interface FormatNumberOptions {
  locale?: string;
  unit?: NumericUnit;
  /** ISO 4217 code, used only when unit === 'money'. */
  currency?: string;
  /** What to show for loading/empty/error/unavailable. Defaults to an em dash. */
  fallback?: string;
  maximumFractionDigits?: number;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

function formatBytes(value: number): string {
  const sign = value < 0 ? '-' : '';
  let n = Math.abs(value);
  let i = 0;
  while (n >= 1024 && i < BYTE_UNITS.length - 1) {
    n /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : 1;
  return `${sign}${n.toFixed(digits)} ${BYTE_UNITS[i]}`;
}

/**
 * Formats a NumericValue for display.
 *
 * Guarantees:
 *  - loading / empty / error / unavailable never render a digit (they render `fallback`)
 *  - ready(0) renders "0"
 *  - negative values are preserved (a delta can legitimately be negative)
 *  - NaN / Infinity can never reach the output, because `ready()` rejects them
 */
export function formatNumber(value: NumericValue, options: FormatNumberOptions = {}): string {
  const fallback = options.fallback ?? '—';

  if (value.state !== 'ready') return fallback;

  const n = value.value;
  if (!Number.isFinite(n)) return fallback;

  const locale = options.locale ?? 'en-US';
  const unit = options.unit ?? 'count';

  switch (unit) {
    case 'bytes':
      return formatBytes(n);

    case 'percent':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: options.maximumFractionDigits ?? 0,
      }).format(n);

    case 'money':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: options.currency ?? 'USD',
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
      }).format(n);

    case 'count':
    default:
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: options.maximumFractionDigits ?? 0,
      }).format(n);
  }
}

/**
 * Convenience for the common case: a nullable number straight from an API field.
 * `formatNullable(0)` → "0"; `formatNullable(null)` → "—".
 */
export function formatNullable(
  value: number | null | undefined,
  options: FormatNumberOptions = {}
): string {
  return formatNumber(ready(value), options);
}

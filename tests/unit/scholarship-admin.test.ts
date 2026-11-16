import { describe, it, expect } from 'vitest';
import {
  publishReadiness,
  isPublishable,
  formatAward,
  parseList,
  validateRequirement,
  buildEligibilityRules,
} from '@/lib/scholarshipAdmin';

const complete = {
  title: 'Engineering merit award',
  provider_name: 'Example University',
  provider_contact: 'scholarships@example.ac.ug',
  category: 'merit',
  source_url: 'https://example.ac.ug/call',
  verified_at: '2026-11-13',
  closes_at: '2030-02-28T23:59:00+03:00',
  award_max: 2000000,
  currency: 'UGX',
};

describe('publishReadiness', () => {
  it('passes a fully evidenced listing', () => {
    expect(publishReadiness(complete)).toEqual([]);
    expect(isPublishable(complete)).toBe(true);
  });

  it('blocks a listing with no source', () => {
    const { source_url, ...rest } = complete;
    expect(publishReadiness(rest).join(' ')).toMatch(/source URL/i);
  });

  it('blocks a closing date in the past', () => {
    const row = { ...complete, closes_at: '2020-01-01T00:00:00+03:00' };
    expect(publishReadiness(row).join(' ')).toMatch(/past/i);
  });

  it('blocks an inverted award range', () => {
    const row = { ...complete, award_min: 900, award_max: 100 };
    expect(publishReadiness(row).join(' ')).toMatch(/lower than the minimum/i);
  });

  it('requires some statement of the award', () => {
    const row = { ...complete, award_min: null, award_max: null, award_type: null };
    expect(publishReadiness(row).join(' ')).toMatch(/state the award/i);
  });

  it('accepts an award type instead of an amount', () => {
    const row = { ...complete, award_min: null, award_max: null, award_type: 'tuition' };
    expect(publishReadiness(row)).toEqual([]);
  });

  it('reports every blocker, not just the first', () => {
    expect(publishReadiness({}).length).toBeGreaterThan(4);
  });
});

describe('formatAward', () => {
  it('renders a range with currency', () => {
    expect(formatAward({ award_min: 500000, award_max: 2000000, currency: 'UGX' })).toBe(
      'UGX 500,000 – UGX 2,000,000'
    );
  });

  it('never invents a number it does not have', () => {
    expect(formatAward({ currency: 'UGX' })).toBe('Not stated');
  });

  it('falls back to the award type', () => {
    expect(formatAward({ award_type: 'tuition', currency: 'UGX' })).toBe('tuition');
  });
});

describe('parseList', () => {
  it('splits on semicolons and commas and trims', () => {
    expect(parseList('S5; S6, S6')).toEqual(['S5', 'S6']);
  });

  it('returns an empty array for blanks', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList(null)).toEqual([]);
  });
});

describe('validateRequirement', () => {
  const good = { key: 'report_card', label: 'Your latest report card', doc_type: 'either', max_files: 1 };

  it('accepts a well-formed requirement', () => {
    expect(validateRequirement(good)).toEqual({ ok: true, errors: [] });
  });

  it('rejects keys with spaces or capitals', () => {
    expect(validateRequirement({ ...good, key: 'Report Card' }).ok).toBe(false);
  });

  it('rejects more than three files', () => {
    expect(validateRequirement({ ...good, max_files: 5 }).ok).toBe(false);
  });

  it('requires a student-readable label', () => {
    expect(validateRequirement({ ...good, label: '  ' }).ok).toBe(false);
  });
});

describe('buildEligibilityRules', () => {
  it('only includes values that were set', () => {
    expect(buildEligibilityRules({ levels: ['S5', 'S6'] })).toEqual({ level: ['S5', 'S6'] });
  });

  it('maps editor fields to the matcher vocabulary', () => {
    const rules = buildEligibilityRules({
      levels: ['S4'],
      subjects: ['Mathematics'],
      activities: ['debate'],
      min_grade: 'B',
      need_band: 'high',
    });
    expect(rules).toEqual({
      level: ['S4'],
      subjects_any: ['Mathematics'],
      activities_any: ['debate'],
      min_grade: 'B',
      need_band: 'high',
    });
  });

  it('omits blank values entirely', () => {
    expect(buildEligibilityRules({ min_grade: '  ', need_band: '' })).toEqual({});
  });
});

import { describe, it, expect } from 'vitest';
import { normalizeProjectStatus, getProjectStatusLabel } from '@/lib/projectStatus';

describe('normalizeProjectStatus', () => {
  it('maps every known complete spelling to "complete"', () => {
    for (const value of ['complete', 'completed', 'done', 'COMPLETED', 'Done']) {
      expect(normalizeProjectStatus(value)).toBe('complete');
    }
  });

  it('maps ongoing spellings', () => {
    for (const value of ['ongoing', 'in_progress', 'active']) {
      expect(normalizeProjectStatus(value)).toBe('ongoing');
    }
  });

  it('maps pending spellings and blanks', () => {
    for (const value of ['pending', 'draft', 'new', 'not_started', '', null, undefined]) {
      expect(normalizeProjectStatus(value as string)).toBe('pending');
    }
  });

  it('falls back to pending for unknown values rather than throwing', () => {
    expect(normalizeProjectStatus('archived')).toBe('pending');
  });
});

describe('getProjectStatusLabel', () => {
  it('returns human labels', () => {
    expect(getProjectStatusLabel('completed')).toBe('Completed');
    expect(getProjectStatusLabel('in_progress')).toBe('Ongoing');
    expect(getProjectStatusLabel(null)).toBe('New');
  });
});

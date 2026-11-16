import { describe, it, expect } from 'vitest';
import { validateBadgeFile, badgeUploadPath, MAX_BADGE_BYTES } from '@/lib/schoolBadge';

describe('validateBadgeFile', () => {
  it('accepts png, jpeg, webp and svg', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']) {
      expect(validateBadgeFile({ type, size: 1024 }).ok, type).toBe(true);
    }
  });

  it('rejects non-image files', () => {
    expect(validateBadgeFile({ type: 'application/pdf', size: 1024 }).ok).toBe(false);
    expect(validateBadgeFile({ type: 'video/mp4', size: 1024 }).ok).toBe(false);
  });

  it('rejects files over the badge limit', () => {
    const result = validateBadgeFile({ type: 'image/png', size: MAX_BADGE_BYTES + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/MB/);
  });

  it('rejects empty files', () => {
    expect(validateBadgeFile({ type: 'image/png', size: 0 }).ok).toBe(false);
  });

  it('explains the failure in plain language', () => {
    const result = validateBadgeFile({ type: 'video/mp4', size: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/PNG|JPEG|SVG/i);
  });
});

describe('badgeUploadPath', () => {
  it('scopes the object under the school id and a logo folder', () => {
    const path = badgeUploadPath('abc-123', 'Goodwill SSS Crest.png');
    expect(path.startsWith('abc-123/logo/')).toBe(true);
    expect(path.endsWith('.png')).toBe(true);
  });

  it('strips unsafe characters from the file name', () => {
    const path = badgeUploadPath('abc-123', 'My Crest (v2) #final!.svg');
    const filePart = path.split('/').pop() as string;
    expect(filePart).toMatch(/^[a-z0-9-.]+$/);
  });

  it('produces a different path for the same file name each call', () => {
    const a = badgeUploadPath('abc-123', 'crest.png');
    const b = badgeUploadPath('abc-123', 'crest.png');
    expect(a).not.toBe(b);
  });
});

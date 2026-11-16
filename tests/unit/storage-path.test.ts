import { describe, it, expect } from 'vitest';
import { storagePathFromPublicUrl, SCHOOL_ASSETS_BUCKET } from '@/lib/storagePath';

describe('storagePathFromPublicUrl', () => {
  const base = `https://proj.supabase.co/storage/v1/object/public/${SCHOOL_ASSETS_BUCKET}/`;

  it('extracts the object path from a public storage url', () => {
    expect(storagePathFromPublicUrl(`${base}abc-123/gallery/uuid-photo.jpg`)).toBe(
      'abc-123/gallery/uuid-photo.jpg'
    );
  });

  it('decodes percent-encoded names', () => {
    expect(storagePathFromPublicUrl(`${base}abc-123/gallery/my%20photo.jpg`)).toBe(
      'abc-123/gallery/my photo.jpg'
    );
  });

  it('ignores query strings and fragments', () => {
    expect(storagePathFromPublicUrl(`${base}abc-123/logo/x.png?v=2#frag`)).toBe('abc-123/logo/x.png');
  });

  it('returns null for a foreign host so we never delete someone else\'s file', () => {
    expect(storagePathFromPublicUrl('https://ksph.org/wp-content/uploads/2024/03/x.jpg')).toBeNull();
  });

  it('returns null for a different bucket', () => {
    expect(
      storagePathFromPublicUrl('https://proj.supabase.co/storage/v1/object/public/avatars/a.png')
    ).toBeNull();
  });

  it('returns null for empty, null or non-url input', () => {
    expect(storagePathFromPublicUrl('')).toBeNull();
    expect(storagePathFromPublicUrl(null)).toBeNull();
    expect(storagePathFromPublicUrl(undefined)).toBeNull();
    expect(storagePathFromPublicUrl('not a url')).toBeNull();
  });
});

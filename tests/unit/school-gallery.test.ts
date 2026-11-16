import { describe, it, expect } from 'vitest';
import { selectGalleryImages } from '@/lib/schoolGallery';

describe('selectGalleryImages', () => {
  it('returns nothing when the school supplied no photos', () => {
    expect(selectGalleryImages([], [])).toEqual([]);
    expect(selectGalleryImages(null, [])).toEqual([]);
    expect(selectGalleryImages(undefined, [])).toEqual([]);
  });

  it('never invents a photo for an empty gallery', () => {
    // Regression: the school page used to fall back to six Unsplash URLs, so an
    // empty gallery looked populated with pictures the school never uploaded.
    const result = selectGalleryImages([], []);
    expect(result).toHaveLength(0);
  });

  it('keeps real photos, trimmed and de-duplicated', () => {
    expect(selectGalleryImages(['  a.jpg ', 'a.jpg', 'b.jpg'], [])).toEqual(['a.jpg', 'b.jpg']);
  });

  it('drops urls whose image failed to load', () => {
    expect(selectGalleryImages(['a.jpg', 'b.jpg'], ['a.jpg'])).toEqual(['b.jpg']);
  });

  it('ignores blank and null entries', () => {
    expect(selectGalleryImages(['', null, '   ', 'c.jpg'], [])).toEqual(['c.jpg']);
  });

  it('caps the gallery at six tiles', () => {
    const many = Array.from({ length: 10 }, (_, i) => `${i}.jpg`);
    expect(selectGalleryImages(many, [])).toHaveLength(6);
  });
});

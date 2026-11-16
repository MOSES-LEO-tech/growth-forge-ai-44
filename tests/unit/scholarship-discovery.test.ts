import { describe, it, expect } from 'vitest';
import {
  buildQueries,
  domainOf,
  filterCandidates,
  isBlockedDomain,
  looksLikeScam,
  normalizeUrl,
  scoreCandidate,
} from '@/lib/scholarshipDiscovery';

describe('normalizeUrl', () => {
  it('strips tracking parameters, hash, www and trailing slash', () => {
    expect(normalizeUrl('https://www.provider.ac.ug/call/?utm_source=x&id=7#apply')).toBe(
      'https://provider.ac.ug/call?id=7'
    );
  });

  it('keeps a real query string', () => {
    expect(normalizeUrl('https://a.org/s?page=2')).toBe('https://a.org/s?page=2');
  });

  it('returns the input when it is not a URL', () => {
    expect(normalizeUrl('not a url')).toBe('not a url');
  });
});

describe('domainOf', () => {
  it('drops the www prefix and lowercases', () => {
    expect(domainOf('https://WWW.Example.AC.UG/x')).toBe('example.ac.ug');
  });

  it('returns empty for garbage', () => {
    expect(domainOf('nonsense')).toBe('');
  });
});

describe('isBlockedDomain', () => {
  it('blocks social networks and their subdomains', () => {
    expect(isBlockedDomain('https://facebook.com/x')).toBe(true);
    expect(isBlockedDomain('https://m.facebook.com/x')).toBe(true);
  });

  it('allows a provider domain', () => {
    expect(isBlockedDomain('https://makerere.ac.ug/scholarships')).toBe(false);
  });

  it('blocks invalid URLs', () => {
    expect(isBlockedDomain('nonsense')).toBe(true);
  });
});

describe('looksLikeScam', () => {
  it('flags a registration fee demand', () => {
    expect(looksLikeScam('Pay a registration fee of UGX 20,000 to apply', 'https://x.org')).toBe(true);
  });

  it('flags guaranteed awards', () => {
    expect(looksLikeScam('Guaranteed scholarship for every applicant', 'https://x.org')).toBe(true);
  });

  it('flags a raw IP address and free hosting', () => {
    expect(looksLikeScam('Scholarship 2027', 'http://41.202.1.9/apply')).toBe(true);
    expect(looksLikeScam('Scholarship 2027', 'https://myschool.blogspot.com/p/scholarships.html')).toBe(true);
  });

  it('leaves an ordinary provider page alone', () => {
    expect(looksLikeScam('Applications open for the 2027 intake', 'https://university.ac.ug/awards')).toBe(false);
  });
});

describe('scoreCandidate', () => {
  const base = { title: 'Merit award', snippet: 'Open to S5 and S6 students', url: 'https://someblog.net/a' };

  it('rewards an explicit level mention', () => {
    expect(scoreCandidate(base, { level: 'S5' })).toBeGreaterThan(scoreCandidate(base, {}));
  });

  it('rewards an official domain', () => {
    const official = { ...base, url: 'https://makerere.ac.ug/awards' };
    expect(scoreCandidate(official, {})).toBeGreaterThan(scoreCandidate(base, {}));
  });

  it('rewards need language for a high-need student', () => {
    const bursary = { title: 'Bursary', snippet: 'need-based support', url: 'https://x.org/b' };
    expect(scoreCandidate(bursary, { need_band: 'high' })).toBeGreaterThan(
      scoreCandidate(bursary, { need_band: 'low' })
    );
  });

  it('never returns a percentage-like score', () => {
    expect(scoreCandidate(base, { level: 'S5', region: 'Uganda' })).toBeLessThanOrEqual(12);
  });
});

describe('buildQueries', () => {
  it('builds at most three targeted queries', () => {
    const queries = buildQueries({ level: 'S5', region: 'Uganda', subjects: ['Physics'], need_band: 'high' }, 2027);
    expect(queries).toHaveLength(3);
    expect(queries[0]).toContain('S5');
    expect(queries.join(' ')).toContain('2027');
  });

  it('produces no double spaces', () => {
    for (const query of buildQueries({ level: 'S4' }, 2027)) {
      expect(query).not.toMatch(/\s{2,}/);
    }
  });

  it('still works with an empty profile', () => {
    expect(buildQueries({}, 2027).every((query) => query.length > 10)).toBe(true);
  });
});

describe('filterCandidates', () => {
  const results = [
    { url: 'https://provider.ac.ug/award', title: 'Scholarship award', snippet: 'S5 students' },
    { url: 'https://facebook.com/groups/x', title: 'Group post', snippet: '' },
    { url: 'https://scam.example.net/apply', title: 'Pay a registration fee', snippet: 'send money to apply' },
    { url: 'https://provider.ac.ug/award?utm_source=z', title: 'Award again', snippet: 'duplicate' },
  ];

  it('drops blocked domains, scams and duplicates', () => {
    const out = filterCandidates(results);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://provider.ac.ug/award');
  });

  it('drops results already in the catalog', () => {
    const out = filterCandidates(results, ['https://www.provider.ac.ug/award/']);
    expect(out).toHaveLength(0);
  });

  it('drops results that never mention funding', () => {
    const out = filterCandidates([
      { url: 'https://rocketreach.co/x', title: 'Acorns International School Uganda Competitors' },
      { url: 'https://provider.ac.ug/y', title: 'Bursary for S4 students' },
    ]);
    expect(out.map((item) => item.url)).toEqual(['https://provider.ac.ug/y']);
  });

  it('drops Masters funding for a school student', () => {
    const out = filterCandidates(
      [
        { url: 'https://mak.ac.ug/masters', title: 'Scholarships for Masters Programmes 2026' },
        { url: 'https://mak.ac.ug/undergrad', title: 'Undergraduate scholarship for school leavers' },
      ],
      [],
      'S6'
    );
    expect(out.map((item) => item.url)).toEqual(['https://mak.ac.ug/undergrad']);
  });

  it('keeps Masters results when the student level is unknown', () => {
    const out = filterCandidates([{ url: 'https://mak.ac.ug/masters', title: 'Masters scholarship' }]);
    expect(out).toHaveLength(1);
  });

  it('preserves the incoming order of survivors', () => {
    const out = filterCandidates([
      { url: 'https://a.ac.ug/1', title: 'Scholarship one' },
      { url: 'https://b.ac.ug/2', title: 'Bursary two' },
    ]);
    expect(out.map((item) => item.title)).toEqual(['Scholarship one', 'Bursary two']);
  });
});

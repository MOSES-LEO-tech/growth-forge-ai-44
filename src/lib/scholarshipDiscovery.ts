/**
 * Rules for online scholarship discovery.
 *
 * Kept pure and tested because a bad rule here does real harm: it can put a
 * scam link in front of a 16-year-old, or present an unverified page as if it
 * were a vetted scholarship.
 */

export type DiscoveryProfile = {
  level?: string | null;
  region?: string | null;
  subjects?: string[] | null;
  need_band?: string | null;
  category_interest?: string | null;
};

/** Domains that never host scholarship terms worth linking to. */
const BLOCKED_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "quora.com",
  "reddit.com",
  // Company/market-data directories that match "school" but never list awards.
  "rocketreach.co",
  "tracxn.com",
  "crunchbase.com",
  "zoominfo.com",
  "glassdoor.com",
  "indeed.com",
];

/** A result must actually talk about funding. */
const SCHOLARSHIP_WORDS = /\b(scholarship|scholarships|bursary|bursaries|grant|grants|award|awards|funding|financial aid|sponsorship|tuition)\b/i;

/** Phrases that indicate a pay-to-apply scheme rather than an award. */
const SCAM_PATTERNS = [
  /pay\s*(a\s*)?(registration|application|processing)\s*fee/i,
  /send\s+(money|ugx|cash)\s+to\s+apply/i,
  /guaranteed\s+(award|scholarship)/i,
  /click\s+here\s+to\s+win/i,
  /whatsapp\s+us\s+to\s+pay/i,
];

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Collapse tracking noise so the same page is stored once. */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
    drop.forEach((key) => parsed.searchParams.delete(key));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${host}${path}${search ? `?${search}` : ""}`;
  } catch {
    return url.trim();
  }
}

export function isBlockedDomain(url: string): boolean {
  const domain = domainOf(url);
  if (!domain) return true;
  return BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

export function looksLikeScam(text: string, url: string): boolean {
  const haystack = `${text} ${url}`;
  if (SCAM_PATTERNS.some((pattern) => pattern.test(haystack))) return true;
  // A raw IP address or a free-hosting subdomain is not a provider.
  const domain = domainOf(url);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return true;
  return /\.(weebly|wixsite|blogspot|wordpress|netlify|vercel)\./.test(domain);
}

// Institutional suffixes only. ".org" is deliberately absent: most scholarship
// aggregators and blogs use it, so it would reward noise over providers.
const OFFICIAL_TLDS = [".go.ug", ".ac.ug", ".sch.ug", ".edu", ".gov", ".ac.uk"];

/** Coarse relevance only — never presented as a match percentage. */
export function scoreCandidate(
  candidate: { title: string; snippet: string; url: string },
  profile: DiscoveryProfile
): number {
  const text = `${candidate.title} ${candidate.snippet}`.toLowerCase();
  let score = 0;

  if (profile.level && text.includes(profile.level.toLowerCase())) score += 2;

  const levelWords: Record<string, string[]> = {
    S1: ["senior one", "s1", "junior"],
    S2: ["senior two", "s2"],
    S3: ["senior three", "s3"],
    S4: ["senior four", "s4", "o-level", "o level"],
    S5: ["senior five", "s5", "a-level", "a level"],
    S6: ["senior six", "s6", "a-level", "a level"],
  };
  const words = profile.level ? levelWords[profile.level] ?? [] : [];
  if (words.some((word) => text.includes(word))) score += 1;

  if (profile.region && text.includes(profile.region.toLowerCase())) score += 1;
  if (profile.need_band === "high" && /(bursary|need[- ]based|financial aid|hardship)/.test(text)) score += 2;
  if (profile.subjects?.some((subject) => text.includes(subject.toLowerCase()))) score += 2;
  if (/(deadline|closes|closing date|apply by)/.test(text)) score += 1;

  const domain = domainOf(candidate.url);
  if (OFFICIAL_TLDS.some((tld) => domain.endsWith(tld))) score += 2;

  return score;
}

/** A small set of targeted queries beats one broad one. */
export function buildQueries(profile: DiscoveryProfile, year: number = new Date().getFullYear()): string[] {
  const level = profile.level ? ` ${profile.level}` : "";
  const region = profile.region ? ` ${profile.region}` : "";
  const subject = profile.subjects?.[0] ? ` ${profile.subjects[0]}` : "";
  const need = profile.need_band === "high" ? " bursary need-based" : "";

  const queries = [
    `scholarship${level}${region} Uganda ${year} apply`,
    `bursary${need}${level} secondary school${region} Uganda ${year}`,
    `university scholarship${subject}${level} Uganda ${year} deadline`,
  ];

  return queries.map((query) => query.replace(/\s+/g, " ").trim()).slice(0, 3);
}

/** Keep only plausible, non-duplicate, non-scam results. */
export function filterCandidates<T extends { url: string; title: string; snippet?: string }>(
  results: T[],
  existingUrls: string[] = [],
  level?: string | null
): T[] {
  const seen = new Set(existingUrls.map(normalizeUrl));
  const out: T[] = [];

  for (const result of results) {
    const normalized = normalizeUrl(result.url);
    if (!normalized.startsWith("http")) continue;
    if (seen.has(normalized)) continue;
    if (isBlockedDomain(result.url)) continue;
    if (looksLikeScam(`${result.title} ${result.snippet ?? ""}`, result.url)) continue;
    if (!isScholarshipLike(result)) continue;
    if (isPostgraduateOnly(result, level)) continue;
    seen.add(normalized);
    out.push(result);
  }

  return out;
}

/**
 * True only when the result actually mentions funding. Web search returns
 * company profiles and market reports for "school" queries; those are not leads.
 */
export function isScholarshipLike(candidate: { title: string; snippet?: string }): boolean {
  return SCHOLARSHIP_WORDS.test(`${candidate.title} ${candidate.snippet ?? ""}`);
}

/**
 * A school student (S1–S6) must not be shown Masters or doctoral funding.
 * "Undergraduate" stays: that is exactly what an S6 leaver applies for.
 */
export function isPostgraduateOnly(
  candidate: { title: string; snippet?: string },
  level?: string | null
): boolean {
  if (!level || !/^S[1-6]$/i.test(level.trim())) return false;
  const text = `${candidate.title} ${candidate.snippet ?? ""}`.toLowerCase();
  return /\b(masters?|postgraduate|post-graduate|phd|doctoral|doctorate|msc|mba|mphil)\b/.test(text);
}

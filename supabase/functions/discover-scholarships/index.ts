// discover-scholarships — web search for scholarship leads, on demand.
//
// Deliberately returns *leads*, not scholarships: title, link, snippet, domain,
// and why it surfaced. Nothing here is verified; the widget labels it as found
// online and the student is sent to the provider's own page.
//
// Secrets: TAVILY_API_KEY (search). Service role is used for the write because
// candidates are not readable by students through RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { webSearch } from "./websearch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const BLOCKED = ["facebook.com", "instagram.com", "pinterest.com", "linkedin.com", "tiktok.com", "youtube.com", "twitter.com", "x.com", "quora.com", "reddit.com", "rocketreach.co", "tracxn.com", "crunchbase.com", "zoominfo.com", "glassdoor.com", "indeed.com"];
const SCHOLARSHIP_WORDS = /\b(scholarship|scholarships|bursary|bursaries|grant|grants|award|awards|funding|financial aid|sponsorship|tuition)\b/i;
const POSTGRAD = /\b(masters?|postgraduate|post-graduate|phd|doctoral|doctorate|msc|mba|mphil)\b/;
const SCAM = [
  /pay\s*(a\s*)?(registration|application|processing)\s*fee/i,
  /send\s+(money|ugx|cash)\s+to\s+apply/i,
  /guaranteed\s+(award|scholarship)/i,
  /click\s+here\s+to\s+win/i,
];
const OFFICIAL_TLDS = [".go.ug", ".ac.ug", ".sch.ug", ".edu", ".gov", ".ac.uk"];

const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const normalize = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((key) =>
      parsed.searchParams.delete(key)
    );
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${host}${path}${search ? `?${search}` : ""}`;
  } catch {
    return url.trim();
  }
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const buildQueries = (profile: Record<string, unknown>, year: number): string[] => {
  const level = profile?.level ? ` ${profile.level}` : "";
  const region = profile?.region ? ` ${profile.region}` : "";
  const subject = Array.isArray(profile?.subjects) && profile.subjects[0] ? ` ${profile.subjects[0]}` : "";
  const need = profile?.need_band === "high" ? " bursary need-based" : "";
  return [
    `scholarship${level}${region} Uganda ${year} apply`,
    `bursary${need}${level} secondary school${region} Uganda ${year}`,
    `university scholarship${subject}${level} Uganda ${year} deadline`,
  ].map((query) => query.replace(/\s+/g, " ").trim());
};

const score = (
  candidate: { title: string; snippet: string; url: string },
  profile: Record<string, unknown>
): number => {
  const text = `${candidate.title} ${candidate.snippet}`.toLowerCase();
  let value = 0;
  if (profile?.level && text.includes(String(profile.level).toLowerCase())) value += 2;
  if (profile?.region && text.includes(String(profile.region).toLowerCase())) value += 1;
  if (profile?.need_band === "high" && /(bursary|need[- ]based|financial aid|hardship)/.test(text)) value += 2;
  if (Array.isArray(profile?.subjects) && profile.subjects.some((s: string) => text.includes(s.toLowerCase()))) value += 2;
  if (/(deadline|closes|closing date|apply by)/.test(text)) value += 1;
  const domain = domainOf(candidate.url);
  if (OFFICIAL_TLDS.some((tld) => domain.endsWith(tld))) value += 2;
  return value;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Server is not configured." }, 500);

  // Distinguish "no key configured" from "nothing found" — otherwise a missing
  // secret looks like an empty web to the student.
  if (!Deno.env.get("TAVILY_API_KEY")) {
    return json({ results: [], unavailable: true, reason: "search_not_configured" });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);

  // Identify the caller from their own JWT, not from the body.
  const authClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Sign in required." }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await request.json().catch(() => ({}));

  // Report a bad lead (a student flagging a scam or a dead page).
  if (body?.action === "report" && typeof body?.url === "string") {
    await admin
      .from("scholarship_candidates")
      .update({ flagged_reason: String(body.reason ?? "reported by student").slice(0, 200) })
      .eq("url_normalized", normalize(body.url));
    return json({ ok: true });
  }

  // One live search per six hours per student; cached leads in between.
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: recentRuns } = await admin
    .from("scholarship_discovery_runs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", sixHoursAgo)
    .limit(1);

  const { data: profile } = await admin
    .from("profiles")
    .select("role, grade_level, education_system, class_name, subjects, interests")
    .eq("id", userId)
    .maybeSingle();

  const profileForQueries = {
    level: profile?.grade_level ?? null,
    subjects: profile?.subjects ?? profile?.interests ?? [],
    need_band: null,
    region: "Uganda",
  };

  const { data: existingScholarships } = await admin.from("scholarships").select("source_url").not("source_url", "is", null);
  const existingUrls = (existingScholarships ?? []).map((row: { source_url: string }) => row.source_url);

  if (recentRuns && recentRuns.length > 0) {
    const { data: cached } = await admin
      .from("scholarship_candidates")
      .select("url, title, domain, snippet, score, last_seen_at")
      .in("status", ["new"])
      .order("score", { ascending: false })
      .limit(5);
    return json({ results: cached ?? [], cached: true });
  }

  const queries = buildQueries(profileForQueries, new Date().getFullYear());
  const collected: Array<{ url: string; title: string; snippet: string; query: string }> = [];

  for (const query of queries) {
    const { results } = await webSearch(query, 5);
    for (const result of results) {
      collected.push({ url: result.url, title: result.title, snippet: result.content?.slice(0, 240) ?? "", query });
    }
  }

  const seen = new Set(existingUrls.map(normalize));
  const accepted: Array<{ url: string; title: string; snippet: string; query: string; domain: string; score: number }> = [];

  for (const item of collected) {
    const normalized = normalize(item.url);
    if (!normalized.startsWith("http") || seen.has(normalized)) continue;

    const domain = domainOf(item.url);
    if (!domain) continue;
    if (BLOCKED.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) continue;
    const haystack = `${item.title} ${item.snippet}`;
    if (SCAM.some((pattern) => pattern.test(haystack))) continue;
    if (!SCHOLARSHIP_WORDS.test(haystack)) continue;
    // A school student is never shown Masters or doctoral funding.
    if (profileForQueries.level && POSTGRAD.test(haystack.toLowerCase())) continue;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) continue;

    seen.add(normalized);
    accepted.push({ ...item, domain, score: score(item, profileForQueries) });
  }

  accepted.sort((a, b) => b.score - a.score);
  const top = accepted.slice(0, 8);

  if (top.length > 0) {
    await admin.from("scholarship_candidates").upsert(
      top.map((item) => ({
        url: item.url,
        url_normalized: normalize(item.url),
        title: item.title.slice(0, 300) || item.domain,
        domain: item.domain,
        snippet: item.snippet,
        query: item.query,
        score: item.score,
        status: "new",
        last_seen_at: new Date().toISOString(),
      })),
      { onConflict: "url_normalized" }
    );
  }

  await admin.from("scholarship_discovery_runs").insert({ user_id: userId, queries, results: top.length });

  return json({
    results: top.slice(0, 5).map(({ url, title, domain, snippet, score: value }) => ({
      url, title, domain, snippet, score: value,
    })),
    cached: false,
    queries,
  });
});

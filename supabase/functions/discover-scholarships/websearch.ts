// Tavily web-search helper — function-local copy.
//
// The shared version lives at supabase/functions/_shared/websearch.ts and is used
// by generate-recommendations. It is duplicated here because this function is
// also deployed through the Supabase MCP tool, which uploads a flat file list;
// a `../_shared/...` import does not resolve in that upload path.
// Keep the two copies identical when changing behaviour.

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

export async function webSearch(
  query: string,
  maxResults = 5,
): Promise<{ results: WebSearchResult[] }> {
  const apiKey = Deno.env.get("TAVILY_API_KEY");
  if (!apiKey) {
    console.warn("TAVILY_API_KEY is not configured; skipping web search");
    return { results: [] };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      console.error("Tavily search error:", response.status);
      return { results: [] };
    }

    const data = await response.json();
    const results: WebSearchResult[] = Array.isArray(data?.results)
      ? data.results
          .map((r: any) => ({
            title: String(r?.title ?? ""),
            url: String(r?.url ?? ""),
            content: String(r?.content ?? ""),
          }))
          .filter((r: WebSearchResult) => r.title || r.content)
      : [];

    return { results };
  } catch (error) {
    console.error("Tavily search failed:", error);
    return { results: [] };
  }
}

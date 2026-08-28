// Tavily web-search helper for Supabase Edge Functions.
//
// Gracefully degrades to empty results when the API key is missing or the
// call fails, so dependent features keep working without live web data.

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

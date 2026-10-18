import type { CustomSearchResult } from "@/types";
import { browserHost, browserUrl } from "./browser";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Keep provider data behind the browser's existing result contract. */
export function normalizeTavilySearch(
  value: unknown,
  query: string,
): CustomSearchResult {
  if (!isRecord(value) || !Array.isArray(value.results))
    throw new Error("Invalid search response");
  const seen = new Set<string>();
  const results: CustomSearchResult["results"] = [];
  for (const item of value.results) {
    if (
      !isRecord(item) ||
      typeof item.url !== "string" ||
      typeof item.title !== "string"
    )
      continue;
    const link = browserUrl(item.url);
    if (!link || seen.has(link)) continue;
    seen.add(link);
    const favicon =
      typeof item.favicon === "string" ? browserUrl(item.favicon) : null;
    // Tavily does not document a publisher name; retain one if supplied, otherwise the UI uses the hostname.
    const siteName =
      typeof item.site_name === "string" ? item.site_name.trim() : "";
    results.push({
      ...(favicon ? { favicon } : {}),
      ...(siteName ? { siteName } : {}),
      title: item.title.trim() || browserHost(link),
      link,
      displayLink: browserHost(link),
      formattedUrl: link,
      snippet:
        typeof item.content === "string" ? item.content.slice(0, 650) : "",
    });
    if (results.length === 20) break;
  }
  const time = Number(value.response_time);
  return {
    query,
    totalResults: String(results.length),
    searchTime: Number.isFinite(time) && time >= 0 ? String(time) : "0",
    results,
  };
}

export function browserSearchError(code: unknown): string {
  if (code === "SEARCH_LIMIT_REACHED")
    return "Search limit reached. Try again later.";
  if (code === "SEARCH_TIMEOUT") return "Search took too long. Try again.";
  return "Search is unavailable right now.";
}

export class BrowserSearchFailure extends Error {
  constructor(readonly code: unknown) {
    super("Search unavailable");
  }
}

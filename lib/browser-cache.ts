import type { CustomSearchResult, NewsArticle } from "@/types";
import { browserUrl } from "./browser";
export const NEWS_CACHE_MS = 6 * 60 * 60 * 1000;
export const SEARCH_CACHE_MS = 24 * 60 * 60 * 1000;
export const MAX_SEARCH_CACHE = 30;
export interface CachedValue<T> {
  savedAt: number;
  data: T;
}
export interface SearchCacheEntry extends CachedValue<CustomSearchResult> {
  query: string;
}
export function cacheIsFresh(savedAt: number, ttl: number, now = Date.now()) {
  return (
    Number.isFinite(savedAt) &&
    savedAt > 0 &&
    now >= savedAt &&
    now - savedAt < ttl
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}
function newsData(value: unknown): NewsArticle[] | null {
  if (!Array.isArray(value)) return null;
  const articles: NewsArticle[] = [];
  for (const item of value.slice(0, 5)) {
    if (
      !record(item) ||
      typeof item.title !== "string" ||
      typeof item.url !== "string" ||
      !record(item.source) ||
      typeof item.source.name !== "string"
    )
      continue;
    const url = browserUrl(item.url);
    if (!url) continue;
    articles.push({
      id: typeof item.id === "string" ? item.id : url,
      title: item.title,
      url,
      content: typeof item.content === "string" ? item.content : "",
      description: typeof item.description === "string" ? item.description : "",
      publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
      image: typeof item.image === "string" ? browserUrl(item.image) || "" : "",
      source: {
        name: item.source.name,
        url:
          typeof item.source.url === "string"
            ? browserUrl(item.source.url) || new URL(url).origin
            : new URL(url).origin,
      },
    });
  }
  return articles;
}
function searchData(value: unknown, query: string): CustomSearchResult | null {
  if (!record(value) || !Array.isArray(value.results)) return null;
  const results: CustomSearchResult["results"] = [];
  for (const item of value.results.slice(0, 20)) {
    if (
      !record(item) ||
      typeof item.title !== "string" ||
      typeof item.link !== "string"
    )
      continue;
    const link = browserUrl(item.link);
    if (!link) continue;
    const favicon =
      typeof item.favicon === "string" ? browserUrl(item.favicon) : null;
    results.push({
      title: item.title,
      link,
      formattedUrl: link,
      displayLink: new URL(link).hostname,
      snippet:
        typeof item.snippet === "string" ? item.snippet.slice(0, 650) : "",
      ...(favicon ? { favicon } : {}),
      ...(typeof item.siteName === "string" ? { siteName: item.siteName } : {}),
    });
  }
  return {
    query,
    results,
    totalResults: String(results.length),
    searchTime: typeof value.searchTime === "string" ? value.searchTime : "0",
  };
}
export function restoreBrowserCache(saved: unknown): {
  news: CachedValue<NewsArticle[]> | null;
  searches: SearchCacheEntry[];
} {
  let news: CachedValue<NewsArticle[]> | null = null;
  const searches: SearchCacheEntry[] = [];
  if (!record(saved)) return { news, searches };
  if (
    record(saved.news) &&
    typeof saved.news.savedAt === "number" &&
    cacheIsFresh(saved.news.savedAt, 7 * SEARCH_CACHE_MS)
  ) {
    const data = newsData(saved.news.data);
    if (data) news = { savedAt: saved.news.savedAt, data };
  }
  if (Array.isArray(saved.searches))
    for (const entry of saved.searches.slice(-MAX_SEARCH_CACHE)) {
      if (
        !record(entry) ||
        typeof entry.query !== "string" ||
        typeof entry.savedAt !== "number" ||
        !cacheIsFresh(entry.savedAt, SEARCH_CACHE_MS)
      )
        continue;
      const data = searchData(entry.data, entry.query);
      if (data)
        searches.push({ query: entry.query, savedAt: entry.savedAt, data });
    }
  return { news, searches };
}

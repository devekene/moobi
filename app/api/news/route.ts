import { createSingleFlight } from "@/lib/single-flight";
import { NEWS_CACHE_MS } from "@/lib/browser-cache";
import type { NewsArticle } from "@/types";
const requestNews = createSingleFlight<NewsArticle[]>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim() || "Google";
  const key = process.env.GNEWS_API_KEY;
  if (!key)
    return Response.json(
      { success: false, error: "News unavailable" },
      { status: 503 },
    );
  try {
    const articles = await requestNews(keyword, async () => {
      const params = new URLSearchParams({
        q: keyword,
        lang: "en",
        max: "5",
        apikey: key,
      });
      const response = await fetch(`https://gnews.io/api/v4/search?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
        cache: "force-cache",
        next: { revalidate: NEWS_CACHE_MS / 1000 },
      });
      if (!response.ok) throw new Error("News unavailable");
      const data: { articles?: NewsArticle[] } = await response.json();
      if (!Array.isArray(data.articles))
        throw new Error("Invalid news response");
      return data.articles;
    });
    return Response.json({ success: true, data: articles });
  } catch {
    return Response.json(
      { success: false, error: "News unavailable" },
      { status: 502 },
    );
  }
}

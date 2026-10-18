import { SEARCH_CACHE_MS } from "@/lib/browser-cache";
import { createSingleFlight } from "@/lib/single-flight";
import { normalizeTavilySearch } from "@/lib/browser-search";
import type { CustomSearchResult } from "@/types";
type Outcome =
  | { success: true; data: CustomSearchResult }
  | { success: false; code: string; status: number };
const requestSearch = createSingleFlight<Outcome>();
function failure(code: string, status: number) {
  return Response.json(
    { success: false, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return failure("SEARCH_QUERY_REQUIRED", 400);
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return failure("SEARCH_NOT_CONFIGURED", 503);
  if (request.signal.aborted) return failure("SEARCH_TIMEOUT", 504);
  const outcome = await requestSearch(query, async () => {
    // One disconnected caller must not cancel another caller's shared provider request.
    const signal = AbortSignal.timeout(12000);
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query,
          topic: "general",
          search_depth: "basic",
          max_results: 20,
          chunks_per_source: 1,
          auto_parameters: false,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
          include_favicon: true,
        }),
        signal,
        cache: "force-cache",
        next: { revalidate: SEARCH_CACHE_MS / 1000 },
      });
      if (!response.ok) {
        console.warn("Browser search provider rejected request", {
          status: response.status,
        });
        if ([429, 432, 433].includes(response.status))
          return { success: false, code: "SEARCH_LIMIT_REACHED", status: 429 };
        if ([401, 403].includes(response.status))
          return {
            success: false,
            code: "SEARCH_CREDENTIALS_REJECTED",
            status: 503,
          };
        return { success: false, code: "SEARCH_UPSTREAM_FAILED", status: 502 };
      }
      return {
        success: true,
        data: normalizeTavilySearch(await response.json(), query),
      };
    } catch {
      return {
        success: false,
        code: signal.aborted ? "SEARCH_TIMEOUT" : "SEARCH_UPSTREAM_FAILED",
        status: signal.aborted ? 504 : 502,
      };
    }
  });
  return outcome.success
    ? Response.json(outcome, { headers: { "Cache-Control": "no-store" } })
    : failure(outcome.code, outcome.status);
}

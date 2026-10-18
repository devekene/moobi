import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/browser/search/route";
import { normalizeTavilySearch } from "@/lib/browser-search";
const fetchMock = vi.fn<typeof fetch>();
const call = (query = "design%20%26%20art") =>
  GET(new Request(`http://localhost/api/browser/search?q=${query}`));
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.stubEnv("TAVILY_API_KEY", "test-tavily-key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("Tavily browser search route", () => {
  it("uses one basic search and returns the browser's result contract", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        results: [
          {
            title: "Design",
            url: "https://example.com/art",
            content: "A useful snippet",
          },
        ],
        response_time: 0.42,
      }),
    );
    const response = await call();
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-tavily-key",
        }),
        cache: "force-cache",
        next: { revalidate: 86400 },
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      query: "design & art",
      topic: "general",
      search_depth: "basic",
      max_results: 20,
      chunks_per_source: 1,
      auto_parameters: false,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      include_favicon: true,
    });
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      data: {
        query: "design & art",
        totalResults: "1",
        searchTime: "0.42",
        results: [
          {
            title: "Design",
            link: "https://example.com/art",
            formattedUrl: "https://example.com/art",
            displayLink: "example.com",
            snippet: "A useful snippet",
          },
        ],
      },
    });
    expect(data.data.nextPage).toBeUndefined();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(data)).not.toContain("test-tavily-key");
  });
  it("combines simultaneous identical provider searches", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
    const responses = await Promise.all([call("shared"), call("shared")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const response of responses)
      expect((await response.json()).success).toBe(true);
  });
  it("rejects empty queries and missing credentials before contacting Tavily", async () => {
    expect((await call("%20%20")).status).toBe(400);
    vi.stubEnv("TAVILY_API_KEY", "");
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      code: "SEARCH_NOT_CONFIGURED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([429, 432, 433])(
    "surfaces provider limit %s without exposing upstream messages",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ detail: "secret upstream text" }, { status }),
      );
      const response = await call();
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        success: false,
        code: "SEARCH_LIMIT_REACHED",
      });
    },
  );
  it.each([401, 403])("handles rejected credentials (%s)", async (status) => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "test-tavily-key" }, { status }),
    );
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      code: "SEARCH_CREDENTIALS_REJECTED",
    });
  });
  it("handles empty results, malformed payloads, and network failures", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
    expect((await (await call()).json()).data.results).toEqual([]);
    fetchMock.mockResolvedValueOnce(Response.json({ unexpected: true }));
    expect((await call()).status).toBe(502);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect((await call()).status).toBe(502);
  });
  it("handles cancellation as a timeout without leaking provider details", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockImplementation(async (_url, options) => {
      options?.signal?.throwIfAborted();
      return Response.json({ results: [] });
    });
    const response = await GET(
      new Request("http://localhost/api/browser/search?q=test", {
        signal: controller.signal,
      }),
    );
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      success: false,
      code: "SEARCH_TIMEOUT",
    });
  });
});
describe("Tavily result normalization", () => {
  it("filters unsafe, duplicate and invalid results without losing valid links", () => {
    const data = normalizeTavilySearch(
      {
        results: [
          null,
          { title: "Unsafe", url: "javascript:alert(1)" },
          {
            title: "First",
            url: "https://example.com",
            content: "a".repeat(1000),
          },
          { title: "Duplicate", url: "https://example.com/" },
          { title: "Missing URL" },
          { title: "", url: "https://other.example" },
        ],
        response_time: "invalid",
      },
      "test",
    );
    expect(data.results).toHaveLength(2);
    expect(data.results[0].snippet).toHaveLength(650);
    expect(data.results[1].title).toBe("other.example");
    expect(data.searchTime).toBe("0");
    expect(() => normalizeTavilySearch(null, "test")).toThrow();
  });
});

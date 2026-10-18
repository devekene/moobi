import { useBrowserCacheStore } from "@/stores/useBrowserCacheStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeBrowserTab, useBrowserStore } from "@/stores/useBrowserStore";
import { GET } from "@/app/api/news/route";
const mockFetch = vi.fn<typeof fetch>();
const article = {
  title: "A new discovery",
  url: "https://news.example/story",
  source: { name: "Science", url: "https://news.example" },
  image: "",
};
beforeEach(() => {
  useBrowserCacheStore.setState({ news: null, searches: [] });
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  useBrowserStore.setState({ newsArticles: [], newsStatus: "idle" });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("browser news", () => {
  it("loads GNews stories once across home visits, with explicit refresh", async () => {
    mockFetch.mockImplementation(async () =>
      Response.json({ success: true, data: [article] }),
    );
    await useBrowserStore.getState().fetchNewsArticles();
    await useBrowserStore.getState().fetchNewsArticles();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/news?keyword=Google");
    expect(useBrowserStore.getState().newsArticles[0].title).toBe(
      article.title,
    );
    expect(useBrowserStore.getState().newsStatus).toBe("ready");
    await useBrowserStore.getState().fetchNewsArticles(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
  it("recovers from failure and handles an empty feed without endless loading", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    await useBrowserStore.getState().fetchNewsArticles();
    expect(useBrowserStore.getState().newsStatus).toBe("error");
    mockFetch.mockResolvedValueOnce(Response.json({ success: true, data: [] }));
    await useBrowserStore.getState().fetchNewsArticles(true);
    expect(useBrowserStore.getState().newsStatus).toBe("ready");
    expect(useBrowserStore.getState().newsArticles).toEqual([]);
  });
  it("filters unsafe article links and opens a story through browser navigation", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json({
        success: true,
        data: [article, { ...article, url: "javascript:alert(1)" }],
      }),
    );
    await useBrowserStore.getState().fetchNewsArticles();
    expect(useBrowserStore.getState().newsArticles).toHaveLength(1);
    useBrowserStore
      .getState()
      .setSelectedUrl({ title: article.title, link: article.url });
    expect(activeBrowserTab(useBrowserStore.getState()).screen).toBe(
      "browser-frame",
    );
    expect(activeBrowserTab(useBrowserStore.getState()).selectedUrl?.link).toBe(
      article.url,
    );
  });
});
describe("news route", () => {
  it("encodes keyword parameters and returns provider articles", async () => {
    vi.stubEnv("GNEWS_API_KEY", "test-news-key");
    mockFetch.mockResolvedValueOnce(Response.json({ articles: [article] }));
    const response = await GET(
      new Request("http://localhost/api/news?keyword=art%20%26%20design"),
    );
    const url = new URL(String(mockFetch.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("art & design");
    expect(url.searchParams.get("apikey")).toBe("test-news-key");
    expect(mockFetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: 21600 },
      }),
    );
    expect(await response.json()).toEqual({ success: true, data: [article] });
  });
  it("combines simultaneous news requests", async () => {
    vi.stubEnv("GNEWS_API_KEY", "test-news-key");
    mockFetch.mockResolvedValueOnce(Response.json({ articles: [article] }));
    const responses = await Promise.all([
      GET(new Request("http://localhost/api/news?keyword=shared")),
      GET(new Request("http://localhost/api/news?keyword=shared")),
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    for (const response of responses)
      expect((await response.json()).data).toEqual([article]);
  });
  it("handles unavailable credentials and upstream errors without exposing keys", async () => {
    vi.stubEnv("GNEWS_API_KEY", "");
    expect((await GET(new Request("http://localhost/api/news"))).status).toBe(
      503,
    );
    expect(mockFetch).not.toHaveBeenCalled();
    vi.stubEnv("GNEWS_API_KEY", "test-news-key");
    mockFetch.mockResolvedValueOnce(Response.json({}, { status: 429 }));
    const response = await GET(new Request("http://localhost/api/news"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("test-news-key");
  });
});

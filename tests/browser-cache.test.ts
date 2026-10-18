import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBrowserCacheStore,
  useBrowserCacheStore,
} from "@/stores/useBrowserCacheStore";
import {
  NEWS_CACHE_MS,
  SEARCH_CACHE_MS,
  MAX_SEARCH_CACHE,
} from "@/lib/browser-cache";
import { createCipher, createEncryptedStorage } from "@/lib/encrypted-storage";
import { useBrowserStore, activeBrowserTab } from "@/stores/useBrowserStore";
import { createBrowserTab } from "@/lib/browser-tabs";
import type { StateStorage } from "zustand/middleware";
import type { CustomSearchResult } from "@/types";
const results = (query: string): CustomSearchResult => ({
  query,
  results: [
    { title: query, link: "https://example.com/", snippet: "A result" },
  ],
  totalResults: "1",
  searchTime: "0.1",
});
const article = {
  id: "1",
  title: "News",
  url: "https://news.example/story",
  content: "",
  description: "",
  publishedAt: "",
  image: "",
  source: { name: "Example", url: "https://news.example/" },
};
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
  useBrowserCacheStore.setState({ news: null, searches: [] });
  const tab = createBrowserTab();
  useBrowserStore.setState({
    ...useBrowserStore.getInitialState(),
    tabs: [tab],
    activeTabId: tab.id,
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function storage() {
  const saved = new Map<string, string>();
  const backend: StateStorage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
    removeItem: (key) => {
      saved.delete(key);
    },
  };
  return { saved, backend };
}
describe("persistent browser caching", () => {
  it("reuses news across reloads and expires it after six hours", async () => {
    const { backend } = storage();
    const first = createBrowserCacheStore(backend);
    first.getState().cacheNews([article]);
    const reopened = createBrowserCacheStore(backend);
    await reopened.persist.rehydrate();
    expect(reopened.getState().getNews()).toEqual([article]);
    vi.advanceTimersByTime(NEWS_CACHE_MS);
    expect(reopened.getState().getNews()).toBeNull();
    expect(reopened.getState().getNews(true)).toEqual([article]);
  });
  it("stores bounded search results for 24 hours and never extends TTL on reads", () => {
    const cache = createBrowserCacheStore(storage().backend);
    cache.getState().cacheSearch("test", results("test"));
    vi.advanceTimersByTime(SEARCH_CACHE_MS - 1);
    expect(cache.getState().getSearch(" test ")?.query).toBe("test");
    vi.advanceTimersByTime(1);
    expect(cache.getState().getSearch("test")).toBeNull();
    for (let index = 0; index < MAX_SEARCH_CACHE + 5; index++)
      cache.getState().cacheSearch(`query ${index}`, results(`query ${index}`));
    expect(cache.getState().searches).toHaveLength(MAX_SEARCH_CACHE);
    expect(cache.getState().getSearch("query 0")).toBeNull();
  });
  it("uses the shared encryption boundary and hydrates a new cache instance", async () => {
    const { backend, saved } = storage();
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const encrypted = createEncryptedStorage(
      backend,
      createCipher(async () => key),
      () => {},
    );
    const cache = createBrowserCacheStore(encrypted);
    await cache.persist.rehydrate();
    cache.getState().cacheSearch("private query", results("private query"));
    await encrypted.retryWrites();
    expect(saved.get("moobi-browser-cache")).not.toContain("private query");
    const reopened = createBrowserCacheStore(encrypted);
    await reopened.persist.rehydrate();
    expect(reopened.getState().getSearch("private query")?.query).toBe(
      "private query",
    );
  });
  it("rejects malformed cache entries and future timestamps on hydration", async () => {
    const { backend, saved } = storage();
    saved.set(
      "moobi-browser-cache",
      JSON.stringify({
        version: 1,
        state: {
          news: { savedAt: Date.now() + 99999, data: [article] },
          searches: [{ query: "bad", savedAt: Date.now(), data: null }],
        },
      }),
    );
    const cache = createBrowserCacheStore(backend);
    await cache.persist.rehydrate();
    expect(cache.getState().news).toBeNull();
    expect(cache.getState().searches).toEqual([]);
  });
});
describe("cached browser requests", () => {
  it("does not fetch fresh cached news even after the transient browser store resets", async () => {
    useBrowserCacheStore.getState().cacheNews([article]);
    await useBrowserStore.getState().fetchNewsArticles();
    useBrowserStore.setState({ newsArticles: [], newsStatus: "idle" });
    await useBrowserStore.getState().fetchNewsArticles();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useBrowserStore.getState().newsArticles).toEqual([article]);
  });
  it("keeps stale news visible if refresh fails", async () => {
    useBrowserCacheStore.getState().cacheNews([article]);
    vi.advanceTimersByTime(NEWS_CACHE_MS);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await useBrowserStore.getState().fetchNewsArticles();
    expect(useBrowserStore.getState().newsArticles).toEqual([article]);
    expect(useBrowserStore.getState().newsStatus).toBe("error");
  });
  it("reuses a query across tabs without another request", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ success: true, data: results("design") }),
    );
    await useBrowserStore.getState().handleSearch("design");
    useBrowserStore.getState().newTab();
    await useBrowserStore.getState().handleSearch("design");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      activeBrowserTab(useBrowserStore.getState()).searchResults?.query,
    ).toBe("design");
    vi.advanceTimersByTime(SEARCH_CACHE_MS);
    await useBrowserStore.getState().handleSearch("design");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("combines identical in-flight searches and lets one tab close without cancelling the other", async () => {
    let finish: ((value: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const firstId = useBrowserStore.getState().activeTabId;
    const first = useBrowserStore.getState().handleSearch("design");
    const signal = fetchMock.mock.calls[0][1]?.signal;
    useBrowserStore.getState().newTab();
    const second = useBrowserStore.getState().handleSearch("design");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    useBrowserStore.getState().closeTab(firstId);
    expect(signal?.aborted).toBe(false);
    finish?.(Response.json({ success: true, data: results("design") }));
    await Promise.all([first, second]);
    expect(
      activeBrowserTab(useBrowserStore.getState()).searchResults?.query,
    ).toBe("design");
  });
});

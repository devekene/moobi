import { useBrowserCacheStore } from "@/stores/useBrowserCacheStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserUrl } from "@/lib/browser";
import { createBrowserTab } from "@/lib/browser-tabs";
import { activeBrowserTab, useBrowserStore } from "@/stores/useBrowserStore";
const store = useBrowserStore;
const active = () => activeBrowserTab(store.getState());
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  useBrowserCacheStore.setState({ news: null, searches: [] });
  const tab = createBrowserTab();
  store.setState({
    ...store.getInitialState(),
    tabs: [tab],
    activeTabId: tab.id,
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
describe("browser addresses", () => {
  it("distinguishes URLs from search and rejects non-web schemes", () => {
    expect(browserUrl("example.com/path?q=hello")).toBe(
      "https://example.com/path?q=hello",
    );
    for (const value of [
      "hello world",
      "curiosity",
      "javascript:alert(1)",
      "data:text/html,hello",
      "file:///etc/passwd",
      "https://user:secret@example.com",
    ])
      expect(browserUrl(value)).toBeNull();
  });
  it("opens addresses directly without a search API", async () => {
    await store.getState().handleSearch("example.com");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(active().screen).toBe("browser-frame");
    expect(store.getState().history[0].url).toBe("https://example.com/");
  });
});
describe("browser state", () => {
  it("returns direct visits to home and search visits to their results", async () => {
    await store.getState().handleSearch("example.com");
    store.getState().goBack();
    expect(active().screen).toBe("browser-home");
    store.setState(({ tabs }) => ({
      tabs: tabs.map((tab) => ({
        ...tab,
        searchResults: {
          query: "design",
          totalResults: "1",
          searchTime: "0",
          results: [],
        },
      })),
    }));
    await store.getState().handleSearch("example.com");
    store.getState().goBack();
    expect(active().screen).toBe("browser-search-results");
  });
  it("toggles canonical bookmarks and rejects unsafe pages", () => {
    store.getState().toggleBookmark("example.com");
    expect(store.getState().bookmarks).toEqual(["https://example.com/"]);
    store.getState().toggleBookmark("https://example.com/");
    store.getState().toggleBookmark("javascript:alert(1)");
    expect(store.getState().bookmarks).toEqual([]);
  });
  it("deduplicates visits and clears history", async () => {
    await store.getState().handleSearch("example.com");
    await store.getState().handleSearch("example.com");
    expect(store.getState().history).toHaveLength(1);
    store.getState().clearHistory();
    expect(store.getState().history).toEqual([]);
  });
  it("makes search failures recoverable and encodes queries", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ success: false }, { status: 500 }),
    );
    await store.getState().handleSearch("design & art");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/browser/search?q=design%20%26%20art",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(active().searchError).toBeTruthy();
    expect(active().isSearching).toBe(false);
    fetchMock.mockResolvedValueOnce(
      Response.json({
        success: true,
        data: {
          query: "design & art",
          results: [],
          totalResults: "0",
          searchTime: "0",
        },
      }),
    );
    await store.getState().handleSearch("design & art");
    expect(active().searchError).toBeNull();
    expect(active().searchResults?.results).toEqual([]);
  });
  it("shows actionable quota and timeout messages", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { success: false, code: "SEARCH_LIMIT_REACHED" },
        { status: 429 },
      ),
    );
    await store.getState().handleSearch("test quota");
    expect(active().searchError).toBe("Search limit reached. Try again later.");
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { success: false, code: "SEARCH_TIMEOUT" },
        { status: 504 },
      ),
    );
    await store.getState().handleSearch("test timeout");
    expect(active().searchError).toBe("Search took too long. Try again.");
  });
  it("does not let late search responses override navigation", async () => {
    let finish: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const search = store.getState().handleSearch("design");
    await store.getState().handleSearch("example.com");
    finish?.(
      Response.json({ success: true, data: { query: "design", results: [] } }),
    );
    await search;
    expect(active().screen).toBe("browser-frame");
    expect(active().searchResults).toBeNull();
    expect(active().isSearching).toBe(false);
  });
});

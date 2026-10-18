import { useBrowserCacheStore } from "@/stores/useBrowserCacheStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeBrowserTab,
  useBrowserStore as store,
} from "@/stores/useBrowserStore";
import { createBrowserTab } from "@/lib/browser-tabs";
const fetchMock = vi.fn<typeof fetch>();
const result = (query: string) =>
  Response.json({
    success: true,
    data: {
      query,
      totalResults: "1",
      searchTime: "0",
      results: [{ title: query, link: "https://example.com/" }],
    },
  });
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
const active = () => activeBrowserTab(store.getState());
describe("browser tabs", () => {
  it("creates and switches tabs without resetting their pages or address drafts", async () => {
    const first = active().id;
    await store.getState().handleSearch("example.com");
    store.getState().setAddressInput(first, "unfinished search");
    store.getState().setTabSwitcherOpen(true);
    store.getState().newTab();
    const second = active().id;
    expect(store.getState().tabs).toHaveLength(2);
    expect(active().screen).toBe("browser-home");
    expect(store.getState().tabSwitcherOpen).toBe(false);
    await store.getState().handleSearch("wikipedia.org");
    store.getState().selectTab(first);
    expect(active().selectedUrl?.link).toBe("https://example.com/");
    expect(active().addressInput).toBe("unfinished search");
    store.getState().selectTab(second);
    expect(active().selectedUrl?.link).toBe("https://wikipedia.org/");
  });
  it("returns concurrent searches to their originating tabs", async () => {
    let finishFirst: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    );
    const first = active().id;
    const search = store.getState().handleSearch("architecture");
    store.getState().newTab();
    const second = active().id;
    fetchMock.mockResolvedValueOnce(result("design"));
    await store.getState().handleSearch("design");
    finishFirst?.(result("architecture"));
    await search;
    expect(active().id).toBe(second);
    expect(active().searchResults?.query).toBe("design");
    store.getState().selectTab(first);
    expect(active().searchResults?.query).toBe("architecture");
    expect(active().isSearching).toBe(false);
  });
  it("ignores late results after closing a tab", async () => {
    let finish: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const closed = active().id;
    const search = store.getState().handleSearch("architecture");
    const signal = fetchMock.mock.calls[0][1]?.signal;
    store.getState().closeTab(closed);
    expect(signal?.aborted).toBe(true);
    const replacement = active().id;
    finish?.(result("architecture"));
    await search;
    expect(store.getState().tabs).toHaveLength(1);
    expect(active().id).toBe(replacement);
    expect(active().screen).toBe("browser-home");
    expect(active().searchResults).toBeNull();
    expect(store.getState().history).toEqual([]);
  });
  it("closes the active tab onto its neighbor and leaves inactive closes alone", () => {
    const first = active().id;
    store.getState().newTab();
    const second = active().id;
    store.getState().newTab();
    const third = active().id;
    store.getState().closeTab(third);
    expect(active().id).toBe(second);
    store.getState().closeTab(first);
    expect(active().id).toBe(second);
    store.getState().closeTab("missing");
    expect(store.getState().tabs).toHaveLength(1);
    store.getState().closeTab(second);
    expect(active().id).not.toBe(second);
    expect(active().screen).toBe("browser-home");
    expect(store.getState().tabs).toHaveLength(1);
  });
  it("shares bookmarks and history while keeping page navigation independent", async () => {
    const first = active().id;
    await store.getState().handleSearch("example.com");
    store.getState().toggleBookmark("example.com");
    store.getState().newTab();
    expect(store.getState().bookmarks).toEqual(["https://example.com/"]);
    expect(store.getState().history).toHaveLength(1);
    store.getState().changeBrowserScreen("browser-history");
    store.getState().selectTab(first);
    expect(active().screen).toBe("browser-frame");
  });
  it("keeps each connection stage and ignores stale visit updates", async () => {
    await store.getState().handleSearch("example.com");
    const first = active();
    store.getState().setVisitStage(first.id, first.visitId, "external");
    store.getState().newTab();
    store.getState().selectTab(first.id);
    expect(active().visitStage).toBe("external");
    await store.getState().handleSearch("wikipedia.org");
    store.getState().setVisitStage(first.id, first.visitId, "external");
    expect(active().visitStage).toBe("checking");
  });
  it("closes the tab switcher on Back before navigating the page", async () => {
    await store.getState().handleSearch("example.com");
    store.getState().setTabSwitcherOpen(true);
    store.getState().goBack();
    expect(store.getState().tabSwitcherOpen).toBe(false);
    expect(active().screen).toBe("browser-frame");
    store.getState().goBack();
    expect(active().screen).toBe("browser-home");
  });
  it("does not switch to missing tabs", () => {
    const first = active().id;
    store.getState().selectTab("missing");
    expect(active().id).toBe(first);
  });
});

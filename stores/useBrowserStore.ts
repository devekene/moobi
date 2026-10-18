import type {
  BrowserScreen,
  CustomSearchResult,
  CustomSearchResultData,
  HistoryType,
  NewsArticle,
} from "@/types";
import { useBrowserCacheStore } from "@/stores/useBrowserCacheStore";
import { createSharedRequest } from "@/lib/shared-request";
import { BrowserSearchFailure, browserSearchError } from "@/lib/browser-search";
import { browserHost, browserUrl } from "@/lib/browser";
import { create } from "zustand";

import { createBrowserTab, type BrowserTab } from "@/lib/browser-tabs";
import type { VisitStage } from "@/lib/browser-visit";

interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string;
  tabSwitcherOpen: boolean;
  setTabSwitcherOpen: (open: boolean) => void;
  newTab: () => void;
  selectTab: (id: string) => void;
  closeTab: (id: string) => void;
  setAddressInput: (id: string, value: string) => void;
  setVisitStage: (id: string, visitId: number, stage: VisitStage) => void;
  newsArticles: NewsArticle[];
  newsStatus: "idle" | "loading" | "ready" | "error";
  fetchNewsArticles: (refresh?: boolean) => Promise<void>;
  changeBrowserScreen: (screen: BrowserScreen, tabId?: string) => void;
  goBack: () => void;
  bookmarks: string[];
  toggleBookmark: (url: string) => void;
  history: HistoryType[];
  setHistory: (query: string, url?: string) => void;
  clearHistory: () => void;
  handleSearch: (query: string, tabId?: string) => Promise<void>;
  setSelectedUrl: (selected: CustomSearchResultData, tabId?: string) => void;
}
export function activeBrowserTab(
  state: Pick<BrowserState, "tabs" | "activeTabId">,
): BrowserTab {
  return (
    state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0]
  );
}
const initialTab = createBrowserTab();
export const useBrowserStore = create<BrowserState>((set, get) => {
  const searches = new Map<string, AbortController>();
  const sharedSearch = createSharedRequest<CustomSearchResult>();
  function cancelSearch(id: string) {
    searches.get(id)?.abort();
    searches.delete(id);
  }
  function updateTab(id: string, update: (tab: BrowserTab) => BrowserTab) {
    set(({ tabs }) => ({
      tabs: tabs.map((tab) => (tab.id === id ? update(tab) : tab)),
    }));
  }
  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    tabSwitcherOpen: false,
    setTabSwitcherOpen: (open) => set({ tabSwitcherOpen: open }),
    newTab: () => {
      const tab = createBrowserTab();
      set(({ tabs }) => ({
        tabs: [...tabs, tab],
        activeTabId: tab.id,
        tabSwitcherOpen: false,
      }));
    },
    selectTab: (id) => {
      if (get().tabs.some((tab) => tab.id === id))
        set({ activeTabId: id, tabSwitcherOpen: false });
    },
    closeTab: (id) => {
      const { tabs, activeTabId } = get();
      const index = tabs.findIndex((tab) => tab.id === id);
      if (index < 0) return;
      cancelSearch(id);
      const remaining = tabs.filter((tab) => tab.id !== id);
      if (!remaining.length) {
        const tab = createBrowserTab();
        set({ tabs: [tab], activeTabId: tab.id });
        return;
      }
      set({
        tabs: remaining,
        activeTabId:
          activeTabId === id
            ? remaining[Math.max(0, index - 1)].id
            : activeTabId,
      });
    },
    setAddressInput: (id, value) =>
      updateTab(id, (tab) => ({ ...tab, addressInput: value })),
    setVisitStage: (id, visitId, stage) =>
      updateTab(id, (tab) =>
        tab.visitId === visitId ? { ...tab, visitStage: stage } : tab,
      ),
    newsArticles: [],
    newsStatus: "idle",
    fetchNewsArticles: async (refresh = false) => {
      const { newsStatus } = get();
      if (newsStatus === "loading") return;
      const cache = useBrowserCacheStore.getState();
      const fresh = cache.getNews();
      if (!refresh && fresh) {
        set({ newsArticles: fresh, newsStatus: "ready" });
        return;
      }
      if (!refresh && newsStatus === "error") return;
      const stale = cache.getNews(true);
      set({ newsStatus: "loading", ...(stale ? { newsArticles: stale } : {}) });
      try {
        const response = await fetch("/api/news?keyword=Google", {
          signal: AbortSignal.timeout(15000),
        });
        const result: { success: boolean; data?: NewsArticle[] } =
          await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data))
          throw new Error("News unavailable");
        const data = result.data.filter((article) => browserUrl(article.url));
        cache.cacheNews(data);
        set({ newsArticles: data, newsStatus: "ready" });
      } catch {
        set({ newsStatus: "error" });
      }
    },
    history: [],
    bookmarks: [],
    changeBrowserScreen: (screen, tabId = get().activeTabId) => {
      cancelSearch(tabId);
      updateTab(tabId, (tab) => ({
        ...tab,
        screen,
        isSearching: false,
        searchError: null,
        requestId: tab.requestId + 1,
        addressInput:
          screen === "browser-frame"
            ? tab.selectedUrl?.link || ""
            : screen === "browser-search-results"
              ? tab.query
              : "",
      }));
    },
    goBack: () => {
      if (get().tabSwitcherOpen) {
        set({ tabSwitcherOpen: false });
        return;
      }
      const tab = activeBrowserTab(get());
      get().changeBrowserScreen(
        tab.screen === "browser-frame" && tab.searchResults
          ? "browser-search-results"
          : "browser-home",
      );
    },
    toggleBookmark: (value) => {
      const url = browserUrl(value);
      if (!url) return;
      set(({ bookmarks }) => ({
        bookmarks: bookmarks.includes(url)
          ? bookmarks.filter((item) => item !== url)
          : [...bookmarks, url],
      }));
    },
    setHistory: (query, url) =>
      set(({ history }) => ({
        history: [
          {
            id: Date.now(),
            query,
            url,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...history.filter((item) =>
            url ? item.url !== url : item.query !== query,
          ),
        ].slice(0, 100),
      })),
    clearHistory: () => set({ history: [] }),
    setSelectedUrl: (selected, tabId = get().activeTabId) => {
      const link = browserUrl(selected.link);
      if (!link || !get().tabs.some((tab) => tab.id === tabId)) return;
      cancelSearch(tabId);
      get().setHistory(selected.title, link);
      updateTab(tabId, (tab) => ({
        ...tab,
        selectedUrl: { ...selected, link },
        screen: "browser-frame",
        addressInput: link,
        isSearching: false,
        searchError: null,
        requestId: tab.requestId + 1,
        visitId: tab.visitId + 1,
        visitStage: "checking",
      }));
    },
    handleSearch: async (input, tabId = get().activeTabId) => {
      const query = input.trim();
      if (!query) return;
      const url = browserUrl(query);
      if (url) {
        get().setSelectedUrl({ title: browserHost(url), link: url }, tabId);
        return;
      }
      const tab = get().tabs.find((item) => item.id === tabId);
      if (!tab) return;
      cancelSearch(tabId);
      const cached = useBrowserCacheStore.getState().getSearch(query);
      if (cached) {
        get().setHistory(query);
        updateTab(tabId, (current) => ({
          ...current,
          requestId: current.requestId + 1,
          isSearching: false,
          searchError: null,
          query,
          addressInput: query,
          screen: "browser-search-results",
          searchResults: cached,
        }));
        return;
      }
      const controller = new AbortController();
      searches.set(tabId, controller);
      const requestId = tab.requestId + 1;
      updateTab(tabId, (current) => ({
        ...current,
        requestId,
        isSearching: true,
        searchError: null,
        query,
        addressInput: query,
        screen: "browser-search-results",
      }));
      const isCurrent = () =>
        get().tabs.some(
          (item) => item.id === tabId && item.requestId === requestId,
        );
      try {
        const data = await sharedSearch(
          query,
          controller.signal,
          async (signal) => {
            const response = await fetch(
              `/api/browser/search?q=${encodeURIComponent(query)}`,
              { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) },
            );
            const result: {
              success: boolean;
              data?: CustomSearchResult;
              code?: string;
            } = await response.json();
            signal.throwIfAborted();
            if (!response.ok || !result.success || !result.data)
              throw new BrowserSearchFailure(result.code);
            useBrowserCacheStore.getState().cacheSearch(query, result.data);
            return result.data;
          },
        );
        if (!isCurrent()) return;
        get().setHistory(query);
        updateTab(tabId, (current) => ({ ...current, searchResults: data }));
      } catch (error) {
        if (isCurrent())
          updateTab(tabId, (current) => ({
            ...current,
            searchError: browserSearchError(
              error instanceof BrowserSearchFailure ? error.code : undefined,
            ),
          }));
      } finally {
        if (searches.get(tabId) === controller) searches.delete(tabId);
        if (isCurrent())
          updateTab(tabId, (current) => ({ ...current, isSearching: false }));
      }
    },
  };
});

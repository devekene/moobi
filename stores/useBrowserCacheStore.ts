import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { encryptedStorage } from "@/lib/encrypted-storage";
import {
  cacheIsFresh,
  MAX_SEARCH_CACHE,
  NEWS_CACHE_MS,
  restoreBrowserCache,
  SEARCH_CACHE_MS,
  type CachedValue,
  type SearchCacheEntry,
} from "@/lib/browser-cache";
import type { CustomSearchResult, NewsArticle } from "@/types";
interface BrowserCacheState {
  news: CachedValue<NewsArticle[]> | null;
  searches: SearchCacheEntry[];
  getNews: (allowStale?: boolean) => NewsArticle[] | null;
  cacheNews: (data: NewsArticle[]) => void;
  getSearch: (query: string) => CustomSearchResult | null;
  cacheSearch: (query: string, data: CustomSearchResult) => void;
}
export const createBrowserCacheStore = (
  storage: StateStorage,
  skipHydration = false,
) =>
  create<BrowserCacheState>()(
    persist(
      (set, get) => ({
        news: null,
        searches: [],
        getNews: (allowStale = false) => {
          const entry = get().news;
          return entry &&
            cacheIsFresh(
              entry.savedAt,
              allowStale ? 7 * SEARCH_CACHE_MS : NEWS_CACHE_MS,
            )
            ? entry.data
            : null;
        },
        cacheNews: (data) => set({ news: { savedAt: Date.now(), data } }),
        getSearch: (query) =>
          get().searches.find(
            (entry) =>
              entry.query === query.trim() &&
              cacheIsFresh(entry.savedAt, SEARCH_CACHE_MS),
          )?.data || null,
        cacheSearch: (query, data) =>
          set(({ searches }) => ({
            searches: [
              ...searches.filter(
                (entry) =>
                  entry.query !== query.trim() &&
                  cacheIsFresh(entry.savedAt, SEARCH_CACHE_MS),
              ),
              { query: query.trim(), savedAt: Date.now(), data },
            ].slice(-MAX_SEARCH_CACHE),
          })),
      }),
      {
        name: "moobi-browser-cache",
        version: 1,
        storage: createJSONStorage(() => storage),
        skipHydration,
        partialize: ({ news, searches }) => ({ news, searches }),
        merge: (saved, current) => ({
          ...current,
          ...restoreBrowserCache(saved),
        }),
      },
    ),
  );

// Server rendering never opens browser storage or creates an installation key.
const clientStorage: StateStorage = {
  getItem: (name) =>
    typeof window === "undefined" ? null : encryptedStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined")
      return encryptedStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") return encryptedStorage.removeItem(name);
  },
};
export const useBrowserCacheStore = createBrowserCacheStore(
  clientStorage,
  true,
);

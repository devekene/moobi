import type {
  BrowserScreen,
  CustomSearchResult,
  CustomSearchResultData,
} from "@/types";
import type { VisitStage } from "./browser-visit";
import { browserHost } from "./browser";

export interface BrowserTab {
  id: string;
  screen: BrowserScreen;
  searchResults: CustomSearchResult | null;
  selectedUrl: CustomSearchResultData | null;
  query: string;
  addressInput: string;
  isSearching: boolean;
  searchError: string | null;
  requestId: number;
  visitId: number;
  visitStage: VisitStage;
}
let nextId = 0;
export function createBrowserTab(): BrowserTab {
  return {
    id: `browser-tab-${++nextId}`,
    screen: "browser-home",
    searchResults: null,
    selectedUrl: null,
    query: "",
    addressInput: "",
    isSearching: false,
    searchError: null,
    requestId: 0,
    visitId: 0,
    visitStage: "checking",
  };
}
export function browserTabTitle(tab: BrowserTab): string {
  if (tab.screen === "browser-home") return "Start page";
  if (tab.screen === "browser-history") return "History";
  if (tab.screen === "browser-bookmark") return "Bookmarks";
  return tab.screen === "browser-frame"
    ? tab.selectedUrl?.title || "Website"
    : tab.query || "Search";
}
export function browserTabAddress(tab: BrowserTab): string {
  return tab.screen === "browser-frame" && tab.selectedUrl
    ? browserHost(tab.selectedUrl.link)
    : tab.screen === "browser-search-results"
      ? tab.query
      : "";
}

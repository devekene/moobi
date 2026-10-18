"use client";
import { useEffect, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuArrowRight,
  LuArrowUpRight,
  LuBookmark,
  LuCheck,
  LuClock3,
  LuGlobe,
  LuHouse,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { useBrowserStore } from "@/stores/useBrowserStore";
import { browserHost } from "@/lib/browser";
import { scrollSheet } from "@/lib/sheet-scroll";
import BrowserHome from "./BrowserHome";
import BrowserIframe from "./BrowserIframe";
import BrowserTabs from "./BrowserTabs";
import BrowserResult from "./BrowserResult";
import type { BrowserTab } from "@/lib/browser-tabs";
import styles from "./browser.module.css";

export default function Browser() {
  const tabs = useBrowserStore((state) => state.tabs);
  const activeId = useBrowserStore((state) => state.activeTabId);
  const switcherOpen = useBrowserStore((state) => state.tabSwitcherOpen);
  const host = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.browserHost} ref={host}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={styles.tabPanel}
          hidden={tab.id !== activeId}
          inert={tab.id !== activeId || switcherOpen}
          data-tab-panel={tab.id === activeId ? "active" : "inactive"}
        >
          <BrowserTabContent tab={tab} />
        </div>
      ))}
      <BrowserTabs
        onReturnFocus={() =>
          host.current
            ?.querySelector<HTMLButtonElement>(
              '[data-tab-panel="active"] [data-tab-switcher]',
            )
            ?.focus()
        }
      />
    </div>
  );
}

function BrowserTabContent({ tab }: { tab: BrowserTab }) {
  const state = useBrowserStore();
  const {
    screen,
    selectedUrl,
    searchResults,
    query,
    isSearching,
    searchError,
  } = tab;
  const { bookmarks, history } = state;
  const change = (screen: BrowserTab["screen"]) =>
    state.changeBrowserScreen(screen, tab.id);
  const handleSearch = (query: string) => state.handleSearch(query, tab.id);
  const [filter, setFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const isPage = screen === "browser-frame";
  const isLibrary =
    screen === "browser-history" || screen === "browser-bookmark";
  const isHome = screen === "browser-home";
  const saved = Boolean(selectedUrl && bookmarks.includes(selectedUrl.link));
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (scrollSheet(el, event)) event.preventDefault();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  function goHome() {
    setFilter("");
    change("browser-home");
  }
  const entries =
    screen === "browser-bookmark"
      ? bookmarks.map((url) => ({
          query: browserHost(url),
          url,
          time: "",
          id: url,
        }))
      : history;
  return (
    <div className={styles.browser}>
      <div className={styles.content} ref={content}>
        {isHome && <BrowserHome />}
        {isLibrary && (
          <section className={styles.library}>
            <div className={styles.libraryHeading}>
              <h1>{screen === "browser-history" ? "History" : "Bookmarks"}</h1>
              {screen === "browser-history" && (
                <button
                  aria-label="Clear history"
                  disabled={!history.length}
                  onClick={state.clearHistory}
                >
                  <LuTrash2 size={19} />
                </button>
              )}
            </div>
            <label className={styles.filter}>
              <LuSearch size={18} />
              <input
                aria-label="Filter library"
                placeholder="Search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            {entries
              .filter((item) =>
                `${item.query} ${item.url || ""}`
                  .toLowerCase()
                  .includes(filter.toLowerCase()),
              )
              .map((item) => (
                <div className={styles.libraryRow} key={item.id + item.query}>
                  <button
                    onClick={() => void handleSearch(item.url || item.query)}
                  >
                    <span className={styles.rowIcon}>
                      {item.url ? (
                        <LuGlobe size={19} />
                      ) : (
                        <LuSearch size={19} />
                      )}
                    </span>
                    <span>
                      <strong>{item.query}</strong>
                      <small>
                        {item.url ? browserHost(item.url) : item.time}
                      </small>
                    </span>
                    <LuArrowUpRight size={17} />
                  </button>
                  {screen === "browser-bookmark" && item.url && (
                    <button
                      aria-label={`Remove ${item.query} bookmark`}
                      onClick={() => state.toggleBookmark(item.url!)}
                    >
                      <LuX size={17} />
                    </button>
                  )}
                </div>
              ))}
            {!entries.some((item) =>
              `${item.query} ${item.url || ""}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
            ) && (
              <div className={styles.empty}>
                {screen === "browser-history" ? (
                  <LuClock3 size={33} />
                ) : (
                  <LuBookmark size={33} />
                )}
                <p>
                  {filter
                    ? "No matches"
                    : screen === "browser-history"
                      ? "No history yet"
                      : "No bookmarks yet"}
                </p>
              </div>
            )}
          </section>
        )}
        {screen === "browser-search-results" && (
          <section className={styles.results}>
            <div className={styles.sectionHeading}>
              <h1>{query}</h1>
              <LuSearch size={21} />
            </div>
            {isSearching ? (
              <div className={styles.empty} role="status">
                <span className={styles.loading} />
                <p>Searching…</p>
              </div>
            ) : searchError ? (
              <div className={styles.empty} role="alert">
                <LuGlobe size={33} />
                <p>{searchError}</p>
                <button
                  className={styles.primary}
                  onClick={() => void handleSearch(query)}
                >
                  Try again
                </button>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Search on Google <LuArrowUpRight />
                </a>
              </div>
            ) : (
              <>
                {searchResults?.results.length ? (
                  searchResults.results.map((result) => (
                    <BrowserResult
                      key={result.link}
                      result={result}
                      onOpen={() => state.setSelectedUrl(result, tab.id)}
                    />
                  ))
                ) : (
                  <div className={styles.empty}>
                    <LuSearch size={33} />
                    <p>No results</p>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {isPage && selectedUrl && <BrowserIframe key={tab.visitId} tab={tab} />}
      </div>
      <footer className={styles.toolbar}>
        <form
          className={styles.address}
          onSubmit={(event) => {
            event.preventDefault();
            const value = input.current?.value || "";
            input.current?.blur();
            void handleSearch(value);
          }}
        >
          <LuSearch size={18} />
          <input
            ref={input}
            aria-label="Search or enter address"
            placeholder="Search or enter address"
            value={tab.addressInput}
            onChange={(event) =>
              state.setAddressInput(tab.id, event.target.value)
            }
            onFocus={(event) => event.currentTarget.select()}
          />
          {isPage && selectedUrl && (
            <button
              type="button"
              aria-label={saved ? "Remove bookmark" : "Bookmark page"}
              aria-pressed={saved}
              onClick={() => state.toggleBookmark(selectedUrl.link)}
            >
              {saved ? <LuCheck size={19} /> : <LuPlus size={19} />}
            </button>
          )}
          <button type="submit" aria-label="Go">
            <LuArrowRight size={20} />
          </button>
        </form>
        <nav className={styles.navigation} aria-label="Browser controls">
          <button
            aria-label="Back"
            disabled={isHome}
            onClick={() => {
              state.goBack();
            }}
          >
            <LuArrowLeft size={21} />
          </button>
          <button
            aria-label="Start page"
            aria-current={isHome ? "page" : undefined}
            onClick={goHome}
          >
            <LuHouse size={21} />
          </button>
          <button
            aria-label="Bookmarks"
            aria-current={screen === "browser-bookmark" ? "page" : undefined}
            onClick={() => {
              setFilter("");
              change("browser-bookmark");
            }}
          >
            <LuBookmark size={21} />
          </button>
          <button
            aria-label="History"
            aria-current={screen === "browser-history" ? "page" : undefined}
            onClick={() => {
              setFilter("");
              change("browser-history");
            }}
          >
            <LuClock3 size={21} />
          </button>
          <button
            data-tab-switcher
            aria-label={`Tabs, ${state.tabs.length} open`}
            aria-haspopup="dialog"
            aria-expanded={state.tabSwitcherOpen}
            aria-controls="browser-tabs"
            onClick={() => state.setTabSwitcherOpen(true)}
          >
            <span className={styles.tabCount}>{state.tabs.length}</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}

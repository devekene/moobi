import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useRef } from "react";
import {
  LuBookmark,
  LuCheck,
  LuClock3,
  LuGlobe,
  LuPlus,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { useBrowserStore } from "@/stores/useBrowserStore";
import { browserTabAddress, browserTabTitle } from "@/lib/browser-tabs";
import { scrollSheet } from "@/lib/sheet-scroll";
import styles from "./browser.module.css";

export default function BrowserTabs({
  onReturnFocus,
}: {
  onReturnFocus: () => void;
}) {
  const {
    tabs,
    activeTabId,
    tabSwitcherOpen,
    setTabSwitcherOpen,
    newTab,
    selectTab,
    closeTab,
  } = useBrowserStore();
  const add = useRef<HTMLButtonElement>(null);
  const attachScroll = useCallback((body: HTMLDivElement | null) => {
    if (!body) return;
    const wheel = (event: WheelEvent) => {
      if (scrollSheet(body, event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    body.addEventListener("wheel", wheel, { passive: false });
    return () => body.removeEventListener("wheel", wheel);
  }, []);
  return (
    <Dialog.Root open={tabSwitcherOpen} onOpenChange={setTabSwitcherOpen}>
      <Dialog.Content
        id="browser-tabs"
        className={styles.tabsDialog}
        aria-describedby={undefined}
        data-no-turntable
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
      >
        <header className={styles.tabsHeading}>
          <Dialog.Title>
            Tabs <span>{tabs.length}</span>
          </Dialog.Title>
          <Dialog.Close className={styles.tabsDone}>Done</Dialog.Close>
        </header>
        <div className={styles.tabsGrid} ref={attachScroll}>
          {tabs.map((tab) => {
            const title = browserTabTitle(tab);
            const address = browserTabAddress(tab);
            const Icon =
              tab.screen === "browser-bookmark"
                ? LuBookmark
                : tab.screen === "browser-history"
                  ? LuClock3
                  : tab.screen === "browser-search-results"
                    ? LuSearch
                    : LuGlobe;
            return (
              <article
                className={styles.tabCard}
                data-selected={tab.id === activeTabId}
                key={tab.id}
              >
                <div className={styles.tabCardHeading}>
                  <Icon size={14} />
                  <span>{title}</span>
                  <button
                    aria-label={`Close tab: ${title}`}
                    onClick={() => {
                      closeTab(tab.id);
                      add.current?.focus();
                    }}
                  >
                    <LuX size={16} />
                  </button>
                </div>
                <button
                  className={styles.tabPreview}
                  aria-label={`Switch to tab: ${title}`}
                  aria-current={tab.id === activeTabId ? "page" : undefined}
                  onClick={() => selectTab(tab.id)}
                >
                  {tab.id === activeTabId && (
                    <span className={styles.tabSelectedMark} aria-hidden="true">
                      <LuCheck size={13} />
                    </span>
                  )}
                  <span className={styles.tabPreviewIcon}>
                    <Icon size={30} />
                  </span>
                  <strong>{title}</strong>
                  {address && <small>{address}</small>}
                  {tab.isSearching && (
                    <span className={styles.tabActivity} role="status">
                      Searching…
                    </span>
                  )}
                </button>
              </article>
            );
          })}
        </div>
        <footer className={styles.tabsFooter}>
          <button ref={add} onClick={newTab}>
            <LuPlus size={21} />
            New tab
          </button>
        </footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

import { useBrowserStore } from "@/stores/useBrowserStore";
import { useEffect, useRef } from "react";
import { LuArrowUpRight, LuGlobe } from "react-icons/lu";
import { browserHost } from "@/lib/browser";
import { beginBrowserVisit } from "@/lib/browser-visit";
import type { BrowserTab } from "@/lib/browser-tabs";
import { usePhoneStore } from "@/stores/usePhoneStore";
import BrowserDoor from "./BrowserDoor";
import styles from "./browser.module.css";

export default function BrowserIframe({ tab }: { tab: BrowserTab }) {
  const selected = tab.selectedUrl;
  const stage = tab.visitStage;
  const setStage = (stage: BrowserTab["visitStage"]) =>
    useBrowserStore.getState().setVisitStage(tab.id, tab.visitId, stage);
  const active = useBrowserStore(
    (state) => state.activeTabId === tab.id && !state.tabSwitcherOpen,
  );
  const visit = useRef<ReturnType<typeof beginBrowserVisit> | null>(null);
  const url = selected?.link;
  const { id: tabId, visitId } = tab;
  useEffect(() => {
    if (!url) return;
    const state = useBrowserStore.getState();
    const saved = state.tabs.find((item) => item.id === tabId);
    if (
      !saved ||
      saved.visitStage === "ready" ||
      saved.visitStage === "external"
    )
      return;
    state.setVisitStage(tabId, visitId, "checking");
    const current = beginBrowserVisit(
      url,
      (stage) =>
        useBrowserStore.getState().setVisitStage(tabId, visitId, stage),
      () => {
        const state = useBrowserStore.getState();
        const phone = usePhoneStore.getState();
        if (
          document.visibilityState === "visible" &&
          state.activeTabId === tabId &&
          !state.tabSwitcherOpen &&
          phone.currentScreen === "chrome-browser"
        )
          window.open(url, "_blank", "noopener,noreferrer");
      },
    );
    visit.current = current;
    return () => {
      current.cancel();
      visit.current = null;
    };
  }, [url, tabId, visitId]);
  function openManually() {
    visit.current?.cancel();
    setStage("external");
  }
  if (!selected) return null;
  return (
    <div className={styles.page}>
      <div className={styles.pageHeading}>
        <LuGlobe size={18} />
        <span>{browserHost(selected.link)}</span>
        <a
          onClick={openManually}
          aria-label="Open website in new tab"
          href={selected.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LuArrowUpRight size={20} />
        </a>
      </div>
      <div className={styles.pageBody}>
        {stage !== "ready" && (
          <BrowserDoor
            active={active}
            onOpen={openManually}
            stage={stage}
            host={browserHost(selected.link)}
            url={selected.link}
          />
        )}
        {(stage === "loading" || stage === "ready") && (
          <iframe
            title={selected.title}
            src={selected.link}
            onLoad={() => visit.current?.loaded()}
            onError={() => visit.current?.failed()}
            className={styles.iframe}
            style={{ visibility: stage === "ready" ? "visible" : "hidden" }}
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
}

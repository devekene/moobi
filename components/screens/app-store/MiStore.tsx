"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { LuArrowUpRight, LuCompass, LuSearch } from "react-icons/lu";
import AppDetails from "./AppDetails";
import AppSearch from "./AppSearch";
import AppSections from "./AppSections";
import StoreArtwork from "./StoreArtwork";
import {
  STORE_APPS,
  getMiniApp,
  recentStoreApps,
  searchStoreApps,
  type MiniAppCategory,
  type RegisteredMiniApp,
} from "@/lib/app-registry";
import { usePhoneStore } from "@/stores/usePhoneStore";
import styles from "./store.module.css";

const categories: readonly (MiniAppCategory | "all")[] = [
  "all",
  ...new Set(STORE_APPS.map((app) => app.category)),
];
const featured = getMiniApp("music-player");

export default function MiStore() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MiniAppCategory | "all">("all");
  const [selectedApp, setSelectedApp] = useState<RegisteredMiniApp | null>(
    null,
  );
  const history = usePhoneStore((state) => state.history);
  const setCurrentScreen = usePhoneStore((state) => state.setCurrentScreen);
  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnEntry = useRef<string | null>(null);
  const scrollPosition = useRef(0);
  const hadDetails = useRef(false);
  const matchingApps = useMemo(
    () => searchStoreApps(query, category),
    [query, category],
  );
  const recentApps = useMemo(
    () => recentStoreApps(history).slice(0, 3),
    [history],
  );
  const filtering = Boolean(query.trim()) || category !== "all";

  useLayoutEffect(() => {
    const scroller = rootRef.current?.closest<HTMLElement>(
      '.phone-app-safe-area[data-layout="scroll"]',
    );
    if (selectedApp) {
      scroller?.scrollTo({ top: 0, behavior: "instant" });
      headingRef.current?.focus({ preventScroll: true });
      hadDetails.current = true;
    } else if (hadDetails.current) {
      scroller?.scrollTo({ top: scrollPosition.current, behavior: "instant" });
      Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>(
          "button[data-store-entry]",
        ) ?? [],
      )
        .find(
          (button) =>
            button.getAttribute("data-store-entry") === returnEntry.current,
        )
        ?.focus({ preventScroll: true });
      hadDetails.current = false;
    }
  }, [selectedApp]);

  const selectApp = (app: RegisteredMiniApp, trigger: HTMLButtonElement) => {
    returnEntry.current = trigger.getAttribute("data-store-entry");
    scrollPosition.current =
      rootRef.current?.closest<HTMLElement>(
        '.phone-app-safe-area[data-layout="scroll"]',
      )?.scrollTop ?? 0;
    setSelectedApp(app);
  };
  const openApp = (app: RegisteredMiniApp) =>
    setCurrentScreen(app.launchTarget.screen);
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <main
      ref={rootRef}
      className={styles.store}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          selectedApp &&
          !rootRef.current?.querySelector("dialog[open]")
        ) {
          event.stopPropagation();
          setSelectedApp(null);
        }
      }}
    >
      {selectedApp ? (
        <AppDetails
          key={selectedApp.id}
          app={selectedApp}
          headingRef={headingRef}
          onBack={() => setSelectedApp(null)}
          onOpen={() => openApp(selectedApp)}
        />
      ) : (
        <div className={styles.browse}>
          <header className={styles.masthead}>
            <div>
              <span className={styles.eyebrow}>THE MOOBI EDIT</span>
              <h1>
                App Store<span>.</span>
              </h1>
            </div>
            <span className={styles.brandMark} aria-hidden="true">
              <LuCompass />
            </span>
          </header>
          <p className={styles.intro}>Small apps. Great discoveries.</p>
          <AppSearch query={query} onQueryChange={setQuery} />
          <nav className={styles.filters} aria-label="Filter store apps">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={category === option}
                onClick={() => setCategory(option)}
              >
                {option === "all"
                  ? "Discover"
                  : option === "entertainment"
                    ? "Music & audio"
                    : option}
              </button>
            ))}
          </nav>
          {filtering ? (
            <>
              <p role="status" className={styles.resultCount}>
                {matchingApps.length}{" "}
                {matchingApps.length === 1 ? "app" : "apps"}
                {query.trim() ? ` for “${query.trim()}”` : " to explore"}
              </p>
              {matchingApps.length ? (
                <AppSections
                  title={category === "games" ? "Time to play" : "Made for you"}
                  apps={matchingApps}
                  onSelect={selectApp}
                  onOpen={openApp}
                />
              ) : (
                <div className={styles.empty}>
                  <LuSearch aria-hidden="true" />
                  <h2>A new discovery awaits</h2>
                  <p>Try another name or explore the full collection.</p>
                  <button type="button" onClick={resetFilters}>
                    Explore all apps
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.featured}
                onClick={(event) => selectApp(featured, event.currentTarget)}
                aria-label="Discover FORM"
                data-store-entry="featured-form"
              >
                <div className={styles.featuredTop}>
                  <span className={styles.eyebrow}>IN THE SPOTLIGHT</span>
                  <span className={styles.featureTag}>EDITOR’S PICK</span>
                </div>
                <StoreArtwork id={featured.id} />
                <div className={styles.featuredCopy}>
                  <span>FORM / MUSIC & AUDIO</span>
                  <h2>
                    Find your
                    <br />
                    next feeling.
                  </h2>
                  <p>A listening room for independent sound.</p>
                  <span className={styles.featureLink}>
                    Meet FORM
                    <LuArrowUpRight />
                  </span>
                </div>
              </button>
              <AppSections
                title="A little play goes a long way"
                subtitle="Quick breaks. Worth taking."
                apps={STORE_APPS.filter((app) => app.category === "games")}
                onSelect={selectApp}
                onOpen={openApp}
              />
              {recentApps.length > 0 && (
                <AppSections
                  title="Back to your favorites"
                  subtitle="Recently opened by you"
                  apps={recentApps}
                  onSelect={selectApp}
                  onOpen={openApp}
                />
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

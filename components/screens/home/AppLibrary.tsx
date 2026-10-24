"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuSearch } from "react-icons/lu";
import {
  APP_LIBRARY_CATEGORIES,
  getAlphabeticalAppGroups,
  getAppLibraryCategories,
  getAppLibraryCategoryApps,
  getAppLibraryCategoryPreview,
  type AppLibraryCategoryId,
} from "@/lib/app-library";
import type { PhoneApp } from "@/lib/phone-apps";
import { usePhoneApps } from "@/hooks/usePhoneApps";
import AppIconArtwork from "@/components/icons/AppIconArtwork";
import styles from "./AppLibrary.module.css";

type AppLibraryProps = {
  onLaunch: (app: PhoneApp) => void;
};

const AppLibrary = ({ onLaunch }: AppLibraryProps) => {
  const phoneApps = usePhoneApps();
  const [query, setQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<AppLibraryCategoryId | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(
    () => getAppLibraryCategories("", phoneApps),
    [phoneApps],
  );
  const alphabeticalGroups = useMemo(
    () => getAlphabeticalAppGroups(query, phoneApps),
    [query, phoneApps],
  );
  const activeApps = activeCategory
    ? getAppLibraryCategoryApps(activeCategory, query, phoneApps)
    : [];
  const activeTitle = APP_LIBRARY_CATEGORIES.find(
    ({ id }) => id === activeCategory,
  )?.title;

  useEffect(() => {
    if (isSearchMode) searchInputRef.current?.focus();
  }, [isSearchMode]);

  const appIcon = (app: PhoneApp) => {
    return (
      <button
        key={app.id}
        type="button"
        onClick={() => onLaunch(app)}
        aria-label={`Open ${app.name}${app.availability === "preview" ? ", preview only" : ""}`}
        title={app.name}
        className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl p-2 text-[var(--phone-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="flex aspect-square w-[clamp(3.5rem,17cqw,5rem)] items-center justify-center overflow-hidden rounded-[14px] bg-[var(--phone-surface-elevated)]/75 shadow-sm backdrop-blur-sm">
          <AppIconArtwork
            icon={app.icon}
            color={app.color}
            presentation={app.iconPresentation}
            className="text-[2rem]"
          />
        </span>
        <span className="max-w-full truncate text-[13px] leading-tight font-semibold text-[var(--phone-text)] drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">
          {app.name}
        </span>
      </button>
    );
  };

  const appPreview = (app: PhoneApp) => {
    return (
      <span
        key={app.id}
        aria-hidden="true"
        className="flex aspect-square w-[min(100%,clamp(2.85rem,18cqw,4.1rem))] items-center justify-center overflow-hidden rounded-[14px] bg-[var(--phone-surface-elevated)]/70 shadow-md backdrop-blur-sm"
      >
        <AppIconArtwork
          icon={app.icon}
          color={app.color}
          presentation={app.iconPresentation}
          className="text-[2.15rem]"
        />
      </span>
    );
  };

  const miniAppPreview = (app: PhoneApp) => {
    return (
      <span
        key={app.id}
        aria-hidden="true"
        className="flex aspect-square w-full max-w-[26px] items-center justify-center overflow-hidden rounded-[6px] bg-[var(--phone-surface-elevated)]/80 shadow-sm"
      >
        <AppIconArtwork
          icon={app.icon}
          color={app.color}
          presentation={app.iconPresentation}
          className="text-[0.9rem]"
        />
      </span>
    );
  };

  return (
    <div className="relative h-full overflow-hidden">
      {!activeCategory && (
        <div
          className="absolute inset-0 [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{
            paddingInline: "6%",
            paddingTop: "calc(var(--phone-safe-area-top) + 8px)",
            paddingBottom: "12px",
          }}
        >
          <div
            role="search"
            className="sticky top-0 z-10 text-[var(--phone-text)]"
          >
            {!isSearchMode ? (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  setIsSearchMode(true);
                }}
                aria-label="Search the App Library"
                className={`${styles.searchField} flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none`}
              >
                <LuSearch aria-hidden="true" className="h-4 w-4 opacity-75" />
                <span className="text-[var(--phone-text-secondary)]/90">
                  App Library
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className={`${styles.searchField} flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3`}
                >
                  <LuSearch
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 opacity-75"
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    aria-label="Search apps"
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search"
                    className={`${styles.searchInput} min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--phone-text-secondary)]/90`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setIsSearchMode(false);
                  }}
                  className="shrink-0 rounded-md px-1 py-2 text-sm text-[var(--phone-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {categories.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-x-3 gap-y-3"
              style={{ paddingTop: "12px" }}
            >
              {categories.map((category) => {
                const preview = getAppLibraryCategoryPreview(
                  category.id,
                  query,
                  phoneApps,
                );
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    aria-label={`Open ${category.title} category`}
                    className="group min-w-0 rounded-[22px] text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span
                      className="grid aspect-square grid-cols-2 grid-rows-2 place-items-center gap-1.5 rounded-[22px] border border-white/20 bg-white/[0.08] shadow-lg backdrop-blur-2xl transition-colors group-hover:bg-white/[0.12] group-active:bg-white/[0.16] motion-reduce:transition-none"
                      style={{ padding: "clamp(10px, 3cqw, 12px)" }}
                    >
                      {category.apps.length > 4 ? (
                        <>
                          {preview.slice(0, 3).map(appPreview)}
                          <span
                            aria-hidden="true"
                            className="grid aspect-square w-[min(100%,clamp(2.85rem,18cqw,4.1rem))] grid-cols-2 grid-rows-2 place-items-center gap-0.5 rounded-[14px] border border-white/20 bg-white/[0.06]"
                            style={{ padding: "4px" }}
                          >
                            {preview.slice(3, 7).map(miniAppPreview)}
                          </span>
                        </>
                      ) : (
                        preview.map(appPreview)
                      )}
                    </span>
                    <span className="mt-2 flex min-h-7 items-center justify-center px-1 text-center text-[11px] leading-tight font-medium text-[var(--phone-text)] drop-shadow-[0_1px_4px_rgba(0,0,0,.9)]">
                      {category.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      {isSearchMode && !activeCategory && (
        <div className="absolute inset-x-0 top-[calc(var(--phone-safe-area-top)+56px)] bottom-0 z-20 [scrollbar-width:none] overflow-y-auto overscroll-contain bg-black/[0.08] pb-8 backdrop-blur-md [&::-webkit-scrollbar]:hidden">
          <div style={{ paddingInline: "6%" }}>
            {alphabeticalGroups.length > 0 ? (
              <div className="space-y-4 pt-2">
                {alphabeticalGroups.map(({ letter, apps }) => (
                  <section
                    key={letter}
                    aria-label={`Apps beginning with ${letter}`}
                  >
                    <h2 className="px-2 pb-1 text-xs font-semibold tracking-wide text-[var(--phone-text-secondary)] uppercase">
                      {letter}
                    </h2>
                    <div>
                      {apps.map((app) => {
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => onLaunch(app)}
                            aria-label={`Open ${app.name}${app.availability === "preview" ? ", preview only" : ""}`}
                            className="focus-visible:outline-inset flex w-full items-center gap-3 border-b border-white/15 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-white/25 bg-[var(--phone-surface-elevated)]/70 text-2xl shadow-md backdrop-blur-sm">
                              <AppIconArtwork
                                icon={app.icon}
                                color={app.color}
                                presentation={app.iconPresentation}
                                className="text-2xl"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--phone-text)]">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--phone-text-secondary)]">
                No apps found for “{query}”.
              </p>
            )}
          </div>
        </div>
      )}

      {activeCategory && (
        <div
          className="absolute inset-0 z-20 overflow-y-auto overscroll-contain bg-transparent backdrop-blur-xl"
          role="presentation"
          onClick={(event) => {
            if (
              !(event.target instanceof Element) ||
              !event.target.closest("button")
            ) {
              setActiveCategory(null);
            }
          }}
        >
          <section
            aria-label={`${activeTitle ?? "App"} apps`}
            className="mx-auto flex min-h-full w-full max-w-[34rem] flex-col justify-center"
            style={{
              paddingInline: "7%",
              paddingTop: "calc(var(--phone-safe-area-top) + 40px)",
              paddingBottom: "40px",
            }}
          >
            <div
              className="sticky top-[var(--phone-safe-area-top)] z-10 mb-10 bg-black/10 py-2 backdrop-blur-xl"
              style={{ marginInline: "-7%", paddingInline: "7%" }}
            >
              <h2 className="text-[clamp(1.8rem,7cqw,2.4rem)] leading-[1.05] font-extrabold tracking-tight text-[var(--phone-text)] drop-shadow-[0_2px_8px_rgba(0,0,0,.55)]">
                {activeTitle}
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-x-[2%] gap-y-5">
              {activeApps.map((app) => appIcon(app))}
            </div>
            {activeApps.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--phone-text-secondary)]">
                No matching apps in this category.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default AppLibrary;

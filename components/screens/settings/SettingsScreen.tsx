"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./settings.module.css";
import SettingsHeader from "./SettingsHeader";
import { matchesSettingsSearch } from "./settings-search";
import type { ReactNode } from "react";
import BatteryControls from "@/components/screens/BatteryControls";
import InfoScreen from "@/components/screens/info/InfoScreen";
import WallpaperSettings from "@/components/screens/settings/WallpaperSettings";
import dynamic from "next/dynamic";
import {
  DeviceSettings,
  DisplaySettings,
  SoundSettings,
  SecuritySettings,
} from "./SettingsDetails";
import {
  LuChevronRight,
  LuLockKeyhole,
  LuInfo,
  LuImage,
  LuMonitor,
  LuSearch,
  LuSmartphone,
  LuVolume2,
  LuCode,
} from "react-icons/lu";
import { MdBattery3Bar } from "react-icons/md";

const AppSandbox = dynamic(() => import("@/components/mini-apps/AppSandbox"), {
  loading: () => <p role="status">Opening App Sandbox…</p>,
  ssr: false,
});

type CategoryId =
  | "display"
  | "device"
  | "wallpaper"
  | "sound"
  | "battery"
  | "security"
  | "about"
  | "sandbox";
type SettingsCategory = {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: "blue" | "purple" | "pink" | "green" | "red" | "gray";
};

const categories: SettingsCategory[] = [
  {
    id: "display",
    tone: "blue",
    title: "Display & Brightness",
    subtitle: "Appearance and screen brightness",
    icon: <LuMonitor />,
  },
  {
    id: "device",
    tone: "gray",
    title: "Virtual iPhone",
    subtitle: "Choose the model shown in Moobi",
    icon: <LuSmartphone />,
  },
  {
    id: "wallpaper",
    tone: "purple",
    title: "Wallpaper",
    subtitle: "Personalize your Home Screen",
    icon: <LuImage />,
  },
  {
    id: "sound",
    tone: "pink",
    title: "Sounds & Haptics",
    subtitle: "Volume and silent mode",
    icon: <LuVolume2 />,
  },
  {
    id: "battery",
    tone: "green",
    title: "Battery",
    subtitle: "Virtual battery and charging",
    icon: <MdBattery3Bar />,
  },
  {
    id: "security",
    tone: "red",
    title: "Security",
    subtitle: "PIN lock for this virtual phone",
    icon: <LuLockKeyhole />,
  },
  {
    id: "sandbox",
    tone: "purple",
    title: "App Sandbox",
    subtitle: "Preview a local mini-app package",
    icon: <LuCode />,
  },
  {
    id: "about",
    tone: "gray",
    title: "About",
    subtitle: "About Moobi and its virtual phone",
    icon: <LuInfo />,
  },
];

const groupClass = styles.group;
function CategoryRow({
  category,
  onClick,
  separated,
}: {
  category: SettingsCategory;
  onClick: () => void;
  separated: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.row}
      data-separated={separated}
    >
      <span
        className={styles.icon}
        data-tone={category.tone}
        aria-hidden="true"
      >
        {category.icon}
      </span>
      <span className={styles.rowTitle}>{category.title}</span>
      <LuChevronRight className={styles.chevron} aria-hidden="true" />
    </button>
  );
}

export default function SettingsScreen() {
  const screenRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const overviewScroll = useRef(0);
  const previousCategory = useRef<CategoryId | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const selectedCategory = categories.find(
    (category) => category.id === activeCategory,
  );

  useLayoutEffect(() => {
    const viewport = screenRef.current?.parentElement;
    if (activeCategory === previousCategory.current || !viewport) return;
    if (activeCategory) {
      overviewScroll.current = viewport.scrollTop;
      viewport.scrollTop = 0;
      headingRef.current?.focus({ preventScroll: true });
    } else {
      viewport.scrollTop = overviewScroll.current;
      // Category rows remount when returning from a detail screen.
      const label = categories.find(
        (category) => category.id === previousCategory.current,
      )?.title;
      const row = Array.from(
        screenRef.current?.querySelectorAll("button") ?? [],
      ).find((button) => button.textContent === label);
      row?.focus({ preventScroll: true });
    }
    previousCategory.current = activeCategory;
  }, [activeCategory]);

  const visibleCategories = categories.filter((category) =>
    matchesSettingsSearch(category, search),
  );

  return (
    <main
      ref={screenRef}
      className={styles.screen}
      data-detail={Boolean(selectedCategory)}
    >
      <SettingsHeader
        title={selectedCategory?.title ?? "Settings"}
        headingRef={headingRef}
        onBack={selectedCategory ? () => setActiveCategory(null) : undefined}
      />

      {!selectedCategory ? (
        <>
          {!search.trim() && (
            <button
              type="button"
              className={styles.profile}
              onClick={() => setActiveCategory("about")}
              aria-label="About Moobi Virtual Phone"
            >
              <span className={styles.avatar} aria-hidden="true">
                M
              </span>
              <span className={styles.profileCopy}>
                <span className={styles.profileTitle}>Moobi</span>
                <span className={styles.profileSubtitle}>
                  Mini apps, settings, and preferences for your virtual phone.
                </span>
              </span>
              <LuChevronRight className={styles.chevron} aria-hidden="true" />
            </button>
          )}

          <div className={styles.categories}>
            {[
              categories.slice(0, 5),
              categories.slice(5, 6),
              categories.slice(6),
            ].map((group, index) => {
              const rows = group.filter((category) =>
                visibleCategories.includes(category),
              );
              return rows.length > 0 ? (
                <nav
                  key={index}
                  aria-label={
                    ["Phone settings", "Security settings", "About settings"][
                      index
                    ]
                  }
                  className={groupClass}
                >
                  {rows.map((category, rowIndex) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      separated={rowIndex > 0}
                      onClick={() => setActiveCategory(category.id)}
                    />
                  ))}
                </nav>
              ) : null;
            })}
            {visibleCategories.length === 0 && (
              <p className={styles.empty} role="status">
                No settings found. Try “display”, “volume”, or “PIN”.
              </p>
            )}
          </div>
          <div className={styles.searchDock}>
            <label className={styles.search}>
              <LuSearch aria-hidden="true" />
              <input
                type="search"
                aria-label="Search settings"
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </>
      ) : (
        <section
          aria-label={`${selectedCategory.title} settings`}
          className={styles.details}
        >
          {activeCategory === "about" && <InfoScreen showHeading={false} />}
          {activeCategory === "wallpaper" && <WallpaperSettings />}
          {activeCategory === "display" && <DisplaySettings />}
          {activeCategory === "device" && <DeviceSettings />}
          {activeCategory === "sound" && <SoundSettings />}
          {activeCategory === "battery" && <BatteryControls />}
          {activeCategory === "security" && <SecuritySettings />}
          {activeCategory === "sandbox" && <AppSandbox />}
        </section>
      )}
    </main>
  );
}

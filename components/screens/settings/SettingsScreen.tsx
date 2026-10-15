"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import BatteryControls from "@/components/screens/BatteryControls";
import InfoScreen from "@/components/screens/info/InfoScreen";
import WallpaperSettings from "@/components/screens/settings/WallpaperSettings";
import { usePhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import {
  LuBell,
  LuBellOff,
  LuChevronLeft,
  LuChevronRight,
  LuLockKeyhole,
  LuInfo,
  LuImage,
  LuMoon,
  LuMonitor,
  LuSun,
  LuVolume2,
} from "react-icons/lu";
import { MdBattery3Bar } from "react-icons/md";

type CategoryId = "display" | "wallpaper" | "sound" | "battery" | "security" | "about";
type SettingsCategory = {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: ReactNode;
};

const categories: SettingsCategory[] = [
  {
    id: "display",
    title: "Display & Brightness",
    subtitle: "Appearance and screen brightness",
    icon: <LuMonitor />,
  },
  {
    id: "wallpaper",
    title: "Wallpaper",
    subtitle: "Personalize your Home Screen",
    icon: <LuImage />,
  },
  {
    id: "sound",
    title: "Sounds & Haptics",
    subtitle: "Volume and silent mode",
    icon: <LuVolume2 />,
  },
  {
    id: "battery",
    title: "Battery",
    subtitle: "Virtual battery and charging",
    icon: <MdBattery3Bar />,
  },
  {
    id: "security",
    title: "Security",
    subtitle: "PIN lock for this virtual phone",
    icon: <LuLockKeyhole />,
  },
  {
    id: "about",
    title: "About",
    subtitle: "About Moobi and its virtual phone",
    icon: <LuInfo />,
  },
];

const groupClass = "overflow-hidden rounded-2xl bg-[var(--phone-surface)]";
const dividerClass = "border-t border-[var(--phone-border)]";

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
      className={`focus-visible:outline-inset flex min-h-[58px] w-full items-center gap-3 px-3.5 text-left transition-colors hover:bg-[var(--phone-surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)] ${separated ? dividerClass : ""}`}
    >
      <span
        className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--phone-accent)_16%,transparent)] text-[var(--phone-accent)] [&>svg]:size-[17px]"
        aria-hidden="true"
      >
        {category.icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium tracking-[-0.01em]">
        {category.title}
      </span>
      <LuChevronRight
        className="size-4 shrink-0 text-[var(--phone-text-muted)]"
        aria-hidden="true"
      />
    </button>
  );
}

function RangeSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const inputId = `settings-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex justify-between text-[15px]">
        <label htmlFor={inputId}>{label}</label>
        <span className="text-[var(--phone-text-muted)]">{value}%</span>
      </div>
      <input
        id={inputId}
        type="range"
        min="0"
        max="100"
        value={value}
        aria-label={`${label}, ${value} percent`}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--phone-accent)]"
      />
    </div>
  );
}

function DetailRow({
  icon,
  title,
  detail,
  children,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,var(--phone-accent)_16%,transparent)] text-[var(--phone-accent)] [&>svg]:size-[17px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{title}</div>
        {detail && (
          <div className="mt-0.5 text-xs text-[var(--phone-text-muted)]">
            {detail}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SettingsScreen() {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const appearance = usePhoneAppearanceStore((state) => state.appearance);
  const setAppearance = usePhoneAppearanceStore((state) => state.setAppearance);
  const brightness = usePhoneSettingsStore((state) => state.brightness);
  const setBrightness = usePhoneSettingsStore((state) => state.setBrightness);
  const volume = usePhoneSettingsStore((state) => state.volume);
  const setVolume = usePhoneSettingsStore((state) => state.setVolume);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);
  const toggleSilentMode = usePhoneSettingsStore(
    (state) => state.toggleSilentMode,
  );
  const pinLockEnabled = usePhoneSettingsStore((state) => state.pinLockEnabled);
  const selectedCategory = categories.find(
    (category) => category.id === activeCategory,
  );

  return (
    <main className="text-[var(--phone-text)]">
      <header className="mb-5">
        {selectedCategory && (
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="mb-2 inline-flex min-h-8 items-center gap-0.5 pr-2 text-[15px] font-medium text-[var(--phone-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]"
          >
            <LuChevronLeft className="size-5" aria-hidden="true" /> Settings
          </button>
        )}
        <h1 className="text-[32px] leading-tight font-bold tracking-[-0.035em]">
          {selectedCategory?.title ?? "Settings"}
        </h1>
        {selectedCategory && (
          <p className="mt-1 text-sm text-[var(--phone-text-muted)]">
            {selectedCategory.subtitle}
          </p>
        )}
      </header>

      {!selectedCategory ? (
        <>
          <div className={`${groupClass} mb-5`}>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--phone-accent)] text-lg font-semibold text-white"
                aria-hidden="true"
              >
                M
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  Moobi Virtual Phone
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--phone-text-muted)]">
                  Device settings and preferences
                </p>
              </div>
              <LuChevronRight
                className="size-4 shrink-0 text-[var(--phone-text-muted)]"
                aria-hidden="true"
              />
            </div>
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
            Your phone
          </p>
          <nav
            aria-label="Settings categories"
            className={`${groupClass} mb-5`}
          >
            {categories.slice(0, 3).map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                separated={index > 0}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </nav>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
            Device
          </p>
          <nav aria-label="Device settings" className={groupClass}>
            {categories.slice(3).map((category, index) => (
              <CategoryRow
                key={category.id}
                category={category}
                separated={index > 0}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </nav>
        </>
      ) : (
        <section
          aria-label={`${selectedCategory.title} settings`}
          className="space-y-4"
        >
          {activeCategory === "about" && <InfoScreen showHeading={false} />}
          {activeCategory === "wallpaper" && <WallpaperSettings />}
          {activeCategory === "display" && (
            <>
              <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
                Display
              </p>
              <div className={groupClass}>
                <DetailRow
                  icon={appearance === "dark" ? <LuMoon /> : <LuSun />}
                  title="Appearance"
                  detail="Light or dark phone theme"
                >
                  <div
                    className="flex rounded-xl bg-[var(--phone-surface-elevated)] p-1"
                    role="group"
                    aria-label="Phone appearance"
                  >
                    {(["light", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={appearance === mode}
                        onClick={() => setAppearance(mode)}
                        className={`rounded-lg px-3 py-1.5 text-xs capitalize ${appearance === mode ? "bg-[var(--phone-accent)] text-white" : "text-[var(--phone-text-secondary)]"}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </DetailRow>
                <div className={dividerClass}>
                  <RangeSetting
                    label="Brightness"
                    value={brightness}
                    onChange={setBrightness}
                  />
                </div>
              </div>
            </>
          )}

          {activeCategory === "sound" && (
            <>
              <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
                Ringer and alerts
              </p>
              <div className={groupClass}>
                <button
                  type="button"
                  onClick={toggleSilentMode}
                  aria-pressed={silentMode}
                  className={`focus-visible:outline-inset w-full text-left transition-colors hover:bg-[var(--phone-surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--phone-focus)]`}
                >
                  <DetailRow
                    icon={silentMode ? <LuBellOff /> : <LuBell />}
                    title="Silent mode"
                    detail={silentMode ? "Sounds are muted" : "Sounds are on"}
                  >
                    <span
                      className={`relative h-6 w-11 rounded-full ${silentMode ? "bg-[var(--phone-accent)]" : "bg-[var(--phone-border)]"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${silentMode ? "translate-x-5" : "translate-x-0.5"}`}
                      />
                    </span>
                  </DetailRow>
                </button>
              </div>
              <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
                Volume
              </p>
              <div className={groupClass}>
                <RangeSetting
                  label="Media volume"
                  value={volume}
                  onChange={setVolume}
                />
                <p
                  className={`${dividerClass} px-4 py-3 text-xs leading-relaxed text-[var(--phone-text-muted)]`}
                >
                  This setting controls audio played by supported mini apps.
                </p>
              </div>
            </>
          )}

          {activeCategory === "battery" && (
            <>
              <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
                Battery
              </p>
              <BatteryControls />
            </>
          )}

          {activeCategory === "security" && (
            <>
              <p className="px-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--phone-text-muted)] uppercase">
                Screen lock
              </p>
              <div className={groupClass}>
                <DetailRow
                  icon={<LuLockKeyhole />}
                  title="PIN lock"
                  detail={pinLockEnabled ? "On" : "Off"}
                />
                <p
                  className={`${dividerClass} px-4 py-3 text-xs leading-relaxed text-[var(--phone-text-muted)]`}
                >
                  Manage PIN lock from Phone options. This passcode only affects
                  the browser simulation.
                </p>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

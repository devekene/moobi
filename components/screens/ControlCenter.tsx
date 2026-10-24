"use client";

import { Button } from "@/components/ui/button";
import MusicWidget from "@/components/screens/MusicWidget";
import { skipMusic, toggleMusic } from "@/lib/music-playback";
import CustomSlider from "./CustomSlider";

import { downloadPhoneScreenshot } from "@/lib/phone-screenshot";
import { cn } from "@/lib/utils";

import { useMusicStore, usePhoneStore } from "@/stores";

import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { useBatteryStore } from "@/stores/useBatteryStore";
import type { ChargerPhase } from "@/lib/battery";

import { useSwipeable } from "react-swipeable";

import {
  LuAppWindow,
  LuBell,
  LuBellOff,
  LuCalculator,
  LuClock3,
  LuLockKeyhole,
  LuPlane,
  LuPlus,
  LuPower,
  LuSmartphone,
  LuSun,
  LuWifi,
} from "react-icons/lu";

import { MdBattery3Bar, MdScreenshotMonitor } from "react-icons/md";

import { useCallback, useState } from "react";

/* -------------------------------------------------------------------------- */
/*                                   TOKENS                                   */
/* -------------------------------------------------------------------------- */

const CONTROL_WIDTH = 296;
const LARGE = 143;

const moduleClass = cn(
  "relative overflow-hidden",
  "rounded-[30px]",
  "border border-white/[0.08]",
  "bg-[var(--phone-control-center-module)]",
  "backdrop-blur-[28px]",
  "backdrop-saturate-[145%]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.10)]",
);

const circularMaterialClass = cn(
  "border border-white/[0.07]",
  "bg-white/[0.14]",
  "backdrop-blur-[22px]",
  "backdrop-saturate-[145%]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.06),0_2px_5px_rgba(0,0,0,0.10)]",
);

/* -------------------------------------------------------------------------- */
/*                              CONTROL BUTTON                                */
/* -------------------------------------------------------------------------- */

type ControlButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

function ControlButton({
  label,
  active = false,
  onClick,
  icon,
  disabled = false,
  className,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        `flex size-[48px] shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-[0.94]`,

        circularMaterialClass,

        active && "bg-white/[0.25]",

        !active && "text-white/[0.88]",

        disabled && "cursor-wait opacity-50",

        className,
      )}
    >
      {icon}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                          CONNECTIVITY MODULE                               */
/* -------------------------------------------------------------------------- */

type ConnectivityModuleProps = {
  airplaneMode: boolean;
  wifiEnabled: boolean;
  chargerPhase: ChargerPhase;
  cellularEnabled: boolean;

  toggleAirplaneMode: () => void;
  toggleWifi: () => void;
  toggleCharger: () => void;
  toggleCellular: () => void;
};

function ConnectivityModule({
  airplaneMode,
  wifiEnabled,
  chargerPhase,
  cellularEnabled,
  toggleAirplaneMode,
  toggleWifi,
  toggleCharger,
  toggleCellular,
}: ConnectivityModuleProps) {
  return (
    <section
      aria-label="Virtual connectivity and battery controls"
      className={moduleClass}
      style={{
        width: LARGE,
        height: LARGE,
      }}
    >
      <ControlButton
        label="Airplane"
        active={airplaneMode}
        onClick={toggleAirplaneMode}
        icon={<LuPlane className="size-[20px]" />}
        className="absolute top-[15px] left-[16px]"
      />

      <ControlButton
        label="Wi-Fi"
        active={wifiEnabled && !airplaneMode}
        onClick={toggleWifi}
        icon={<LuWifi className="size-[20px]" />}
        className="absolute top-[15px] right-[16px]"
      />

      <ControlButton
        label={
          chargerPhase === "connected"
            ? "Battery, disconnect virtual charger"
            : chargerPhase === "connecting"
              ? "Battery, cancel virtual charger connection"
              : "Battery, connect virtual charger"
        }
        active={chargerPhase !== "disconnected"}
        onClick={toggleCharger}
        icon={<MdBattery3Bar className="size-[22px] rotate-90" />}
        className="absolute bottom-[15px] left-[16px]"
      />
      <span className="sr-only" role="status">
        {chargerPhase === "connected"
          ? "Virtual charger connected"
          : chargerPhase === "connecting"
            ? "Connecting virtual charger"
            : "Virtual charger disconnected"}
      </span>

      <ControlButton
        label="Mobile"
        active={cellularEnabled && !airplaneMode}
        onClick={toggleCellular}
        icon={<LuSmartphone className="size-[20px]" />}
        className="absolute right-[16px] bottom-[15px]"
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              CONTROL CENTER                                */
/* -------------------------------------------------------------------------- */

const ControlCenter = () => {
  const showControlCenter = usePhoneStore((state) => state.showControlCenter);

  const currentScreen = usePhoneStore((state) => state.currentScreen);

  const toggleControlCenter = usePhoneStore(
    (state) => state.toggleControlCenter,
  );

  const setCurrentScreen = usePhoneStore((state) => state.setCurrentScreen);

  const setShowAppSwitcher = usePhoneStore((state) => state.setShowAppSwitcher);

  /* Settings */

  const brightness = usePhoneSettingsStore((state) => state.brightness);

  const setBrightness = usePhoneSettingsStore((state) => state.setBrightness);

  const volume = usePhoneSettingsStore((state) => state.volume);

  const setVolume = usePhoneSettingsStore((state) => state.setVolume);
  const setVolumeHudSource = usePhoneSettingsStore(
    (state) => state.setVolumeHudSource,
  );

  const silentMode = usePhoneSettingsStore((state) => state.silentMode);

  const toggleSilentMode = usePhoneSettingsStore(
    (state) => state.toggleSilentMode,
  );

  const airplaneMode = usePhoneSettingsStore((state) => state.airplaneMode);

  const toggleAirplaneMode = usePhoneSettingsStore(
    (state) => state.toggleAirplaneMode,
  );

  const wifiEnabled = usePhoneSettingsStore((state) => state.wifiEnabled);

  const toggleWifi = usePhoneSettingsStore((state) => state.toggleWifi);

  const cellularEnabled = usePhoneSettingsStore(
    (state) => state.cellularEnabled,
  );

  const toggleCellular = usePhoneSettingsStore((state) => state.toggleCellular);

  /* Battery */

  const batteryLevel = useBatteryStore((state) => state.level);
  const chargerPhase = useBatteryStore((state) => state.chargerPhase);
  const toggleCharger = useBatteryStore((state) => state.toggleCharger);

  /* Music */

  const currentSong = useMusicStore((state) => state.currentSong);

  const isPlaying = useMusicStore((state) => state.isPlaying);
  const isMusicLoading = useMusicStore((state) => state.isLoading);
  const musicError = useMusicStore((state) => state.audioError);
  const canSkipMusic = useMusicStore((state) => state.queue.length > 1);

  /* Screenshot */

  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  const [screenshotStatus, setScreenshotStatus] = useState("");

  /* Navigation */

  const close = useCallback(() => {
    toggleControlCenter();
  }, [toggleControlCenter]);

  const swipeHandlers = useSwipeable({
    onSwipedUp: close,
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
  });

  const openApp = (
    screen: "settings" | "clock" | "calculator" | "music-player",
  ) => {
    toggleControlCenter();
    setCurrentScreen(screen);
  };

  const launchAppSwitcher = () => {
    toggleControlCenter();
    setShowAppSwitcher(true);
  };

  const saveScreenshot = async () => {
    const phoneElement = document.querySelector<HTMLElement>(
      '[data-phone-capture="true"]',
    );

    if (!phoneElement) {
      setScreenshotStatus("The phone image is not ready yet.");
      return;
    }

    setIsCapturingScreenshot(true);
    setScreenshotStatus("Creating screenshot…");

    try {
      const { gallerySaved } = await downloadPhoneScreenshot(
        phoneElement,
        currentScreen,
      );

      setScreenshotStatus(
        gallerySaved
          ? "Screenshot saved to Gallery."
          : "Screenshot downloaded, but Gallery could not save it.",
      );
    } catch {
      setScreenshotStatus("Could not capture the virtual phone. Try again.");
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  return (
    <div
      className={cn(
        `absolute inset-0 z-[999] overflow-hidden bg-[var(--phone-control-center-backdrop)] text-white backdrop-blur-sm transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none`,

        showControlCenter
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      )}
      aria-hidden={!showControlCenter}
      inert={!showControlCenter}
      {...swipeHandlers}
    >
      {/* ================================================================ */}
      {/*                    COMPLETE CENTERED COMPOSITION                 */}
      {/* ================================================================ */}

      <div
        className="mx-auto flex min-h-full flex-col pt-[calc(var(--phone-safe-area-top)+16px)] pb-[calc(var(--phone-safe-area-bottom)+16px)]"
        style={{
          width: CONTROL_WIDTH,
        }}
      >
        {/* ============================================================ */}
        {/*                            HEADER                            */}
        {/* ============================================================ */}

        <header className="grid h-[38px] grid-cols-[1fr_92px_1fr] items-start">
          <Button
            type="button"
            onClick={() => openApp("settings")}
            variant="ghost"
            size="icon"
            aria-label="Open Settings"
            className={cn(
              `col-start-1 size-[38px] justify-self-start rounded-full p-0 text-white hover:bg-white/[0.18] focus-visible:ring-white/70`,
              circularMaterialClass,
            )}
          >
            <LuPlus className="size-[18px]" />
          </Button>

          <Button
            type="button"
            onClick={() => {
              toggleControlCenter();

              setCurrentScreen("screen-shutdown");
            }}
            variant="ghost"
            size="icon"
            aria-label="Power off virtual phone"
            className={cn(
              `col-start-3 size-[38px] justify-self-end rounded-full p-0 text-white hover:bg-white/[0.18] focus-visible:ring-white/70`,
              circularMaterialClass,
            )}
          >
            <LuPower className="size-[18px]" />
          </Button>
        </header>

        {/* ============================================================ */}
        {/*                          STATUS BAR                          */}
        {/* ============================================================ */}

        <div className="mt-[12px] flex h-[18px] items-center justify-between px-[4px] text-white/[0.92]">
          <div className="flex items-center gap-[7px]">
            <div className="flex h-[15px] items-end gap-[2.5px]">
              {[5, 8, 11, 14].map((height) => (
                <span
                  key={height}
                  className={cn(
                    "w-[3px] rounded-full",

                    cellularEnabled && !airplaneMode
                      ? "bg-white"
                      : "bg-white/30",
                  )}
                  style={{
                    height,
                  }}
                />
              ))}
            </div>

            {wifiEnabled && !airplaneMode && <LuWifi className="size-[16px]" />}
          </div>

          <div className="flex items-center gap-[5px]">
            <span className="text-[12px] leading-none font-medium tabular-nums">
              {Math.round(batteryLevel)}%
            </span>

            <MdBattery3Bar className="size-[18px]" />
          </div>
        </div>

        {/* ============================================================ */}
        {/*                          TOP MODULES                         */}
        {/* ============================================================ */}

        <div className="mt-[15px] flex gap-[10px]">
          <ConnectivityModule
            airplaneMode={airplaneMode}
            wifiEnabled={wifiEnabled}
            chargerPhase={chargerPhase}
            cellularEnabled={cellularEnabled}
            toggleAirplaneMode={toggleAirplaneMode}
            toggleWifi={toggleWifi}
            toggleCharger={() => toggleCharger(Date.now())}
            toggleCellular={toggleCellular}
          />

          <MusicWidget
            currentSong={currentSong}
            isPlaying={isPlaying}
            isLoading={isMusicLoading}
            audioError={musicError}
            canSkip={canSkipMusic}
            onPlayPause={toggleMusic}
            onPrevious={() => skipMusic(-1)}
            onNext={() => skipMusic(1)}
          />
        </div>

        {/* ============================================================ */}
        {/*                         MIDDLE AREA                          */}
        {/* ============================================================ */}

        <div className="mt-[10px] grid grid-cols-[66.5px_66.5px_66.5px_66.5px] gap-[10px]">
          {/* Lock */}

          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label="Lock"
              onClick={() => {
                toggleControlCenter();

                setCurrentScreen("screen-lock");
              }}
              icon={<LuLockKeyhole className="size-[20px]" />}
            />
          </div>

          {/* Silent */}

          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label="Mute"
              active={silentMode}
              onClick={toggleSilentMode}
              icon={
                silentMode ? (
                  <LuBellOff className="size-[20px]" />
                ) : (
                  <LuBell className="size-[20px]" />
                )
              }
            />
          </div>

          {/* Brightness */}

          <div className="row-span-2 flex justify-center">
            <CustomSlider
              icon={LuSun}
              iconColor="var(--phone-control-center-sun)"
              label={`Brightness ${brightness} percent`}
              value={brightness}
              onChange={setBrightness}
            />
          </div>

          {/* Volume */}

          <div className="row-span-2 flex justify-center">
            <CustomSlider
              icon={LuBell}
              iconColor="var(--phone-control-center-volume)"
              label={`Volume ${volume} percent`}
              value={volume}
              onChange={(nextVolume) => {
                setVolume(nextVolume);
                setVolumeHudSource("control-center");
              }}
              onInteractionStart={() => setVolumeHudSource("control-center")}
              onInteractionEnd={() => setVolumeHudSource(null)}
            />
          </div>

          {/* Wide focus/silent pill */}

          <button
            type="button"
            onClick={toggleSilentMode}
            className={cn(
              `col-span-2 flex h-[48px] items-center gap-[8px] rounded-[24px] px-[13px] text-left text-white transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-[0.98]`,

              circularMaterialClass,
            )}
          >
            {silentMode ? (
              <LuBellOff className="size-[17px]" />
            ) : (
              <LuBell className="size-[17px]" />
            )}

            <span className="truncate text-[11px] font-medium">
              {silentMode ? "Silent" : "Sound"}
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/*                        BOTTOM ROW                            */}
        {/* ============================================================ */}

        <div className="mt-[10px] grid grid-cols-[66.5px_66.5px_66.5px_66.5px] gap-[10px]">
          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label="Clock"
              icon={<LuClock3 className="size-[20px]" />}
              onClick={() => openApp("clock")}
            />
          </div>

          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label="Calculator"
              icon={<LuCalculator className="size-[20px]" />}
              onClick={() => openApp("calculator")}
            />
          </div>

          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label={isCapturingScreenshot ? "Saving" : "Screenshot"}
              icon={<MdScreenshotMonitor className="size-[21px]" />}
              onClick={() => void saveScreenshot()}
              disabled={isCapturingScreenshot}
            />
          </div>

          <div className="flex h-[66.5px] items-center justify-center">
            <ControlButton
              label="Switcher"
              icon={<LuAppWindow className="size-[20px]" />}
              onClick={launchAppSwitcher}
            />
          </div>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {screenshotStatus}
        </span>
      </div>
    </div>
  );
};

export default ControlCenter;

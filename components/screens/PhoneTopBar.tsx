import { useEffect, useRef, useState } from "react";
import { BsLightningChargeFill } from "react-icons/bs";
import { LuBellOff, LuLockKeyhole, LuPlane, LuWifi } from "react-icons/lu";
import { useSwipeable } from "react-swipeable";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { useBatteryStore } from "@/stores/useBatteryStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import {
  getIPhoneDisplayMetrics,
  type IPhoneModel,
  type PreviewSize,
} from "@/lib/iphone-models";
import { getPhoneTopBarSafeInset } from "@/lib/phone-geometry";
import { getMiniApp, isMiniAppId } from "@/lib/app-registry";
import { cn } from "@/lib/utils";

type PhoneTopBarProps = {
  model: IPhoneModel;
  size: PreviewSize;
};

const PhoneTopBar = ({ model, size }: PhoneTopBarProps) => {
  const currentScreen = usePhoneStore((state) => state.currentScreen);
  const hasScrollingContent =
    isMiniAppId(currentScreen) &&
    getMiniApp(currentScreen).viewport === "scroll";
  const showControlCenter = usePhoneStore((state) => state.showControlCenter);
  const toggleControlCenter = usePhoneStore(
    (state) => state.toggleControlCenter,
  );
  const passcodeEntryOpen = usePhoneStore((state) => state.passcodeEntryOpen);
  const silentMode = usePhoneSettingsStore((state) => state.silentMode);
  const airplaneMode = usePhoneSettingsStore((state) => state.airplaneMode);
  const wifiEnabled = usePhoneSettingsStore((state) => state.wifiEnabled);
  const cellularEnabled = usePhoneSettingsStore(
    (state) => state.cellularEnabled,
  );
  const batteryLevel = useBatteryStore((state) => state.level);
  const chargerPhase = useBatteryStore((state) => state.chargerPhase);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isIslandPulsing, setIsIslandPulsing] = useState(false);
  const islandPulseTimeoutRef = useRef<number | null>(null);

  const metrics = getIPhoneDisplayMetrics(model, size);
  const islandWidth = model.front.dynamicIsland.widthRatio * size.width;
  const islandHeight = islandWidth / model.front.dynamicIsland.aspectRatio;
  const statusRowTop = Math.max(
    0,
    metrics.dynamicIslandTop + islandHeight / 2 - metrics.statusBarHeight / 2,
  );
  const safeInset = getPhoneTopBarSafeInset(
    model,
    size,
    statusRowTop,
    metrics.statusBarHeight,
    15 * metrics.uiScale,
    metrics.uiScale,
  );
  const topBarHeight = Math.max(
    statusRowTop + metrics.statusBarHeight,
    metrics.dynamicIslandTop + islandHeight,
  );
  const indicatorGap = 5 * metrics.uiScale;
  const smallIconSize = 14 * metrics.uiScale;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (islandPulseTimeoutRef.current !== null) {
        window.clearTimeout(islandPulseTimeoutRef.current);
      }
    },
    [],
  );

  const swipeHandlers = useSwipeable({
    onSwipedDown: () => {
      if (currentScreen !== "screen-lock") toggleControlCenter();
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
  });

  const pulseDynamicIsland = () => {
    if (islandPulseTimeoutRef.current !== null) {
      window.clearTimeout(islandPulseTimeoutRef.current);
    }
    setIsIslandPulsing(true);
    islandPulseTimeoutRef.current = window.setTimeout(() => {
      setIsIslandPulsing(false);
      islandPulseTimeoutRef.current = null;
    }, 250);
  };

  if (currentScreen === "screen-boot" || currentScreen === "screen-shutdown") {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-50 grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start bg-transparent text-[var(--phone-text)] backdrop-blur-[4px]",
        hasScrollingContent && "bg-[var(--phone-canvas)]/20",
        currentScreen === "guess" && "text-black",
        currentScreen === "weather" && "text-[var(--phone-on-accent)]",
        showControlCenter && "hidden",
      )}
      style={{
        height: topBarHeight,
        paddingInline: safeInset,
        columnGap: indicatorGap,
      }}
      {...swipeHandlers}
    >
      <div
        className={cn(
          "flex min-w-0 items-center justify-self-start whitespace-nowrap tabular-nums",
          currentScreen === "screen-lock" && "opacity-0",
        )}
        style={{
          height: metrics.statusBarHeight,
          marginTop: statusRowTop,
          fontSize: 15 * metrics.uiScale,
        }}
      >
        {currentTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        })}
      </div>

      <button
        type="button"
        aria-label="Dynamic Island"
        onClick={pulseDynamicIsland}
        className={cn(
          "relative justify-self-center rounded-full p-0 transition-[scale] duration-[250ms] ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none",
          isIslandPulsing ? "scale-[1.12]" : "scale-100",
          currentScreen === "screen-lock"
            ? "bg-black"
            : "border border-white/25 bg-[var(--phone-island-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
        )}
        style={{
          width: islandWidth,
          aspectRatio: model.front.dynamicIsland.aspectRatio,
          marginTop: metrics.dynamicIslandTop,
        }}
      >
        {passcodeEntryOpen && (
          <LuLockKeyhole
            aria-hidden="true"
            className="absolute top-1/2 left-[13%] h-[58%] w-auto -translate-y-1/2 text-white"
          />
        )}
      </button>

      <div
        className="flex min-w-0 items-center justify-self-end whitespace-nowrap"
        style={{
          height: metrics.statusBarHeight,
          marginTop: statusRowTop,
          gap: indicatorGap,
        }}
      >
        {airplaneMode ? (
          <LuPlane
            style={{ width: smallIconSize, height: smallIconSize }}
            role="img"
            aria-label="Virtual airplane mode on"
            title="Virtual airplane mode on"
          />
        ) : (
          silentMode && (
            <LuBellOff
              style={{ width: smallIconSize, height: smallIconSize }}
              role="img"
              aria-label="Simulated silent mode on"
              title="Simulated silent mode on"
            />
          )
        )}
        {cellularEnabled && !airplaneMode && (
          <div
            className="flex items-end"
            style={{ height: smallIconSize, gap: 2 * metrics.uiScale }}
            role="img"
            aria-label="Virtual cellular signal"
            title="Virtual cellular signal"
          >
            {[5, 8, 11, 14].map((height) => (
              <span
                key={height}
                className="w-[2.5px] rounded-[1px] bg-current"
                style={{
                  width: 2.5 * metrics.uiScale,
                  height: height * metrics.uiScale,
                }}
              />
            ))}
          </div>
        )}
        {wifiEnabled && !airplaneMode && (
          <LuWifi
            style={{
              width: 15 * metrics.uiScale,
              height: 15 * metrics.uiScale,
            }}
            role="img"
            aria-label="Virtual Wi-Fi status"
            title="Virtual Wi-Fi status"
          />
        )}
        <div
          className="flex shrink-0 items-center"
          style={{ gap: metrics.uiScale }}
          role="img"
          aria-label={`Virtual battery ${Math.round(batteryLevel)} percent${chargerPhase === "connected" ? ", charging" : ""}`}
          title={`Virtual battery ${Math.round(batteryLevel)}%${chargerPhase === "connected" ? " · charging" : ""}`}
        >
          <div
            className="relative rounded-[3px] border-[1.5px] border-current p-[1px]"
            style={{
              width: 22 * metrics.uiScale,
              height: 11 * metrics.uiScale,
            }}
          >
            <div
              className="h-full rounded-[1px] bg-current transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.max(8, Math.min(100, batteryLevel))}%` }}
            />
            {chargerPhase !== "disconnected" && (
              <BsLightningChargeFill
                className="absolute inset-0 m-auto text-[var(--phone-canvas)]"
                style={{
                  width: 7 * metrics.uiScale,
                  height: 7 * metrics.uiScale,
                }}
                aria-hidden="true"
              />
            )}
          </div>
          <span
            className="rounded-r-full bg-current opacity-70"
            style={{
              width: 2 * metrics.uiScale,
              height: 4 * metrics.uiScale,
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default PhoneTopBar;

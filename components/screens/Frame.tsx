"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePhoneStore } from "@/stores";
import { useClock } from "@/context/ClockContext";
import VirtualIPhone from "@/components/screens/VirtualIPhone";
import { usePhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import {
  getAvailableIPhoneModels,
  getModelPreviewSize,
  IPHONE_MODELS,
} from "@/lib/iphone-models";
import { useDeviceStore } from "@/stores/useDeviceStore";
import { useBatteryStore } from "@/stores/useBatteryStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";
import { PHONE_VOLUME_STEP, type HardwareButtonId } from "@/lib/phone-buttons";
import { downloadPhoneDisplayScreenshot } from "@/lib/phone-screenshot";
import {
  CHARGER_CONNECTION_DURATION_MS,
  LOW_BATTERY_THRESHOLD,
} from "@/lib/battery";

const Frame = ({ children }: { children: React.ReactNode }) => {
  const [hardwareStatus, setHardwareStatus] = useState("");
  const [isOn, setIsOn] = useState(true);
  const {
    currentScreen,
    showControlCenter,
    showAppSwitcher,
    setLastScreen,
    setCurrentScreen,
    toggleControlCenter,
  } = usePhoneStore();
  const brightness = usePhoneSettingsStore((state) => state.brightness);
  const { ringingAlarmId, silenceRingingAudio } = useClock();
  const appearance = usePhoneAppearanceStore((state) => state.appearance);
  const selectedModelId = useDeviceStore((state) => state.selectedModelId);
  const setSelectedModelId = useDeviceStore(
    (state) => state.setSelectedModelId,
  );
  const setAvailableModelIds = useDeviceStore(
    (state) => state.setAvailableModelIds,
  );
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const frameRef = useRef<HTMLDivElement>(null);
  const screenshotPending = useRef(false);
  const batteryLevel = useBatteryStore((state) => state.level);
  const chargerPhase = useBatteryStore((state) => state.chargerPhase);
  const lowBatteryDismissed = useBatteryStore(
    (state) => state.lowBatteryDismissed,
  );
  const lowBattery =
    batteryLevel <= LOW_BATTERY_THRESHOLD && !lowBatteryDismissed;

  const handleHardwareButton = useCallback(
    (button: HardwareButtonId) => {
      setHardwareStatus("");
      const phone = usePhoneStore.getState();
      switch (button) {
        case "volume-up":
          if (silenceRingingAudio()) break;
          usePhoneSettingsStore
            .getState()
            .setVolumeHudSource(
              isOn && phone.currentScreen !== "screen-lock" ? button : null,
            );
          usePhoneSettingsStore.getState().adjustVolume(PHONE_VOLUME_STEP);
          break;
        case "volume-down":
          if (silenceRingingAudio()) break;
          usePhoneSettingsStore
            .getState()
            .setVolumeHudSource(
              isOn && phone.currentScreen !== "screen-lock" ? button : null,
            );
          usePhoneSettingsStore.getState().adjustVolume(-PHONE_VOLUME_STEP);
          break;
        case "action":
          usePhoneSettingsStore.getState().toggleSilentMode();
          break;
        case "side":
          if (isOn) {
            if (phone.currentScreen !== "screen-lock") {
              setLastScreen(phone.currentScreen);
            }
            if (phone.showControlCenter) toggleControlCenter();
            setIsOn(false);
          } else {
            setIsOn(true);
            setCurrentScreen("screen-lock");
          }
          break;
        case "camera-control":
          if (!isOn || !frameRef.current || screenshotPending.current) break;
          screenshotPending.current = true;
          setHardwareStatus("Creating screenshot…");
          void downloadPhoneDisplayScreenshot(
            frameRef.current,
            phone.currentScreen,
          )
            .then(({ gallerySaved }) =>
              setHardwareStatus(
                gallerySaved
                  ? "Screenshot saved to Gallery."
                  : "Screenshot downloaded, but Gallery could not save it.",
              ),
            )
            .catch(() =>
              setHardwareStatus("Could not capture the screen. Try again."),
            )
            .finally(() => {
              screenshotPending.current = false;
            });
          break;
      }
    },
    [
      isOn,
      setCurrentScreen,
      setLastScreen,
      toggleControlCenter,
      silenceRingingAudio,
    ],
  );

  const handleHardwareButtonRelease = useCallback(
    (button: HardwareButtonId) => {
      if (button === "volume-up" || button === "volume-down") {
        usePhoneSettingsStore.getState().setVolumeHudSource(null);
      }
    },
    [],
  );

  useEffect(() => {
    const battery = useBatteryStore.getState();
    const resume = () => {
      if (document.visibilityState === "visible") {
        battery.startSimulation(Date.now());
      }
    };
    const pause = () => {
      if (document.visibilityState === "hidden") {
        battery.pauseSimulation(Date.now());
      }
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        useBatteryStore.getState().advanceTo(Date.now());
      }
    }, 15_000);

    resume();
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("visibilitychange", pause);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("visibilitychange", pause);
      useBatteryStore.getState().pauseSimulation(Date.now());
    };
  }, []);

  useEffect(() => {
    if (
      chargerPhase !== "connecting" ||
      document.visibilityState !== "visible"
    ) {
      return;
    }
    const startedAt =
      useBatteryStore.getState().connectionStartedAt ?? Date.now();
    const skipAnimation = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const animationDuration = skipAnimation
      ? 0
      : CHARGER_CONNECTION_DURATION_MS;
    const remaining = Math.max(0, animationDuration - (Date.now() - startedAt));
    const timer = window.setTimeout(() => {
      useBatteryStore
        .getState()
        .completeChargerConnection(Date.now(), skipAnimation);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [chargerPhase]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateViewport = () => {
      const { width, height } = frame.getBoundingClientRect();
      setViewport((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    const observer = new ResizeObserver(updateViewport);
    observer.observe(frame);
    updateViewport();
    return () => observer.disconnect();
  }, []);

  const availableModels = useMemo(
    () => getAvailableIPhoneModels(viewport),
    [viewport],
  );
  const currentModel =
    IPHONE_MODELS.find((model) => model.id === selectedModelId) ??
    IPHONE_MODELS[0];
  const displayedModel = availableModels.some(
    (model) => model.id === currentModel.id,
  )
    ? currentModel
    : (availableModels[0] ?? currentModel);
  const deviceSize = getModelPreviewSize(displayedModel, viewport);

  useEffect(() => {
    setAvailableModelIds(availableModels.map((model) => model.id));
    if (
      availableModels.length > 0 &&
      !availableModels.some((model) => model.id === selectedModelId)
    ) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [
    availableModels,
    selectedModelId,
    setAvailableModelIds,
    setSelectedModelId,
  ]);

  const brightnessValue = 0.3 + (brightness / 100) * 0.9;

  return (
    <div
      ref={frameRef}
      className="phone-theme relative flex h-full min-h-0 w-full items-center justify-center p-2"
      data-phone-theme={appearance}
    >
      <VirtualIPhone
        model={displayedModel}
        size={deviceSize}
        brightness={brightnessValue}
        isOn={isOn}
        chargerPhase={chargerPhase}
        currentScreen={currentScreen}
        showControlCenter={showControlCenter}
        showAppSwitcher={showAppSwitcher}
        ringingAlarmId={ringingAlarmId}
        onHardwareButton={handleHardwareButton}
        onHardwareButtonRelease={handleHardwareButtonRelease}
      >
        {children}
      </VirtualIPhone>

      <p className="sr-only" role="status" aria-live="polite">
        {hardwareStatus}
        {hardwareStatus && lowBattery ? " " : ""}
        {lowBattery
          ? `Virtual phone battery low: ${Math.round(batteryLevel)} percent remaining.`
          : ""}
      </p>
    </div>
  );
};
export default Frame;

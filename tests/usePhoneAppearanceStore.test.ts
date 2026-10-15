import { beforeEach, describe, expect, it } from "vitest";
import { usePhoneStore } from "@/stores/usePhoneStore";
import { createPhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import { createDeviceStore } from "@/stores/useDeviceStore";
import {
  createPhoneSettingsStore,
  usePhoneSettingsStore,
} from "@/stores/usePhoneSettingsStore";
import type { StateStorage } from "zustand/middleware";

describe("phone appearance", () => {
  let values: Map<string, string>;
  let storage: StateStorage;

  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: (name) => values.get(name) ?? null,
      setItem: (name, value) => void values.set(name, value),
      removeItem: (name) => void values.delete(name),
    };
    usePhoneStore.setState({
      currentScreen: "notes",
      lastScreen: "home",
      phonePage: 2,
      history: ["notes"],
      showControlCenter: true,
      showAppSwitcher: false,
    });
    usePhoneSettingsStore.setState({
      brightness: 54,
      volume: 62,
      silentMode: false,
      pinLockEnabled: false,
      pinCode: null,
    });
  });

  it("persists the explicit phone theme independently of the website theme", () => {
    const appearanceStore = createPhoneAppearanceStore(storage);
    appearanceStore.getState().setAppearance("light");

    const restoredStore = createPhoneAppearanceStore(storage);

    expect(restoredStore.getState().appearance).toBe("light");
    expect(values.has("moobi-phone-appearance")).toBe(true);
  });

  it("switches appearance without resetting the active app or system state", () => {
    const appearanceStore = createPhoneAppearanceStore(storage);
    appearanceStore.getState().toggleAppearance();

    expect(appearanceStore.getState().appearance).toBe("light");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "notes",
      phonePage: 2,
      history: ["notes"],
      showControlCenter: true,
    });
    expect(usePhoneSettingsStore.getState().brightness).toBe(54);
  });

  it("persists the virtual model without resetting the active app or system state", () => {
    const deviceStore = createDeviceStore(storage);
    deviceStore.getState().setSelectedModelId("iphone-16-pro");

    const restoredStore = createDeviceStore(storage);

    expect(restoredStore.getState().selectedModelId).toBe("iphone-16-pro");
    expect(usePhoneStore.getState()).toMatchObject({
      currentScreen: "notes",
      phonePage: 2,
      history: ["notes"],
      showControlCenter: true,
    });
  });

  it("persists phone display and sound settings", () => {
    const settingsStore = createPhoneSettingsStore(storage);
    settingsStore.getState().setBrightness(54);
    settingsStore.getState().setVolume(62);
    settingsStore.getState().toggleSilentMode();

    const restoredStore = createPhoneSettingsStore(storage);

    expect(restoredStore.getState()).toMatchObject({
      brightness: 54,
      volume: 62,
      silentMode: true,
    });
    expect(values.has("moobi-phone-settings")).toBe(true);
  });

  it("persists virtual connectivity toggles without changing browser connectivity", () => {
    const settingsStore = createPhoneSettingsStore(storage);
    settingsStore.getState().toggleAirplaneMode();
    settingsStore.getState().toggleWifi();
    settingsStore.getState().toggleBluetooth();

    const restoredStore = createPhoneSettingsStore(storage);

    expect(restoredStore.getState()).toMatchObject({
      airplaneMode: true,
      wifiEnabled: false,
      bluetoothEnabled: true,
      cellularEnabled: true,
    });
  });

  it("keeps PIN lock disabled by default and persists the chosen PIN", () => {
    const settingsStore = createPhoneSettingsStore(storage);
    expect(settingsStore.getState()).toMatchObject({
      pinLockEnabled: false,
      pinCode: null,
    });

    settingsStore.getState().setPinLock("0427");
    const restoredStore = createPhoneSettingsStore(storage);

    expect(restoredStore.getState()).toMatchObject({
      pinLockEnabled: true,
      pinCode: "0427",
    });
    restoredStore.getState().disablePinLock();
    expect(restoredStore.getState()).toMatchObject({
      pinLockEnabled: false,
      pinCode: "0427",
    });
  });
});

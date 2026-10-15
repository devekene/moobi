import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
export type PhoneSettingsState = {
  brightness: number;
  volume: number;
  volumeHudSource: "volume-up" | "volume-down" | "control-center" | null;
  silentMode: boolean;
  airplaneMode: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  cellularEnabled: boolean;
  pinLockEnabled: boolean;
  pinCode: string | null;
  setBrightness: (value: number) => void;
  setVolume: (value: number) => void;
  adjustVolume: (delta: number) => void;
  setVolumeHudSource: (
    source: "volume-up" | "volume-down" | "control-center" | null,
  ) => void;
  toggleSilentMode: () => void;
  toggleAirplaneMode: () => void;
  toggleWifi: () => void;
  toggleBluetooth: () => void;
  toggleCellular: () => void;
  setPinLock: (pinCode: string | null) => void;
  disablePinLock: () => void;
};

export const createPhoneSettingsStore = (storage: StateStorage) =>
  create<PhoneSettingsState>()(
    persist(
      (set) => ({
        brightness: 75,
        volume: 62,
        volumeHudSource: null,
        silentMode: false,
        airplaneMode: false,
        wifiEnabled: true,
        bluetoothEnabled: false,
        cellularEnabled: true,
        pinLockEnabled: false,
        pinCode: null,
        setBrightness: (value) =>
          set({ brightness: Math.min(100, Math.max(0, value)) }),
        setVolume: (value) =>
          set({ volume: Math.min(100, Math.max(0, value)) }),
        adjustVolume: (delta) =>
          set((state) => ({
            volume: Math.min(100, Math.max(0, state.volume + delta)),
          })),
        setVolumeHudSource: (volumeHudSource) => set({ volumeHudSource }),
        toggleSilentMode: () =>
          set((state) => ({ silentMode: !state.silentMode })),
        toggleAirplaneMode: () =>
          set((state) => ({ airplaneMode: !state.airplaneMode })),
        toggleWifi: () => set((state) => ({ wifiEnabled: !state.wifiEnabled })),
        toggleBluetooth: () =>
          set((state) => ({ bluetoothEnabled: !state.bluetoothEnabled })),
        toggleCellular: () =>
          set((state) => ({ cellularEnabled: !state.cellularEnabled })),
        setPinLock: (pinCode) =>
          set({ pinCode, pinLockEnabled: pinCode !== null }),
        disablePinLock: () => set({ pinLockEnabled: false }),
      }),
      {
        name: "moobi-phone-settings",
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          brightness: state.brightness,
          volume: state.volume,
          silentMode: state.silentMode,
          airplaneMode: state.airplaneMode,
          wifiEnabled: state.wifiEnabled,
          bluetoothEnabled: state.bluetoothEnabled,
          cellularEnabled: state.cellularEnabled,
          pinLockEnabled: state.pinLockEnabled,
          pinCode: state.pinCode,
        }),
      },
    ),
  );

const browserStorage: StateStorage = {
  getItem: (name) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

export const usePhoneSettingsStore = createPhoneSettingsStore(browserStorage);

"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { encryptedStorage, storageStatus } from "@/lib/encrypted-storage";
import { useWeatherLocationsStore } from "@/stores/useWeatherLocationsStore";
import { useBatteryStore } from "@/stores/useBatteryStore";
import { useDeviceStore } from "@/stores/useDeviceStore";
import { useHomeScreenStore } from "@/stores/useHomeScreenStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { usePhoneAppearanceStore } from "@/stores/usePhoneAppearanceStore";
import { usePhoneSettingsStore } from "@/stores/usePhoneSettingsStore";

import { useCalculatorStore } from "@/stores/useCalculatorStore";

const stores = [
  useCalendarStore,
  useCalculatorStore,
  useWeatherLocationsStore,
  useBatteryStore,
  useDeviceStore,
  useHomeScreenStore,
  useMusicStore,
  useNotesStore,
  usePhoneAppearanceStore,
  usePhoneSettingsStore,
];

// Mount consumers only after async hydration so defaults cannot overwrite saved data.
export function StorageBoundary({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const error = useSyncExternalStore(
    storageStatus.subscribe,
    storageStatus.getSnapshot,
    storageStatus.getServerSnapshot,
  );
  useEffect(() => {
    let active = true;
    void Promise.all([
      ...stores.map((store) => store.persist.rehydrate()),
      encryptedStorage.getItem("theme"),
    ])
      .then(() => {
        if (active && !storageStatus.getSnapshot()) setReady(true);
      })
      .catch(() => {
        /* The shared status exposes read failures and retry. */
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (!ready)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black p-6 text-white">
        <div role="status" className="max-w-sm text-center">
          <p>{error || "Opening saved data securely…"}</p>
          {error && (
            <button
              className="mt-4 rounded-lg border px-4 py-2 focus-visible:outline-2"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  return (
    <>
      {children}
      {error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[9999] rounded-xl bg-black p-4 text-center text-sm text-white ring-1 ring-white/30"
        >
          {error}
          <button
            className="ml-3 underline focus-visible:outline-2"
            onClick={() => {
              void encryptedStorage.retryWrites();
            }}
          >
            Retry saving
          </button>
        </div>
      )}
    </>
  );
}

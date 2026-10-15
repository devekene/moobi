import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  advanceBatteryLevel,
  BATTERY_CAPACITY,
  CHARGER_CONNECTION_DURATION_MS,
  DEFAULT_BATTERY_RATES,
  type BatteryRates,
  type ChargerPhase,
} from "@/lib/battery";

type BatteryState = {
  level: number;
  chargerPhase: ChargerPhase;
  lowBatteryDismissed: boolean;
  lastUpdatedAt: number | null;
  connectionStartedAt: number | null;
  startSimulation: (now: number) => void;
  pauseSimulation: (now: number) => void;
  advanceTo: (now: number) => void;
  beginChargerConnection: (now: number) => void;
  completeChargerConnection: (now: number, skipAnimation?: boolean) => void;
  disconnectCharger: (now: number) => void;
  toggleCharger: (now: number) => void;
  dismissLowBattery: () => void;
  recharge: (now?: number) => void;
};

type PersistedBatteryState = Pick<
  BatteryState,
  "level" | "chargerPhase" | "lowBatteryDismissed"
>;

export const createBatteryStore = (
  storage: StateStorage,
  rates: BatteryRates = DEFAULT_BATTERY_RATES,
) =>
  create<BatteryState>()(
    persist(
      (set, get) => ({
        level: 85,
        chargerPhase: "disconnected",
        lowBatteryDismissed: false,
        lastUpdatedAt: null,
        connectionStartedAt: null,
        startSimulation: (now) => set({ lastUpdatedAt: now }),
        pauseSimulation: (now) => {
          get().advanceTo(now);
          set((state) => ({
            lastUpdatedAt: null,
            chargerPhase:
              state.chargerPhase === "connecting"
                ? "disconnected"
                : state.chargerPhase,
            connectionStartedAt: null,
          }));
        },
        advanceTo: (now) => {
          const state = get();
          if (state.lastUpdatedAt === null) {
            set({ lastUpdatedAt: now });
            return;
          }

          const lastUpdatedAt = Math.min(now, state.lastUpdatedAt);
          const elapsed = Math.max(0, now - lastUpdatedAt);
          let level = state.level;
          let chargerPhase = state.chargerPhase;
          let connectionStartedAt = state.connectionStartedAt;

          if (
            chargerPhase === "connecting" &&
            connectionStartedAt !== null &&
            now - connectionStartedAt >= CHARGER_CONNECTION_DURATION_MS
          ) {
            const connectedAt =
              connectionStartedAt + CHARGER_CONNECTION_DURATION_MS;
            const drainDuration = Math.max(0, connectedAt - lastUpdatedAt);
            level = advanceBatteryLevel(
              level,
              "connecting",
              drainDuration,
              rates,
            );
            level = advanceBatteryLevel(
              level,
              "connected",
              Math.max(0, now - connectedAt),
              rates,
            );
            chargerPhase = "connected";
            connectionStartedAt = null;
          } else {
            level = advanceBatteryLevel(level, chargerPhase, elapsed, rates);
          }

          set({ level, chargerPhase, connectionStartedAt, lastUpdatedAt: now });
        },
        beginChargerConnection: (now) => {
          get().advanceTo(now);
          if (get().chargerPhase !== "disconnected") return;
          set({
            chargerPhase: "connecting",
            connectionStartedAt: now,
            lastUpdatedAt: now,
            lowBatteryDismissed: false,
          });
        },
        completeChargerConnection: (now, skipAnimation = false) => {
          get().advanceTo(now);
          if (skipAnimation && get().chargerPhase === "connecting") {
            set({
              chargerPhase: "connected",
              connectionStartedAt: null,
              lastUpdatedAt: now,
            });
          }
        },
        disconnectCharger: (now) => {
          get().advanceTo(now);
          set({
            chargerPhase: "disconnected",
            connectionStartedAt: null,
          });
        },
        toggleCharger: (now) => {
          if (get().chargerPhase === "disconnected") {
            get().beginChargerConnection(now);
          } else {
            get().disconnectCharger(now);
          }
        },
        dismissLowBattery: () => set({ lowBatteryDismissed: true }),
        recharge: (now = Date.now()) =>
          set({
            level: BATTERY_CAPACITY,
            chargerPhase: "disconnected",
            connectionStartedAt: null,
            lowBatteryDismissed: false,
            lastUpdatedAt: now,
          }),
      }),
      {
        name: "moobi-virtual-battery",
        storage: createJSONStorage(() => storage),
        partialize: (state): PersistedBatteryState => ({
          level: state.level,
          chargerPhase:
            state.chargerPhase === "connected" ? "connected" : "disconnected",
          lowBatteryDismissed: state.lowBatteryDismissed,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as PersistedBatteryState),
          lastUpdatedAt: null,
          connectionStartedAt: null,
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

export const useBatteryStore = createBatteryStore(browserStorage);

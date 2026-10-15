import { beforeEach, describe, expect, it } from "vitest";
import { CHARGER_CONNECTION_DURATION_MS } from "@/lib/battery";
import { createBatteryStore } from "@/stores/useBatteryStore";
import type { StateStorage } from "zustand/middleware";

describe("virtual battery state", () => {
  let values: Map<string, string>;
  let storage: StateStorage;

  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: (name) => values.get(name) ?? null,
      setItem: (name, value) => void values.set(name, value),
      removeItem: (name) => void values.delete(name),
    };
  });

  it("drains only across active timestamps and pauses across hidden time", () => {
    const store = createBatteryStore(storage);
    const initialLevel = store.getState().level;
    store.getState().startSimulation(1_000);
    store.getState().advanceTo(61_000);
    const afterMinute = store.getState().level;
    store.getState().pauseSimulation(121_000);
    store.getState().startSimulation(3_600_000);
    store.getState().advanceTo(3_660_000);

    expect(afterMinute).toBeLessThan(initialLevel);
    expect(store.getState().level).toBeCloseTo(initialLevel - 0.12, 6);
  });

  it("does not mark the device as charging until the connector animation completes", () => {
    const store = createBatteryStore(storage);
    store.getState().startSimulation(0);
    store.getState().beginChargerConnection(0);
    store
      .getState()
      .completeChargerConnection(CHARGER_CONNECTION_DURATION_MS - 1);

    expect(store.getState().chargerPhase).toBe("connecting");

    store.getState().completeChargerConnection(CHARGER_CONNECTION_DURATION_MS);
    expect(store.getState().chargerPhase).toBe("connected");
  });

  it("cancels an unfinished plug-in when the tab becomes hidden", () => {
    const store = createBatteryStore(storage);
    store.getState().startSimulation(0);
    store.getState().beginChargerConnection(0);
    store.getState().pauseSimulation(200);

    expect(store.getState().chargerPhase).toBe("disconnected");
    expect(store.getState().lastUpdatedAt).toBeNull();
  });

  it("persists battery level and dismissed low battery state, and supports recharge", () => {
    const store = createBatteryStore(storage);
    store.setState({ level: 12 });
    store.getState().dismissLowBattery();

    const restored = createBatteryStore(storage);
    expect(restored.getState()).toMatchObject({
      level: 12,
      chargerPhase: "disconnected",
      lowBatteryDismissed: true,
    });

    restored.getState().recharge(10_000);
    expect(restored.getState()).toMatchObject({
      level: 100,
      chargerPhase: "disconnected",
      lowBatteryDismissed: false,
      lastUpdatedAt: 10_000,
    });
  });

  it("keeps a successfully connected charger across refresh and allows unplugging", () => {
    const store = createBatteryStore(storage);
    store.getState().startSimulation(0);
    store.getState().beginChargerConnection(0);
    store.getState().completeChargerConnection(CHARGER_CONNECTION_DURATION_MS);

    const restored = createBatteryStore(storage);
    expect(restored.getState().chargerPhase).toBe("connected");

    restored.getState().disconnectCharger(0);
    expect(restored.getState().chargerPhase).toBe("disconnected");
  });

  it("toggles the charger on, then off after connection completes", () => {
    const store = createBatteryStore(storage);
    store.getState().startSimulation(0);
    store.getState().toggleCharger(0);
    expect(store.getState().chargerPhase).toBe("connecting");

    store.getState().completeChargerConnection(CHARGER_CONNECTION_DURATION_MS);
    expect(store.getState().chargerPhase).toBe("connected");
    store.getState().toggleCharger(CHARGER_CONNECTION_DURATION_MS + 100);
    expect(store.getState().chargerPhase).toBe("disconnected");
    expect(store.getState().connectionStartedAt).toBeNull();
  });

  it("cancels a pending connection on a second click and allows a fresh connection", () => {
    const store = createBatteryStore(storage);
    store.getState().startSimulation(0);
    store.getState().toggleCharger(0);
    store.getState().toggleCharger(100);
    store.getState().completeChargerConnection(CHARGER_CONNECTION_DURATION_MS);
    expect(store.getState().chargerPhase).toBe("disconnected");
    expect(store.getState().connectionStartedAt).toBeNull();

    store.getState().toggleCharger(CHARGER_CONNECTION_DURATION_MS + 100);
    expect(store.getState().chargerPhase).toBe("connecting");
    expect(store.getState().connectionStartedAt).toBe(
      CHARGER_CONNECTION_DURATION_MS + 100,
    );
  });
});

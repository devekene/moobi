import { beforeEach, describe, expect, it } from "vitest";
import { MINI_APPS } from "@/lib/app-registry";
import { getPhoneScreenshotFilename } from "@/lib/phone-screenshot";
import {
  DOCK_APP_IDS,
  moveHomeApp,
  reconcileHomeAppOrder,
} from "@/lib/home-screen";
import {
  createHomeScreenStore,
  useHomeScreenStore,
} from "@/stores/useHomeScreenStore";
import type { StateStorage } from "zustand/middleware";

describe("home screen app arrangement", () => {
  let values: Map<string, string>;
  let storage: StateStorage;

  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: (name) => values.get(name) ?? null,
      setItem: (name, value) => void values.set(name, value),
      removeItem: (name) => void values.delete(name),
    };
    useHomeScreenStore.setState({
      appOrders: {},
      dockOrder: [
        "phone-dialer",
        "chrome-browser",
        "mail-composer",
        "music-player",
      ],
    });
  });

  it("reorders an app into the dragged-to position", () => {
    expect(
      moveHomeApp(
        ["settings", "snake", "calculator"],
        "settings",
        "calculator",
      ),
    ).toEqual(["snake", "calculator", "settings"]);
  });

  it("removes stale and duplicate saved app ids while retaining new apps", () => {
    expect(
      reconcileHomeAppOrder(
        ["settings", "snake", "calculator"],
        ["snake", "info", "stale", "snake"],
      ),
    ).toEqual(["snake", "settings", "calculator"]);
  });

  it("persists grid and dock order", () => {
    const homeStore = createHomeScreenStore(storage);
    homeStore.getState().setAppOrder(0, ["snake", "settings"]);
    homeStore
      .getState()
      .setDockOrder([
        "music-player",
        "phone-dialer",
        "chrome-browser",
        "mail-composer",
      ]);

    const restoredStore = createHomeScreenStore(storage);
    expect(restoredStore.getState()).toMatchObject({
      appOrders: { 0: ["snake", "settings"] },
      dockOrder: [
        "music-player",
        "phone-dialer",
        "chrome-browser",
        "mail-composer",
      ],
    });
  });

  it("balances non-dock mini apps across the two home pages", () => {
    const pageSizes = [0, 1].map(
      (page) =>
        MINI_APPS.filter(
          (app) => app.homePage === page && !DOCK_APP_IDS.includes(app.id),
        ).length,
    );
    expect(Math.abs(pageSizes[0] - pageSizes[1])).toBeLessThanOrEqual(1);
  });
});

describe("phone screenshot filenames", () => {
  it("creates a safe, timestamped PNG filename for the active screen", () => {
    expect(
      getPhoneScreenshotFilename(
        "music-player/nowPlaying",
        new Date("2026-10-14T12:34:56.789Z"),
      ),
    ).toBe("moobi-music-player-nowplaying-2026-10-14T12-34-56-789Z.png");
  });
});

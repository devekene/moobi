import { describe, expect, it } from "vitest";
import {
  getAppMetadata,
  getMiniApp,
  isMiniAppId,
  MINI_APPS,
  MINI_APP_CONTRACT,
  mobileApps,
  searchMiniApps,
} from "@/lib/app-registry";

describe("mini-app registry", () => {
  it("uses full-display scrolling for flowing screens and keeps fixed layouts contained", () => {
    for (const id of ["settings", "calendar", "app-store", "guess"] as const) {
      expect(getMiniApp(id).viewport).toBe("scroll");
    }
    for (const id of ["snake", "chrome-browser", "notes"] as const) {
      expect(getMiniApp(id).viewport ?? "contained").toBe("contained");
    }
  });

  it("lets Calculator extend its history sheet to the display edge", () => {
    expect(getMiniApp("calculator").viewport).toBe("full-bleed");
  });

  it("lets Weather draw beneath both system bars", () => {
    expect(getMiniApp("weather").viewport).toBe("full-bleed");
  });

  it("keeps About out of app discovery and standalone launch targets", () => {
    expect(isMiniAppId("info")).toBe(false);
    expect(searchMiniApps("info")).toEqual([]);
    expect(mobileApps.flat().some((app) => String(app.id) === "info")).toBe(
      false,
    );
    expect(getAppMetadata("info").id).toBe("home");
  });

  it("provides unique typed launch metadata and a screen loader for every bundled app", () => {
    const ids = MINI_APPS.map((app) => app.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const app of MINI_APPS) {
      expect(app.launchTarget).toEqual({
        kind: "phone-screen",
        screen: app.id,
      });
      expect(app.name.trim().length).toBeGreaterThan(0);
      expect(app.description.trim().length).toBeGreaterThan(0);
      expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(app.previewCapabilities).toMatchObject({
        bundled: true,
        executesUserCode: false,
      });
      expect(typeof app.loadScreen).toBe("function");
    }
  });

  it("places every discoverable app on a home page and marks unfinished routes as previews", () => {
    expect(
      mobileApps
        .flat()
        .map((app) => app.id)
        .sort(),
    ).toEqual(MINI_APPS.map((app) => app.id).sort());
    expect(
      MINI_APPS.filter((app) => app.availability === "preview").map(
        (app) => app.id,
      ),
    ).toEqual(["camera", "file-manager"]);
    expect(MINI_APP_CONTRACT).toMatchObject({
      lifecycle: "unmount-on-switch",
      navigation: "system-home-control",
      safeArea: "shared-safe-area-viewport",
      theme: "inherit-phone-tokens",
      loadingAndError: "platform-boundary-and-app-owned-async-states",
      extensionSecurity: "trusted-bundled-only",
    });
  });

  it("searches app name, category, and description and supports category filtering", () => {
    expect(searchMiniApps("snake").map((app) => app.id)).toContain("snake");
    expect(searchMiniApps("game", "games").map((app) => app.id)).toEqual([
      "snake",
      "guess",
      "chess",
    ]);
    expect(searchMiniApps("missing app")).toEqual([]);
  });

  it("returns recent-app metadata and a safe fallback for unknown screen names", () => {
    expect(getAppMetadata("camera")).toMatchObject({
      id: "camera",
      name: "Camera",
      availability: "preview",
    });
    expect(getAppMetadata("missing-app")).toMatchObject({
      name: "Home",
      color: "#007AFF",
    });
    expect(getAppMetadata("missing-app").icon).toBeDefined();
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChessMogulIcon from "@/components/icons/ChessMogulIcon";
import LudoRoyaleIcon from "@/components/icons/LudoRoyaleIcon";
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
    for (const id of ["settings", "app-store", "guess"] as const) {
      expect(getMiniApp(id).viewport).toBe("scroll");
    }
    expect(getMiniApp("snake").viewport).toBe("full-bleed");
    for (const id of ["notes"] as const) {
      expect(getMiniApp(id).viewport ?? "contained").toBe("contained");
    }
  });

  it("lets Calculator extend its history sheet to the display edge", () => {
    expect(getMiniApp("calculator").viewport).toBe("full-bleed");
  });

  it("lets Calendar keep its floating controls within the full display", () => {
    expect(getMiniApp("calendar").viewport).toBe("full-bleed");
  });

  it("lets Weather draw beneath both system bars", () => {
    expect(getMiniApp("weather").viewport).toBe("full-bleed");
  });

  it("lets Music fill the display without shell safe-area insets", () => {
    expect(getMiniApp("music-player").viewport).toBe("full-bleed");
  });

  it("lets Chess anchor game controls at the display bottom", () => {
    expect(getMiniApp("chess").viewport).toBe("full-bleed");
  });

  it("shares the Ludo Royale identity and full-display board contract", () => {
    const app = getMiniApp("ludo");
    expect(app.viewport).toBe("full-bleed");
    expect(app.icon).toBe(LudoRoyaleIcon);
    expect(renderToStaticMarkup(createElement(app.icon))).toContain(
      "/images/ludo-capture-icon.webp",
    );
    expect(app.previewCapabilities.screenshotUrls).toEqual([
      "/images/appstore/screenshots/ludo-setup.svg",
      "/images/appstore/screenshots/ludo-match.svg",
    ]);
    expect(app.store?.highlights).toHaveLength(3);
  });

  it("shares the Chess Mogul identity across launch and store metadata", () => {
    const app = getMiniApp("chess");
    expect(app.icon).toBe(ChessMogulIcon);
    expect(app.color).toContain("#193a2b");
    expect(app.previewCapabilities.screenshotUrls).toEqual([
      "/images/appstore/screenshots/chess-setup.webp",
      "/images/appstore/screenshots/chess-match.webp",
    ]);
    expect(app.store?.previewCaptions).toHaveLength(2);
  });

  it("keeps About out of app discovery and standalone launch targets", () => {
    expect(isMiniAppId("info")).toBe(false);
    expect(searchMiniApps("info")).toEqual([]);
    expect(mobileApps.flat().some((app) => String(app.id) === "info")).toBe(
      false,
    );
    expect(getAppMetadata("info").id).toBe("home");
  });

  it("excludes Camera and File Manager from discovery and launch metadata", () => {
    for (const id of ["camera", "file-manager"]) {
      expect(isMiniAppId(id)).toBe(false);
      expect(mobileApps.flat().some((app) => String(app.id) === id)).toBe(
        false,
      );
      expect(getAppMetadata(id).id).toBe("home");
    }
    expect(searchMiniApps("camera")).toEqual([]);
    expect(searchMiniApps("file manager")).toEqual([]);
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

  it("places every discoverable app on a home page", () => {
    expect(
      mobileApps
        .flat()
        .map((app) => app.id)
        .sort(),
    ).toEqual(MINI_APPS.map((app) => app.id).sort());
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
      "ludo",
    ]);
    expect(searchMiniApps("missing app")).toEqual([]);
  });

  it("returns recent-app metadata and a safe fallback for unknown screen names", () => {
    expect(getAppMetadata("calendar")).toMatchObject({
      id: "calendar",
      name: "Calendar",
      availability: "available",
    });
    expect(getAppMetadata("missing-app")).toMatchObject({
      name: "Home",
      color: "#007AFF",
    });
    expect(getAppMetadata("missing-app").icon).toBeDefined();
  });
});

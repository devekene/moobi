import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getMiniApp,
  MINI_APPS,
  STORE_APPS,
  searchMiniApps,
  searchStoreApps,
  recentStoreApps,
} from "@/lib/app-registry";
import AppDetails from "@/components/screens/app-store/AppDetails";
import AppSections from "@/components/screens/app-store/AppSections";

const noop = () => {};

describe("App Store catalog", () => {
  it("lists only explicitly curated apps while retaining every built-in app in general discovery", () => {
    expect(STORE_APPS.map((app) => app.id)).toEqual([
      "snake",
      "guess",
      "music-player",
      "chess",
    ]);
    for (const app of MINI_APPS.filter((entry) => entry.store === null)) {
      expect(searchStoreApps(app.name)).not.toContainEqual(app);
      expect(searchMiniApps(app.name)).toContainEqual(app);
      expect(getMiniApp(app.id).loadScreen).toBe(app.loadScreen);
    }
  });
  it("combines trimmed case-insensitive search with store-only category filtering", () => {
    expect(searchStoreApps("  FoRm ").map((app) => app.id)).toEqual([
      "music-player",
    ]);
    expect(searchStoreApps("", "games").map((app) => app.id)).toEqual([
      "snake",
      "guess",
      "chess",
    ]);
    expect(searchStoreApps("snake", "entertainment")).toEqual([]);
    expect(searchStoreApps("", "system")).toEqual([]);
    expect(searchStoreApps("settings")).toEqual([]);
  });
  it("omits built-in and unknown screens from recents and deduplicates by last use", () => {
    expect(
      recentStoreApps([
        "home",
        "snake",
        "settings",
        "guess",
        "snake",
        "missing",
        "app-store",
        "phone-dialer",
      ]).map((app) => app.id),
    ).toEqual(["snake", "guess"]);
    expect(recentStoreApps([])).toEqual([]);
  });
  it("provides complete editorial information and verifies every available screenshot asset", () => {
    for (const app of STORE_APPS) {
      expect(app.store?.story.length).toBeGreaterThan(80);
      expect(app.store?.highlights.length).toBeGreaterThanOrEqual(3);
      const urls = app.previewCapabilities.screenshotUrls ?? [];
      if (app.category === "games")
        expect(urls.length).toBeGreaterThanOrEqual(1);
      for (const url of urls)
        expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    }
  });
});

describe("App Store presentation", () => {
  it("provides distinct detail and launch controls for list rows", () => {
    const html = renderToStaticMarkup(
      createElement(AppSections, {
        title: "Games",
        apps: [getMiniApp("snake")],
        onSelect: noop,
        onOpen: noop,
      }),
    );
    expect(html).toContain('aria-label="About Snake"');
    expect(html).toContain('aria-label="Open Snake"');
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html).not.toContain("1.0.0");
  });
  it("offers an accessible back control, app facts, real screenshots, and an explicit launch", () => {
    const html = renderToStaticMarkup(
      createElement(AppDetails, {
        app: getMiniApp("snake"),
        onBack: noop,
        onOpen: noop,
      }),
    );
    expect(html).toContain('aria-label="Back to App Store"');
    expect(html).toContain('aria-label="App screenshots"');
    expect(html).toContain('aria-label="Enlarge Snake screenshot 1"');
    expect(html).toContain('aria-label="Close screenshot"');
    expect(html).toContain("Open app");
    expect(html).toContain("1.0.0");
    expect(html).toContain("Good to know");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain("rating");
    expect(html).toMatch(/aria-label="Previous screenshot" disabled=""/);
    expect(html).toContain('aria-label="Next screenshot"');
    expect(html).toContain('aria-label="Enlarge Snake screenshot 2"');
  });
});

it("offers bounded gallery navigation only when there are multiple screenshots", () => {
  const html = renderToStaticMarkup(
    createElement(AppDetails, {
      app: getMiniApp("chess"),
      onBack: noop,
      onOpen: noop,
    }),
  );
  expect(html).toMatch(/aria-label="Previous screenshot" disabled=""/);
  expect(html).toContain('aria-label="Next screenshot"');
  expect(html).toContain('aria-label="Enlarge Chess screenshot 2"');
});

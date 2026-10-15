import { describe, expect, it } from "vitest";
import { MINI_APPS } from "@/lib/app-registry";
import {
  APP_LIBRARY_CATEGORIES,
  getAlphabeticalAppGroups,
  getAppLibraryCategories,
  getAppLibraryCategoryApps,
  getAppLibraryCategoryPreview,
  HOME_SCREEN_PAGE_COUNT,
  PHONE_LAUNCHER_PAGE_COUNT,
} from "@/lib/app-library";

describe("home App Library", () => {
  it("adds the library after all registered home pages", () => {
    expect(HOME_SCREEN_PAGE_COUNT).toBe(
      Math.max(...MINI_APPS.map((app) => app.homePage)) + 1,
    );
    expect(PHONE_LAUNCHER_PAGE_COUNT).toBe(HOME_SCREEN_PAGE_COUNT + 1);
  });

  it("presents four App Library groups and includes registered apps", () => {
    expect(APP_LIBRARY_CATEGORIES).toHaveLength(4);
    const categorizedIds = new Set(
      APP_LIBRARY_CATEGORIES.flatMap(({ appIds }) => appIds),
    );
    for (const app of MINI_APPS) expect(categorizedIds.has(app.id)).toBe(true);
  });

  it("filters category previews and category contents by app search", () => {
    expect(
      getAppLibraryCategoryApps("productivity-finance", "notes").map(
        (app) => app.id,
      ),
    ).toContain("notes");
    expect(
      getAppLibraryCategoryApps("productivity-finance", "no match"),
    ).toEqual([]);
    const searchResults = getAppLibraryCategories("chess");
    expect(searchResults.map(({ title }) => title)).toEqual(["Recently Added"]);
    expect(searchResults[0]?.apps.map((app) => app.id)).toContain("chess");
  });

  it("previews three full-size apps and up to four more in the final mini-grid", () => {
    expect(getAppLibraryCategoryPreview("productivity-finance")).toHaveLength(
      7,
    );
    expect(
      getAppLibraryCategoryPreview("productivity-finance").slice(0, 3),
    ).toHaveLength(3);
    expect(
      getAppLibraryCategoryPreview("productivity-finance").slice(3, 7),
    ).toHaveLength(4);
    expect(
      getAppLibraryCategoryApps("productivity-finance").length,
    ).toBeGreaterThan(7);
  });

  it("keeps four-app categories as four full-size preview apps", () => {
    expect(getAppLibraryCategoryApps("social")).toHaveLength(4);
    expect(getAppLibraryCategoryPreview("social")).toHaveLength(4);
  });

  it("lists matching apps once in alphabetical letter groups", () => {
    const groups = getAlphabeticalAppGroups();
    const groupedApps = groups.flatMap(({ apps }) => apps);
    expect(groupedApps.map((app) => app.id).sort()).toEqual(
      MINI_APPS.map((app) => app.id).sort(),
    );
    expect(groups.map(({ letter }) => letter)).toEqual(
      [...groups.map(({ letter }) => letter)].sort(),
    );
    expect(
      getAlphabeticalAppGroups("ca").flatMap(({ apps }) =>
        apps.map((app) => app.name),
      ),
    ).toEqual(["Calculator", "Calendar", "Camera"]);
  });
});

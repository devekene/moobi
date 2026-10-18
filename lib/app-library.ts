import {
  MINI_APPS,
  type RegisteredMiniApp,
} from "@/lib/app-registry";

export const HOME_SCREEN_PAGE_COUNT = MINI_APPS.reduce(
  (count, app) => Math.max(count, app.homePage + 1),
  0,
);

export const APP_LIBRARY_PAGE_INDEX = HOME_SCREEN_PAGE_COUNT;
export const PHONE_LAUNCHER_PAGE_COUNT = HOME_SCREEN_PAGE_COUNT + 1;

export const APP_LIBRARY_CATEGORIES = [
  {
    id: "suggestions",
    title: "Suggestions",
    appIds: [
      "calendar",
      "weather",
      "calculator",
      "clock",
      "snake",
      "guess",
    ],
  },
  {
    id: "recently-added",
    title: "Recently Added",
    appIds: MINI_APPS.filter((app) => app.homePage > 0).map((app) => app.id),
  },
  {
    id: "productivity-finance",
    title: "Productivity & Finance",
    appIds: MINI_APPS.filter((app) =>
      ["productivity", "utilities", "system"].includes(app.category),
    ).map((app) => app.id),
  },
  {
    id: "social",
    title: "Social",
    appIds: MINI_APPS.filter((app) =>
      ["communication", "entertainment"].includes(app.category),
    ).map((app) => app.id),
  },
] as const;

export type AppLibraryCategoryId =
  (typeof APP_LIBRARY_CATEGORIES)[number]["id"];

const matchesQuery = (app: RegisteredMiniApp, query: string) =>
  `${app.name} ${app.description} ${app.category}`
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());

export const getAppLibraryCategoryApps = (
  categoryId: AppLibraryCategoryId,
  query = "",
): RegisteredMiniApp[] => {
  const category = APP_LIBRARY_CATEGORIES.find(({ id }) => id === categoryId);
  if (!category) return [];
  return category.appIds
    .map((id) => MINI_APPS.find((app) => app.id === id))
    .filter((app) => app !== undefined)
    .filter((app) => query.trim().length === 0 || matchesQuery(app, query));
};

export const getAppLibraryCategoryPreview = (
  categoryId: AppLibraryCategoryId,
  query = "",
): RegisteredMiniApp[] => getAppLibraryCategoryApps(categoryId, query).slice(0, 7);

export const getAlphabeticalAppGroups = (query = "") => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingApps = MINI_APPS.filter((app) =>
    app.name.toLocaleLowerCase().includes(normalizedQuery),
  ).sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
  );
  const groups: Array<{ letter: string; apps: RegisteredMiniApp[] }> = [];

  for (const app of matchingApps) {
    const letter = app.name.charAt(0).toLocaleUpperCase();
    const currentGroup = groups.at(-1);
    if (currentGroup?.letter === letter) {
      currentGroup.apps.push(app);
    } else {
      groups.push({ letter, apps: [app] });
    }
  }

  return groups;
};

export const getAppLibraryCategories = (query = "") =>
  APP_LIBRARY_CATEGORIES.map((category) => ({
    ...category,
    apps: getAppLibraryCategoryApps(category.id, query),
  })).filter(({ apps }) => apps.length > 0);

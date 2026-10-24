import type { ComponentType } from "react";
import type { IconType } from "react-icons";
import { BiCalculator, BiTerminal } from "react-icons/bi";
import { BsCalendar3, BsClockFill } from "react-icons/bs";
import { FaPhone } from "react-icons/fa6";
import { IoInformationCircle, IoLogoAppleAppstore } from "react-icons/io5";
import { LuDisc3, LuListTodo, LuSettings } from "react-icons/lu";
import { TiWeatherDownpour } from "react-icons/ti";
import { TfiEmail, TfiGallery } from "react-icons/tfi";
import MoBrowserIcon from "@/components/icons/MoBrowserIcon";
import ChessMogulIcon from "@/components/icons/ChessMogulIcon";
import GuessIcon from "@/components/icons/GuessIcon";
import SnakeIcon from "@/components/icons/SnakeIcon";

export type MiniAppCategory =
  | "games"
  | "productivity"
  | "utilities"
  | "entertainment"
  | "communication"
  | "system";

export type MiniAppAvailability = "available" | "preview";
type ScreenModule = { default: ComponentType };

export interface StoreListing {
  readonly tagline: string;
  readonly headline: string;
  readonly story: string;
  readonly highlights: readonly string[];
  readonly previewCaptions: readonly string[];
}

export interface MiniAppDefinition {
  /** Null for built-in phone apps; only explicit listings appear in the store. */
  readonly store: StoreListing | null;
  readonly id: string;
  readonly name: string;
  readonly icon: IconType;
  readonly color: string;
  readonly category: MiniAppCategory;
  readonly launchTarget: {
    readonly kind: "phone-screen";
    readonly screen: string;
  };
  readonly description: string;
  readonly version: string;
  readonly previewCapabilities: {
    readonly bundled: true;
    readonly executesUserCode: false;
    readonly screenshotUrls?: readonly string[];
  };
  readonly availability: MiniAppAvailability;
  readonly homePage: number;
  readonly viewport?: "contained" | "scroll" | "full-bleed";
  readonly loadScreen: () => Promise<ScreenModule>;
}

export const MINI_APPS = [
  {
    id: "settings",
    store: null,
    viewport: "scroll",
    name: "Settings",
    icon: LuSettings,
    color: "text-slate-500",
    category: "system",
    launchTarget: { kind: "phone-screen", screen: "settings" },
    description: "Personalize the virtual phone display, sound, and security.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/settings/SettingsScreen"),
  },
  {
    id: "snake",
    viewport: "full-bleed",
    store: {
      tagline: "A little nostalgia. A lot of one more go.",
      headline: "Small game.\nBig obsession.",
      story:
        "The classic you know, made for a quick break. Guide your snake, collect food, and keep your next move in mind. Every bite makes the board a little trickier.",
      highlights: [
        "Classic arcade play",
        "Simple directional controls",
        "Pause and pick up again",
      ],
      previewCaptions: ["Find your pace", "Chase your next bite"],
    },
    name: "Snake",
    icon: SnakeIcon,
    color: "bg-[#183d2b] text-[#8dcd70]",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "snake" },
    description: "A classic snake game.",
    version: "1.0.0",
    previewCapabilities: {
      bundled: true,
      executesUserCode: false,
      screenshotUrls: [
        "/images/appstore/screenshots/snake-welcome.webp",
        "/images/appstore/screenshots/snake-garden.webp",
      ],
    },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/snake/SnakeGame"),
  },
  {
    id: "calculator",
    store: null,
    name: "Calculator",
    icon: BiCalculator,
    color: "text-orange-500",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "calculator" },
    description: "A basic calculator for everyday arithmetic.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    viewport: "full-bleed",
    loadScreen: () => import("@/components/screens/calculator"),
  },
  {
    id: "clock",
    store: null,
    name: "Clock",
    icon: BsClockFill,
    color: "text-gray-400",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "clock" },
    description: "Alarms, world clocks, timers, and a stopwatch.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/clock/Clock"),
  },
  {
    id: "chrome-browser",
    store: null,
    name: "Mo Browser",
    icon: MoBrowserIcon,
    color:
      "bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-950 text-white",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "chrome-browser" },
    description: "Browse and search from the virtual phone.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    viewport: "full-bleed",
    loadScreen: () => import("@/components/screens/browser"),
  },
  {
    id: "live-dev",
    store: null,
    name: "Live Dev",
    icon: BiTerminal,
    color: "text-white",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "live-dev" },
    description: "Inspect the live development preview.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/live-dev/DevHome"),
  },
  {
    id: "calendar",
    store: null,
    viewport: "full-bleed",
    name: "Calendar",
    icon: BsCalendar3,
    color: "text-blue-500",
    category: "productivity",
    launchTarget: { kind: "phone-screen", screen: "calendar" },
    description: "View and manage calendar events.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/calendar"),
  },
  {
    id: "weather",
    store: null,
    viewport: "full-bleed",
    name: "Weather",
    icon: TiWeatherDownpour,
    color: "bg-blue-500",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "weather" },
    description: "Check the current weather and forecast.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/weather-app/Weather"),
  },
  {
    id: "guess",
    store: {
      tagline: "Small puzzles. Big aha.",
      headline: "Stay curious.\nTake a guess.",
      story:
        "Decode emoji combinations, uncover hidden words, or hunt a secret number. Explore five-round sessions with two difficulty levels, helpful hints, and personal records.",
      highlights: [
        "Three ways to play",
        "Five-round puzzle sessions",
        "Hints and personal records",
      ],
      previewCaptions: ["Find your next aha", "Decode a little mystery"],
    },
    viewport: "scroll",
    name: "Guess",
    icon: GuessIcon,
    color: "text-violet-600 bg-[#eee8fc]",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "guess" },
    description: "Decode emoji, solve word riddles, and hunt secret numbers.",
    version: "1.0.0",
    previewCapabilities: {
      bundled: true,
      executesUserCode: false,
      screenshotUrls: [
        "/images/appstore/screenshots/guess-discover.webp",
        "/images/appstore/screenshots/guess-decoder.webp",
      ],
    },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/guess/GuessGame"),
  },
  {
    id: "mail-composer",
    store: null,
    name: "Mail",
    icon: TfiEmail,
    color: "bg-blue-500",
    category: "communication",
    launchTarget: { kind: "phone-screen", screen: "mail-composer" },
    description:
      "Write emails, keep drafts, and browse your sent messages. Sending requires a configured mail service; history is saved in this browser.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/mail/MailCompose"),
  },
  {
    id: "music-player",
    store: {
      tagline: "A listening room for independent sound.",
      headline: "Find your\nnext feeling.",
      story:
        "Step into FORM, a quiet space for discovering independent music. Explore the catalog, start a listening session, and collect the tracks you want to come back to.",
      highlights: [
        "Discover independent music",
        "Build your own collection",
        "Keep the listening queue flowing",
      ],
      previewCaptions: ["A room for discovery", "Keep your favorites close"],
    },
    viewport: "full-bleed",
    name: "FORM",
    icon: LuDisc3,
    color: "bg-orange-200 text-stone-900",
    category: "entertainment",
    launchTarget: { kind: "phone-screen", screen: "music-player" },
    description:
      "A listening room for independent sound. Discover, play, and collect music.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/music-player/iTunes"),
  },
  {
    id: "notes",
    store: null,
    name: "Notes",
    icon: LuListTodo,
    color: "bg-yellow-300",
    category: "productivity",
    launchTarget: { kind: "phone-screen", screen: "notes" },
    description: "Write notes and keep track of to-dos.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/notes/NotesApp"),
  },
  {
    id: "app-store",
    store: null,
    viewport: "scroll",
    name: "Mi Store",
    icon: IoLogoAppleAppstore,
    color: "",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "app-store" },
    description: "Discover and preview the bundled mini apps.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/app-store/MiStore"),
  },
  {
    id: "phone-dialer",
    store: null,
    name: "Phone",
    icon: FaPhone,
    color: "bg-green-600",
    category: "communication",
    launchTarget: { kind: "phone-screen", screen: "phone-dialer" },
    description: "Use the simulated phone dialer.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/phone-dialer/PhoneDialer"),
  },
  {
    id: "chess",
    viewport: "full-bleed",
    store: {
      tagline: "Make a little room for your next move.",
      headline: "Your move.\nYour moment.",
      story:
        "Find your rhythm against the built-in opponent. Choose a quick timed match or settle into untimed play, with sculpted pieces, optional direction hints, and a quiet focus soundtrack.",
      highlights: [
        "Timed matches or untimed play",
        "Three levels of challenge",
        "Optional music and direction hints",
      ],
      previewCaptions: [
        "Your pace. Your challenge.",
        "Every second. Every move.",
      ],
    },
    name: "Chess",
    icon: ChessMogulIcon,
    color: "bg-[#193a2b] text-[#fff8e9]",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "chess" },
    description: "Play chess against the built-in opponent.",
    version: "1.0.0",
    previewCapabilities: {
      bundled: true,
      executesUserCode: false,
      screenshotUrls: [
        "/images/appstore/screenshots/chess-setup.webp",
        "/images/appstore/screenshots/chess-match.webp",
      ],
    },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/chess/Home"),
  },
  {
    id: "gallery",
    store: null,
    name: "Gallery",
    icon: TfiGallery,
    color: "bg-blue-300",
    category: "entertainment",
    launchTarget: { kind: "phone-screen", screen: "gallery" },
    description: "Browse the sample photos and videos.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/gallery/Gallery"),
  },
] as const satisfies readonly MiniAppDefinition[];

export type MiniAppId = (typeof MINI_APPS)[number]["id"];
// Consumers use the full app contract even when today's catalog contains only
// available apps; preview remains a supported availability for future entries.
export type RegisteredMiniApp = MiniAppDefinition & {
  readonly id: MiniAppId;
  readonly launchTarget: {
    readonly kind: "phone-screen";
    readonly screen: MiniAppId;
  };
};
export type PhoneScreen =
  | "screen-boot"
  | "screen-shutdown"
  | "screen-lock"
  | "home"
  | MiniAppId
  | import("@/lib/phone-apps").ExternalAppId;

const miniAppsById = new Map<MiniAppId, RegisteredMiniApp>(
  MINI_APPS.map((app) => [app.id, app]),
);

export function getMiniApp(id: MiniAppId): RegisteredMiniApp {
  const app = miniAppsById.get(id);
  if (!app) throw new Error(`Mini app registry is missing its ${id} entry.`);
  return app;
}

export const mobileApps: RegisteredMiniApp[][] = Array.from(
  { length: Math.max(...MINI_APPS.map((app) => app.homePage)) + 1 },
  (_, page) => MINI_APPS.filter((app) => app.homePage === page),
);

export function isMiniAppId(id: string): id is MiniAppId {
  return MINI_APPS.some((app) => app.id === id);
}

export function searchMiniApps(
  query: string,
  category?: MiniAppCategory | "all",
): RegisteredMiniApp[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return MINI_APPS.filter((app) => {
    const matchesCategory =
      category === undefined || category === "all" || app.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${app.name} ${app.description} ${app.category}`
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

export const STORE_APPS: readonly RegisteredMiniApp[] = MINI_APPS.filter(
  (app) => app.store !== null,
);

export function searchStoreApps(
  query: string,
  category?: MiniAppCategory | "all",
) {
  return searchMiniApps(query, category).filter((app) => app.store !== null);
}

export function recentStoreApps(
  history: readonly string[],
): RegisteredMiniApp[] {
  return [...new Set([...history].reverse())]
    .filter(isMiniAppId)
    .map(getMiniApp)
    .filter((app) => app.store !== null);
}

export interface MiniAppContract {
  readonly lifecycle: "unmount-on-switch";
  readonly navigation: "system-home-control";
  readonly safeArea: "shared-safe-area-viewport";
  readonly theme: "inherit-phone-tokens";
  readonly loadingAndError: "platform-boundary-and-app-owned-async-states";
  readonly extensionSecurity: "trusted-bundled-only";
}

export const MINI_APP_CONTRACT: MiniAppContract = {
  lifecycle: "unmount-on-switch",
  navigation: "system-home-control",
  safeArea: "shared-safe-area-viewport",
  theme: "inherit-phone-tokens",
  loadingAndError: "platform-boundary-and-app-owned-async-states",
  extensionSecurity: "trusted-bundled-only",
};

export interface AppMetadata {
  readonly id: MiniAppId | "home";
  readonly name: string;
  readonly icon: IconType;
  readonly color: string;
  readonly availability: MiniAppAvailability;
}

const fallbackMetadata: AppMetadata = {
  id: "home",
  name: "Home",
  icon: IoInformationCircle,
  color: "#007AFF",
  availability: "available",
};

export function getAppMetadata(id: string): AppMetadata {
  const app = isMiniAppId(id) ? getMiniApp(id) : undefined;
  return app
    ? {
        id: app.id,
        name: app.name,
        icon: app.icon,
        color: tailwindColorToHex(app.color),
        availability: app.availability,
      }
    : fallbackMetadata;
}

function tailwindColorToHex(color: string): string {
  if (color.includes("gray")) return "#8E8E93";
  if (color.includes("blue")) return "#007AFF";
  if (color.includes("green")) return "#34C759";
  if (color.includes("yellow")) return "#FFCC00";
  if (color.includes("orange")) return "#FF9500";
  if (color.includes("red")) return "#FF3B30";
  if (color.includes("white")) return "#FFFFFF";
  if (color.includes("black")) return "#000000";
  return "#8E8E93";
}

import type { ComponentType } from "react";
import type { IconType } from "react-icons";
import { BiCalculator, BiTerminal } from "react-icons/bi";
import {
  BsBrowserChrome,
  BsCalendar3,
  BsClockFill,
  BsFolder,
} from "react-icons/bs";
import { FaChessQueen, FaPhone } from "react-icons/fa6";
import { FcMusic } from "react-icons/fc";
import { GiSnake } from "react-icons/gi";
import { IoInformationCircle, IoLogoAppleAppstore } from "react-icons/io5";
import { LuBrain, LuCamera, LuListTodo, LuSettings } from "react-icons/lu";
import { TiWeatherDownpour } from "react-icons/ti";
import { TfiEmail, TfiGallery } from "react-icons/tfi";

export type MiniAppCategory =
  | "games"
  | "productivity"
  | "utilities"
  | "entertainment"
  | "communication"
  | "system";

export type MiniAppAvailability = "available" | "preview";
type ScreenModule = { default: ComponentType };

export interface MiniAppDefinition {
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
    name: "Snake",
    icon: GiSnake,
    color: "text-green-600",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "snake" },
    description: "A classic snake game.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/snake/SnakeGame"),
  },
  {
    id: "calculator",
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
    name: "Mo Browser",
    icon: BsBrowserChrome,
    color:
      "bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 text-white",
    category: "utilities",
    launchTarget: { kind: "phone-screen", screen: "chrome-browser" },
    description: "Browse and search from the virtual phone.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/browser"),
  },
  {
    id: "live-dev",
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
    viewport: "scroll",
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
    id: "camera",
    name: "Camera",
    icon: LuCamera,
    color: "bg-white text-black",
    category: "system",
    launchTarget: { kind: "phone-screen", screen: "camera" },
    description:
      "Camera is a preview placeholder; it does not access device hardware.",
    version: "0.1.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "preview",
    homePage: 1,
    loadScreen: () => import("@/components/screens/UnavailableMiniApp"),
  },
  {
    id: "weather",
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
    viewport: "scroll",
    name: "Guess",
    icon: LuBrain,
    color: "text-primary bg-white",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "guess" },
    description: "Play a short number guessing game.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/guess/GuessGame"),
  },
  {
    id: "mail-composer",
    name: "Mail",
    icon: TfiEmail,
    color: "bg-blue-500",
    category: "communication",
    launchTarget: { kind: "phone-screen", screen: "mail-composer" },
    description: "Compose an email in the virtual phone.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/mail/MailCompose"),
  },
  {
    id: "music-player",
    name: "iTunes",
    icon: FcMusic,
    color: "bg-red-200",
    category: "entertainment",
    launchTarget: { kind: "phone-screen", screen: "music-player" },
    description: "Browse and play music in the preview.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 0,
    loadScreen: () => import("@/components/screens/music-player/iTunes"),
  },
  {
    id: "notes",
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
    id: "file-manager",
    name: "File Manager",
    icon: BsFolder,
    color: "bg-yellow-300",
    category: "system",
    launchTarget: { kind: "phone-screen", screen: "file-manager" },
    description:
      "File Manager is a preview placeholder and does not browse device files.",
    version: "0.1.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "preview",
    homePage: 1,
    loadScreen: () => import("@/components/screens/UnavailableMiniApp"),
  },
  {
    id: "app-store",
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
    name: "Chess",
    icon: FaChessQueen,
    color: "bg-yellow-200",
    category: "games",
    launchTarget: { kind: "phone-screen", screen: "chess" },
    description: "Play chess against the built-in opponent.",
    version: "1.0.0",
    previewCapabilities: { bundled: true, executesUserCode: false },
    availability: "available",
    homePage: 1,
    loadScreen: () => import("@/components/screens/chess/Home"),
  },
  {
    id: "gallery",
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
export type RegisteredMiniApp = MiniAppDefinition & (typeof MINI_APPS)[number];
export type PhoneScreen =
  "screen-boot" | "screen-shutdown" | "screen-lock" | "home" | MiniAppId;

const miniAppsById = new Map<MiniAppId, RegisteredMiniApp>(
  MINI_APPS.map((app) => [app.id, app]),
);

export function getMiniApp(id: MiniAppId): RegisteredMiniApp {
  const app = miniAppsById.get(id);
  if (!app) throw new Error(`Mini app registry is missing its ${id} entry.`);
  return app;
}

export const mobileApps = Array.from(
  { length: Math.max(...MINI_APPS.map((app) => app.homePage)) + 1 },
  (_, page) => MINI_APPS.filter((app) => app.homePage === page),
);

export function isMiniAppId(id: string): id is MiniAppId {
  return MINI_APPS.some((app) => app.id === id);
}

export function searchMiniApps(
  query: string,
  category?: MiniAppCategory | "all",
) {
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

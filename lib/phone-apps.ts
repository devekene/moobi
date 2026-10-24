import type { IconType } from "react-icons";
import { LuPackage } from "react-icons/lu";
import {
  MINI_APPS,
  isMiniAppId,
  type MiniAppId,
  type MiniAppCategory,
  type MiniAppAvailability,
  type AppIconPresentation,
} from "@/lib/app-registry";
import type { InstalledApp } from "@/lib/mini-app-installations";
import { APP_ID } from "@/lib/private-store-contract";

export type ExternalAppId = `external:${string}`;
export type PhoneAppId = MiniAppId | ExternalAppId;
export interface PhoneApp {
  id: PhoneAppId;
  name: string;
  description: string;
  icon: IconType;
  iconPresentation?: AppIconPresentation;
  color: string;
  category: MiniAppCategory;
  availability: MiniAppAvailability;
  homePage: number;
  launchTarget: { kind: "phone-screen" | "installed-app"; screen: PhoneAppId };
}
export const externalAppId = (id: string): ExternalAppId => `external:${id}`;
export const isExternalAppId = (id: string): id is ExternalAppId =>
  id.startsWith("external:") && APP_ID.test(id.slice(9));
export const isPhoneAppId = (id: string): id is PhoneAppId =>
  isMiniAppId(id) || isExternalAppId(id);
export function getPhoneApps(installed: readonly InstalledApp[]): PhoneApp[] {
  return [
    ...MINI_APPS,
    ...installed.map(({ app }): PhoneApp => ({
      id: externalAppId(app.id),
      name: app.name,
      description: app.description,
      icon: LuPackage,
      iconPresentation: "contained",
      color: "text-[var(--phone-accent)]",
      category: "utilities",
      availability: "available",
      homePage: 1,
      launchTarget: { kind: "installed-app", screen: externalAppId(app.id) },
    })),
  ];
}
